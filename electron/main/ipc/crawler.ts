import { ipcMain, BrowserWindow } from "electron";
import { persist, queryAll, executeRun, runInTransaction } from "../db/index";
import {
  callChatCompletions,
  getActiveProvider,
  getVisionProvider,
} from "./ai";
import { settingsStore } from "./settings";
import { dedupeJobs, enrichJobWithQuality } from "../lib/jobQuality";

// 招聘网站域名白名单
const ALLOWED_DOMAINS = [
  "zhipin.com",
  "liepin.com",
  "51job.com",
  "lagou.com",
  "bosszhipin.com",
  "zhaopin.com",
  "shixiseng.com",
];

function isAllowedJobUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return ALLOWED_DOMAINS.some(
      (d) => u.hostname === d || u.hostname.endsWith("." + d),
    );
  } catch {
    return false;
  }
}

// 带超时的 fetch（15s）
async function fetchWithTimeout(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// 插入单条职位记录（在事务内调用）
function insertJobListing(
  record: Record<string, unknown>,
  fallbackSource: string,
): string {
  const id =
    (record.id as string) ||
    `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const title =
    (record.title as string) || (record.name as string) || "未命名职位";
  const company =
    (record.company as string) || (record.company_name as string) || "未知公司";
  const location =
    (record.location as string) || (record.location_city as string) || "";
  const salary = (record.salary as string) || "";
  const url =
    (record.url as string) ||
    (record.link as string) ||
    (record.source_url as string) ||
    "";
  const description =
    (record.description as string) || (record.snippet as string) || "";
  const requirements = (record.requirements as string) || "";
  const tags = Array.isArray(record.tags) ? record.tags : [];
  const source = (record.source as string) || fallbackSource;
  const existing = url
    ? queryAll("SELECT id FROM job_listings WHERE source_url = ? LIMIT 1", [
        url,
      ])[0]
    : queryAll(
        'SELECT id FROM job_listings WHERE title = ? AND company = ? AND COALESCE(location_city, "") = ? LIMIT 1',
        [title, company, location],
      )[0];
  if (existing?.id && existing.id !== id) return String(existing.id);
  executeRun(
    `INSERT OR REPLACE INTO job_listings (id, title, company, location_city, salary, tags, source, source_url, description, requirements, collected_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      title,
      company,
      location,
      salary,
      JSON.stringify(tags),
      source,
      url,
      description,
      requirements,
      new Date().toISOString(),
    ],
  );
  return id;
}

// 搜索结果类型定义
interface BingResult {
  name: string;
  url: string;
  snippet: string;
}
interface SerpApiResult {
  title: string;
  company_name: string;
  location: string;
  link: string;
  description: string;
}
interface CustomResult {
  title?: string;
  name?: string;
  url?: string;
  link?: string;
  snippet?: string;
  description?: string;
}

interface SearchSource {
  id: string;
  name: string;
  type: "bing" | "serpapi" | "custom";
  config: {
    apiKey?: string;
    endpoint?: string;
    params?: Record<string, string>;
  };
}

interface Settings {
  searchSources: SearchSource[];
}

const store = settingsStore as unknown as {
  store: Settings;
  set: (key: "searchSources", value: SearchSource[]) => void;
};

// 内嵌浏览器窗口引用（用户登录招聘网站 + 抓取页面文本用）
let browserWin: BrowserWindow | null = null;

function getEnabledSearchSource(): SearchSource | undefined {
  const sources = store.store.searchSources || [];
  return sources.find((s) => s.config?.apiKey);
}

export function registerCrawlerHandlers() {
  ipcMain.handle("crawler:getSources", async () => {
    return store.store.searchSources || [];
  });

  ipcMain.handle("crawler:saveSource", async (_event, source: SearchSource) => {
    const sources = store.store.searchSources || [];
    const idx = sources.findIndex((s) => s.id === source.id);
    if (idx >= 0) {
      sources[idx] = source;
    } else {
      sources.push(source);
    }
    store.set("searchSources", sources);
    return source;
  });

  ipcMain.handle("crawler:searchJobs", async (_event, query: string) => {
    const source = getEnabledSearchSource();

    // 没有配置搜索源时，用AI智能生成匹配岗位
    if (!source) {
      return aiSearchJobs(query);
    }

    if (source.type === "bing") {
      return searchBing(source, query);
    }
    if (source.type === "serpapi") {
      return searchSerpApi(source, query);
    }
    if (source.type === "custom") {
      return searchCustom(source, query);
    }

    throw new Error(`不支持的搜索源类型: ${source.type}`);
  });

  // 导入 JSON/CSV 职位数据
  ipcMain.handle(
    "crawler:import",
    async (_event, format: string, data: unknown) => {
      try {
        let records: Array<Record<string, unknown>> = [];

        if (format === "json") {
          // data 可能是 JSON 字符串或已解析的数组
          let parsed: unknown = data;
          if (typeof data === "string") {
            parsed = JSON.parse(data);
          }
          if (!Array.isArray(parsed)) {
            throw new Error("JSON 数据必须是数组");
          }
          records = parsed as Array<Record<string, unknown>>;
        } else if (format === "csv") {
          const text = typeof data === "string" ? data : String(data);
          records = parseCsv(text);
        } else {
          throw new Error(`不支持的导入格式: ${format}`);
        }

        const prepared = dedupeJobs(records);
        const count = runInTransaction(() => {
          let n = 0;
          for (const record of prepared.jobs) {
            insertJobListing(record, "import");
            n++;
          }
          return n;
        });
        persist();
        return {
          success: true,
          count,
          duplicateCount: prepared.duplicateCount,
        };
      } catch (error) {
        console.error("crawler:import error:", error);
        throw error;
      }
    },
  );

  // 批量保存搜索结果到 job_listings 表
  ipcMain.handle("crawler:saveJobs", async (_event, jobs: unknown[]) => {
    try {
      const list = Array.isArray(jobs) ? jobs : [];
      const prepared = dedupeJobs(list as Array<Record<string, unknown>>);

      const count = runInTransaction(() => {
        let n = 0;
        for (const job of prepared.jobs) {
          const record = (job || {}) as Record<string, unknown>;
          insertJobListing(record, "search");
          n++;
        }
        return n;
      });
      persist();
      return { success: true, count, duplicateCount: prepared.duplicateCount };
    } catch (error) {
      console.error("crawler:saveJobs error:", error);
      throw error;
    }
  });

  // 删除搜索源
  ipcMain.handle("crawler:deleteSource", async (_event, sourceId: string) => {
    try {
      const sources = store.store.searchSources || [];
      const filtered = sources.filter((s) => s.id !== sourceId);
      store.set("searchSources", filtered);
      return { success: true };
    } catch (error) {
      console.error("crawler:deleteSource error:", error);
      throw error;
    }
  });

  // 获取本地已保存的职位列表（支持 limit/offset 分页，默认 200/0）
  ipcMain.handle(
    "crawler:getJobs",
    async (_event, options: { limit?: number; offset?: number } = {}) => {
      try {
        const limit = Math.min(Math.max(options.limit ?? 200, 1), 1000);
        const offset = Math.max(options.offset ?? 0, 0);
        const rows = queryAll(
          "SELECT * FROM job_listings ORDER BY collected_at DESC LIMIT ? OFFSET ?",
          [limit, offset],
        );
        return rows.map((row) => {
          const record = row as Record<string, unknown>;
          let tags = record.tags;
          if (typeof record.tags === "string") {
            try {
              tags = JSON.parse((record.tags as string) || "[]");
            } catch {
              tags = (record.tags as string)
                .split(/[,，]/)
                .map((tag) => tag.trim())
                .filter(Boolean);
            }
          }
          return enrichJobWithQuality({ ...record, tags });
        });
      } catch (error) {
        console.error("crawler:getJobs error:", error);
        return [];
      }
    },
  );

  ipcMain.handle("crawler:validateJobs", async (_event, jobs: unknown[]) => {
    const list = Array.isArray(jobs)
      ? (jobs as Array<Record<string, unknown>>)
      : [];
    const prepared = dedupeJobs(list);
    return {
      success: true,
      jobs: prepared.jobs,
      duplicateCount: prepared.duplicateCount,
      invalidCount: prepared.jobs.filter(
        (job) => job.quality.validityStatus === "invalid",
      ).length,
      trainingRiskCount: prepared.jobs.filter(
        (job) => job.quality.trainingRiskScore >= 70,
      ).length,
    };
  });

  // 打开内嵌浏览器窗口（用户登录招聘网站、导航到职位列表页）
  ipcMain.handle("crawler:openBrowser", async (_event, url: string) => {
    const targetUrl = url || "https://www.zhipin.com";
    if (url && !isAllowedJobUrl(url)) {
      throw new Error("不允许的 URL（非招聘网站域名）");
    }
    if (browserWin && !browserWin.isDestroyed()) {
      browserWin.focus();
      try {
        await browserWin.loadURL(targetUrl);
      } catch {
        // loadURL 失败不致命（可能用户在手动导航）
      }
      return { success: true };
    }
    browserWin = new BrowserWindow({
      width: 1100,
      height: 800,
      title: "招聘页面抓取 - 登录后导航到职位列表",
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
      },
    });
    browserWin.setMenuBarVisibility(false);
    browserWin.on("closed", () => {
      browserWin = null;
    });
    try {
      await browserWin.loadURL(targetUrl);
    } catch {
      // 忽略初始加载错误
    }
    return { success: true };
  });

  // 抓取当前浏览器页面的职位信息（截图 → 视觉模型 OCR 结构化）
  ipcMain.handle("crawler:extractJobsFromPage", async () => {
    if (!browserWin || browserWin.isDestroyed()) {
      throw new Error('浏览器窗口未打开，请先点击"打开浏览器"');
    }
    const provider = getVisionProvider(); // 未配置会 throw
    const pageUrl = browserWin.webContents.getURL();

    // 截取当前页面图像并转为 base64 dataURL
    const nativeImage = await browserWin.webContents.capturePage();
    const base64DataUrl = nativeImage.toDataURL();

    const systemMsg =
      "你是招聘信息提取专家，擅长从网页截图中识别职位列表并结构化。必须只返回 JSON 数组，不要任何额外文字、不要 markdown 代码块。";
    const extractInstruction =
      '请从这张招聘网页截图中提取职位信息，返回 JSON 数组，每个元素格式：{"title":"职位名称","company":"公司名","location":"工作地点","salary":"薪资（如 15-25k，没有则空字符串）","description":"职位简述（50字内）","url":"链接（截图中看不到则用空字符串）"}。要求：1. 只提取明确的职位条目，过滤导航、广告、登录提示等无关内容 2. 尽可能提取所有可见职位 3. 字段缺失用空字符串 4. 只返回 JSON 数组';

    // 构造 vision 消息：user content 为 text + image_url 数组
    const response = await callChatCompletions(provider, [
      { role: "system", content: systemMsg },
      {
        role: "user",
        content: [
          { type: "text", text: extractInstruction },
          { type: "image_url", image_url: { url: base64DataUrl } },
        ],
      },
    ]);

    // 容错解析 JSON：剥离 ```json 代码块
    let jsonStr = (response.content || "").trim();
    const m = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) jsonStr = m[1].trim();
    // 提取第一个 [ 到最后一个 ]，兼容模型在数组外添加解释文字
    const firstBracket = jsonStr.indexOf("[");
    const lastBracket = jsonStr.lastIndexOf("]");
    if (firstBracket >= 0 && lastBracket > firstBracket) {
      jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
    }
    let jobs: unknown[];
    try {
      jobs = JSON.parse(jsonStr);
    } catch {
      throw new Error("视觉模型返回格式异常，无法解析为职位列表。请重试。");
    }
    if (!Array.isArray(jobs)) {
      throw new Error("AI 返回的不是数组");
    }
    return { success: true, jobs, count: jobs.length, source: pageUrl };
  });

  // 关闭浏览器窗口
  ipcMain.handle("crawler:closeBrowser", async () => {
    if (browserWin && !browserWin.isDestroyed()) {
      browserWin.close();
    }
    browserWin = null;
    return { success: true };
  });
}

/** AI 智能搜索岗位（当没有搜索源时的方案） */
async function aiSearchJobs(query: string) {
  const provider = getActiveProvider();
  const prompt = `你是一个中国招聘市场专家。请根据搜索词"${query}"，列出中国真实企业目前正在招聘的20个岗位。

要求：
1. 必须是真实存在的中国公司（如华为、腾讯、字节跳动、美团、京东、小米、OPPO、vivo、顺丰、万科、碧桂园、海天味业、伊利、蒙牛、农夫山泉等）
2. 岗位必须与搜索词"${query}"高度相关
3. 覆盖不同城市（深圳、广州、上海、北京、杭州、成都、武汉、南京、南宁等）
4. 覆盖不同规模企业（世界500强、大型民企、中型企业、创业公司）
5. 薪资要合理真实

请返回纯JSON数组（不要markdown代码块）：
[
  {
    "title": "职位名称",
    "company": "公司名称",
    "location_city": "工作城市",
    "salary": "薪资范围",
    "description": "岗位描述（30字内）"
  }
]

只返回JSON数组，不要其他文字。`;

  const response = await callChatCompletions(provider, [
    { role: "system", content: "你是招聘专家，只返回JSON数组。" },
    { role: "user", content: prompt },
  ]);

  let jsonStr = (response.content || "").trim();
  const m = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) jsonStr = m[1].trim();
  const firstBracket = jsonStr.indexOf("[");
  const lastBracket = jsonStr.lastIndexOf("]");
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
  }

  let jobs: any[];
  try {
    jobs = JSON.parse(jsonStr);
  } catch {
    throw new Error("AI 搜索结果解析失败，请重试");
  }

  // 直接保存到数据库
  const savedJobs = jobs.map((item: any, index: number) => ({
    id: `ai-${Date.now()}-${index}`,
    title: item.title || "未命名职位",
    company: item.company || "未知公司",
    location_city: item.location_city || item.location || "",
    salary: item.salary || "",
    description: item.description || "",
    source: "ai_search",
    url: "",
    collectedAt: new Date().toISOString(),
  }));

  // 批量保存到数据库
  runInTransaction(() => {
    for (const job of savedJobs) {
      insertJobListing(job, "ai_search");
    }
  });
  persist();

  return savedJobs;
}

async function searchBing(source: SearchSource, query: string) {
  const apiKey = source.config.apiKey;
  const endpoint =
    source.config.endpoint || "https://api.bing.microsoft.com/v7.0/search";
  const url = new URL(endpoint);
  url.searchParams.set("q", query);
  url.searchParams.set("count", "10");
  url.searchParams.set("textDecorations", "false");
  url.searchParams.set("mkt", "zh-CN");

  const response = await fetchWithTimeout(url.toString(), {
    headers: { "Ocp-Apim-Subscription-Key": apiKey as string },
  });

  if (!response.ok) {
    throw new Error(`Bing 搜索失败: ${response.status}`);
  }

  const data = (await response.json()) as {
    webPages?: { value?: BingResult[] };
  };
  const items = (data.webPages?.value || []).map((item, index) => ({
    id: `bing-${Date.now()}-${index}`,
    title: item.name,
    url: item.url,
    snippet: item.snippet,
    source: "bing",
    collectedAt: new Date().toISOString(),
  }));

  return items;
}

async function searchSerpApi(source: SearchSource, query: string) {
  const apiKey = source.config.apiKey;
  const endpoint = source.config.endpoint || "https://serpapi.com/search";
  const url = new URL(endpoint);
  url.searchParams.set("engine", "google_jobs");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", apiKey as string);

  const response = await fetchWithTimeout(url.toString());
  if (!response.ok) {
    throw new Error(`SerpApi 搜索失败: ${response.status}`);
  }

  const data = (await response.json()) as { jobs_results?: SerpApiResult[] };
  const items = (data.jobs_results || []).map((item, index) => ({
    id: `serpapi-${Date.now()}-${index}`,
    title: item.title,
    company: item.company_name,
    location: item.location,
    url: item.link,
    snippet: item.description,
    source: "serpapi",
    collectedAt: new Date().toISOString(),
  }));

  return items;
}

async function searchCustom(source: SearchSource, query: string) {
  const apiKey = source.config.apiKey;
  const endpoint = source.config.endpoint;
  if (!endpoint) {
    throw new Error("自定义搜索源未配置 endpoint");
  }

  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`自定义搜索失败: ${response.status}`);
  }

  const data = (await response.json()) as {
    results?: CustomResult[];
    items?: CustomResult[];
  };
  const items = (data.results || data.items || []).map((item, index) => ({
    id: `custom-${Date.now()}-${index}`,
    title: item.title || item.name,
    url: item.url || item.link,
    snippet: item.snippet || item.description,
    source: "custom",
    collectedAt: new Date().toISOString(),
  }));

  return items;
}

/** 简单的 CSV 解析器，支持双引号包裹的字段 */
function parseCsv(text: string): Array<Record<string, unknown>> {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        current.push(field);
        field = "";
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && text[i + 1] === "\n") i++;
        current.push(field);
        field = "";
        if (current.length > 1 || (current.length === 1 && current[0] !== "")) {
          rows.push(current);
        }
        current = [];
      } else {
        field += char;
      }
    }
  }
  // 处理最后一行
  if (field !== "" || current.length > 0) {
    current.push(field);
    if (current.length > 1 || (current.length === 1 && current[0] !== "")) {
      rows.push(current);
    }
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  const records: Array<Record<string, unknown>> = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const record: Record<string, unknown> = {};
    for (let c = 0; c < headers.length; c++) {
      record[headers[c]] = row[c] ?? "";
    }
    records.push(record);
  }
  return records;
}
