import { ipcMain } from "electron";
import axios from "axios";
import { settingsStore } from "./settings";
import { extractResumeBasics } from "../lib/resumeParser";

interface AiProviderRecord {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  isDefault?: boolean;
  supportsVision?: boolean;
}

interface Settings {
  aiProviders: AiProviderRecord[];
  activeProviderId?: string;
  visionProviderId?: string;
  prompts: Record<string, string>;
}

const store = settingsStore as unknown as {
  store: Settings;
  set: (value: Partial<Settings>) => void;
};

interface AiMessage {
  role: "system" | "user" | "assistant";
  // 兼容 vision 消息格式：content 可以是纯文本，也可以是包含 text 和 image_url 的数组（OpenAI vision 格式）
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
}

interface AiResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
}

// SSRF 防护：拦截内网/本地地址
function isPrivateUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== "https:" && u.protocol !== "http:") return true;
    const h = u.hostname;
    if (
      h === "localhost" ||
      h.startsWith("127.") ||
      h.startsWith("10.") ||
      h.startsWith("192.168.") ||
      h.startsWith("169.254.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
      h === "0.0.0.0"
    )
      return true;
    return false;
  } catch {
    return true;
  }
}

// 脱敏 axios 错误：移除可能含敏感信息（apiKey、headers）的 config/request
function sanitizeAxiosError(error: any): Error {
  const safe = { ...error };
  if (safe.config) {
    delete safe.config;
  }
  if (safe.response?.config) {
    delete safe.response.config;
  }
  if (safe.request) {
    delete safe.request;
  }
  console.error("AI error:", safe.message || error);
  return new Error(safe.message || "AI 调用失败");
}

export function getActiveProvider(): AiProviderRecord {
  const settings = store.store;
  const providers = settings.aiProviders || [];
  if (!providers.length) {
    throw new Error("尚未配置 AI 服务商，请先在设置中添加");
  }
  const active =
    providers.find((p) => p.id === settings.activeProviderId) || providers[0];
  if (!active.apiKey) {
    throw new Error(`[${active.name}] 未配置 API Key`);
  }
  return active;
}

// 获取视觉模型供应商：优先 visionProviderId 指定的，回退到 supportsVision=true 的，最后回退到 activeProvider
export function getVisionProvider(): AiProviderRecord {
  const settings = store.store;
  const providers = settings.aiProviders || [];
  if (!providers.length) {
    throw new Error("尚未配置 AI 服务商，请先在设置中添加");
  }
  // 优先用 visionProviderId 指定的供应商
  const visionId = settings.visionProviderId;
  if (visionId) {
    const vp = providers.find((p) => p.id === visionId);
    if (vp) {
      if (!vp.apiKey) throw new Error(`[${vp.name}] 未配置 API Key`);
      return vp;
    }
  }
  // 回退：找第一个 supportsVision=true 的
  const visionCapable = providers.find((p) => p.supportsVision && p.apiKey);
  if (visionCapable) return visionCapable;
  // 再回退到 activeProvider
  const active =
    providers.find((p) => p.id === settings.activeProviderId) || providers[0];
  if (!active.apiKey) {
    throw new Error(`[${active.name}] 未配置 API Key`);
  }
  return active;
}

export async function callChatCompletions(
  provider: AiProviderRecord,
  messages: AiMessage[],
): Promise<AiResponse> {
  // 智能拼接 URL：
  // - 已含 /chat/completions 直接用
  // - 以数字结尾（/v1 /v4 /v2）视为已含版本号，追加 /chat/completions
  // - 否则追加 /v1/chat/completions
  const base = provider.baseUrl.replace(/\/+$/, "");
  const url = base.endsWith("/chat/completions")
    ? base
    : /\d$/.test(base)
      ? `${base}/chat/completions`
      : `${base}/v1/chat/completions`;
  const response = await axios.post(
    url,
    {
      model: provider.model,
      messages,
      max_tokens: 8192,
      temperature: 0.7,
      stream: false,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      timeout: 60000,
    },
  );

  const choice = response.data?.choices?.[0];
  if (!choice?.message?.content) {
    throw new Error(
      `AI 响应异常: HTTP ${response.status}, body=${JSON.stringify(response.data).slice(0, 200)}`,
    );
  }
  return {
    content: choice.message.content,
    usage: response.data.usage
      ? {
          promptTokens: response.data.usage.prompt_tokens,
          completionTokens: response.data.usage.completion_tokens,
          totalTokens: response.data.usage.total_tokens,
        }
      : undefined,
    finishReason: choice.finish_reason,
  };
}

export function registerAiHandlers() {
  ipcMain.handle(
    "ai:chat",
    async (_event, messages: Array<{ role: string; content: string }>) => {
      try {
        const provider = getActiveProvider();
        const aiMessages: AiMessage[] = messages.map((m) => ({
          role: m.role as "system" | "user" | "assistant",
          content: m.content,
        }));
        const response = await callChatCompletions(provider, aiMessages);
        return response.content;
      } catch (error) {
        throw sanitizeAxiosError(error);
      }
    },
  );

  ipcMain.handle("ai:getProviders", async () => {
    const settings = store.store;
    return (settings.aiProviders || []).map((p) => ({
      id: p.id,
      name: p.name,
      model: p.model,
      baseUrl: p.baseUrl,
    }));
  });

  ipcMain.handle("ai:getModels", async () => {
    const provider = getActiveProvider();
    return [provider.model];
  });

  ipcMain.handle(
    "ai:verifyProvider",
    async (_event, provider: AiProviderRecord) => {
      try {
        if (isPrivateUrl(provider.baseUrl)) {
          return {
            success: false,
            content: "不允许的 baseUrl（内网地址被禁止）",
          };
        }
        const messages: AiMessage[] = [
          { role: "user", content: "请用一句话介绍你自己（10字内）" },
        ];
        const response = await callChatCompletions(provider, messages);
        return {
          success: true,
          content: response.content,
          model: provider.model,
        };
      } catch (error) {
        throw sanitizeAxiosError(error);
      }
    },
  );

  // 保存 providers 数组和 activeProviderId 到 store
  ipcMain.handle(
    "ai:saveProviders",
    async (_event, providers: AiProviderRecord[], activeProviderId: string) => {
      try {
        const list = Array.isArray(providers) ? providers : [];
        store.set({ aiProviders: list, activeProviderId });
        return { success: true, count: list.length };
      } catch (error) {
        console.error("ai:saveProviders error:", error);
        throw error;
      }
    },
  );

  // 返回当前活跃 provider（含 apiKey，供前端显示）
  ipcMain.handle("ai:getActiveProvider", async () => {
    try {
      const provider = getActiveProvider();
      return {
        success: true,
        provider: {
          id: provider.id,
          name: provider.name,
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey
            ? `${provider.apiKey.slice(0, 4)}****${provider.apiKey.slice(-4)}`
            : "",
          model: provider.model,
          isDefault: provider.isDefault ?? false,
        },
      };
    } catch (error) {
      console.error("ai:getActiveProvider error:", error);
      throw error;
    }
  });

  // AI 自动解析简历文本，提取结构化个人信息
  ipcMain.handle("ai:parseResume", async (_event, resumeText: string) => {
    const basics = extractResumeBasics(resumeText);
    try {
      const provider = getActiveProvider();
      const prompt = `你是一个简历解析专家。请从以下简历文本中提取结构化信息，返回纯JSON（不要markdown代码块）：

简历内容：
${resumeText}

请返回以下JSON格式：
{
  "name": "姓名",
  "age": 22,
  "major": "专业",
  "education": "学历（本科/硕士/博士）",
  "graduationYear": 2025,
  "skills": ["技能1", "技能2"],
  "experience": "工作/实习经历摘要",
  "projects": "项目经历摘要",
  "interests": ["兴趣方向1", "兴趣方向2"],
  "careerGoals": "职业目标",
  "selfIntro": "基于简历生成的自我介绍（100字内）",
  "identity": "student/fresh_grad/career_switcher/experienced"
}

要求：
1. 字段缺失用合理的默认值
2. skills 从简历中提取所有技术栈和工具
3. interests 从经历中推断职业兴趣方向
4. identity 根据毕业年份和经验自动判断
5. 只返回JSON，不要其他文字`;

      const response = await callChatCompletions(provider, [
        {
          role: "system",
          content: "你是简历解析专家，只返回JSON格式数据，不要任何额外文字。",
        },
        { role: "user", content: prompt },
      ]);

      let jsonStr = response.content.trim();
      // 容错：剥离 markdown 代码块
      const m = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (m) jsonStr = m[1].trim();
      const firstBrace = jsonStr.indexOf("{");
      const lastBrace = jsonStr.lastIndexOf("}");
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
      }
      const parsed = JSON.parse(jsonStr);
      return {
        ...parsed,
        name: parsed.name || basics.name,
        major: parsed.major || basics.major,
        education: parsed.education || basics.education,
        skills: Array.from(
          new Set([...(parsed.skills || []), ...basics.skills]),
        ),
        interests: Array.from(
          new Set([...(parsed.interests || []), ...basics.interests]),
        ),
        projects: parsed.projects || basics.projects.join("；"),
        identity: parsed.identity || basics.identity,
        parseSource: "ai",
      };
    } catch (error) {
      console.error("ai:parseResume error:", error);
      return {
        ...basics,
        age: 22,
        graduationYear: undefined,
        experience: "",
        projects: basics.projects.join("；"),
        interests: basics.interests,
        careerGoals: basics.skills.includes("Java")
          ? "Java 后端开发实习"
          : "软件开发实习",
        selfIntro: `${basics.name || "求职者"}，${basics.major || "计算机相关专业"}${basics.education ? basics.education : ""}，熟悉${basics.skills.slice(0, 6).join("、") || "软件开发基础"}。`,
        parseSource: "fallback",
        parseWarning: sanitizeAxiosError(error).message,
      };
    }
  });

  // AI 从用户资料生成匹配的搜索关键词
  ipcMain.handle("ai:suggestSearchQueries", async (_event, profile: any) => {
    try {
      const provider = getActiveProvider();
      const prompt = `基于以下求职者信息，生成5个招聘网站搜索关键词组合，用于自动搜索匹配岗位：

求职者信息：
- 专业：${profile.major || "未知"}
- 技能：${(profile.skills || []).join("、") || "未知"}
- 兴趣：${(profile.interests || []).join("、") || "未知"}
- 职业目标：${profile.careerGoals || "未知"}
- 身份：${profile.identity || "未知"}

请返回纯JSON数组，每个元素是一个搜索词（中文）：
["搜索词1", "搜索词2", "搜索词3", "搜索词4", "搜索词5"]

要求：
1. 搜索词要具体，适合在Boss直聘/拉勾等平台搜索
2. 结合专业和技能，不要太宽泛
3. 只返回JSON数组`;

      const response = await callChatCompletions(provider, [
        {
          role: "system",
          content: "你是招聘搜索专家，只返回JSON数组，不要任何额外文字。",
        },
        { role: "user", content: prompt },
      ]);

      let jsonStr = response.content.trim();
      const m = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (m) jsonStr = m[1].trim();
      const firstBracket = jsonStr.indexOf("[");
      const lastBracket = jsonStr.lastIndexOf("]");
      if (firstBracket >= 0 && lastBracket > firstBracket) {
        jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
      }
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error("ai:suggestSearchQueries error:", error);
      throw sanitizeAxiosError(error);
    }
  });

  // AI 为单个岗位生成优化简历内容
  ipcMain.handle(
    "ai:generateResume",
    async (
      _event,
      params: {
        resumeText: string;
        jobTitle: string;
        company: string;
        jobDescription: string;
        keywords: string[];
      },
    ) => {
      try {
        const provider = getActiveProvider();
        const prompt = `你是一个简历优化专家。请根据以下信息，生成一份针对特定岗位的优化简历：

原始简历：
${params.resumeText}

目标岗位：${params.jobTitle} @ ${params.company}
岗位描述：${params.jobDescription}
需要突出的关键词：${(params.keywords || []).join("、")}

请生成一份优化后的简历内容（纯文本格式），要求：
1. 保持原始简历的核心经历
2. 根据岗位需求重新组织和措辞
3. 自然地融入关键词
4. 突出与岗位最相关的技能和经历
5. 使用专业的简历语言`;

        const response = await callChatCompletions(provider, [
          {
            role: "system",
            content: "你是简历优化专家，直接输出优化后的简历内容。",
          },
          { role: "user", content: prompt },
        ]);

        return response.content;
      } catch (error) {
        console.error("ai:generateResume error:", error);
        throw sanitizeAxiosError(error);
      }
    },
  );

  // AI 为岗位生成STAR故事
  ipcMain.handle(
    "ai:generateSTARStories",
    async (
      _event,
      params: {
        resumeText: string;
        profile: any;
        jobTitle: string;
        company: string;
        count?: number;
      },
    ) => {
      try {
        const provider = getActiveProvider();
        const count = params.count || 3;
        const prompt = `基于以下求职者信息和目标岗位，生成${count}个STAR面试故事：

求职者简历：${params.resumeText}
求职者背景：${JSON.stringify(params.profile || {})}
目标岗位：${params.jobTitle} @ ${params.company}

请返回纯JSON数组，每个故事包含：
[{
  "title": "故事标题",
  "competency": "能力维度（如problem-solving/leadership/teamwork/communication）",
  "situation": "情境描述（2-3句）",
  "task": "任务描述（1-2句）",
  "action": "行动描述（3-4句，具体做了什么）",
  "result": "结果描述（量化成果）",
  "reflection": "反思总结（1-2句）",
  "tags": ["标签1", "标签2"]
}]

要求：
1. 故事必须基于简历中的真实经历
2. 每个故事对应不同的能力维度
3. 结果部分尽量量化
4. 只返回JSON数组`;

        const response = await callChatCompletions(provider, [
          {
            role: "system",
            content: "你是面试准备专家，只返回JSON数组，不要任何额外文字。",
          },
          { role: "user", content: prompt },
        ]);

        let jsonStr = response.content.trim();
        const m = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (m) jsonStr = m[1].trim();
        const firstBracket = jsonStr.indexOf("[");
        const lastBracket = jsonStr.lastIndexOf("]");
        if (firstBracket >= 0 && lastBracket > firstBracket) {
          jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
        }
        return JSON.parse(jsonStr);
      } catch (error) {
        console.error("ai:generateSTARStories error:", error);
        throw sanitizeAxiosError(error);
      }
    },
  );

  // AI 为岗位生成面试问题
  ipcMain.handle(
    "ai:generateInterviewQuestions",
    async (
      _event,
      params: {
        jobTitle: string;
        company: string;
        jobDescription: string;
        count?: number;
      },
    ) => {
      try {
        const provider = getActiveProvider();
        const count = params.count || 5;
        const prompt = `基于以下岗位信息，生成${count}个可能的面试问题：

岗位：${params.jobTitle} @ ${params.company}
岗位描述：${params.jobDescription || "无"}

请返回纯JSON数组：
[{
  "question_text": "问题内容",
  "question_type": "behavioral/technical/situational"
}]

要求：
1. 涵盖行为面试、技术面试、情境面试
2. 问题要具体，不要太泛
3. 只返回JSON数组`;

        const response = await callChatCompletions(provider, [
          {
            role: "system",
            content: "你是面试准备专家，只返回JSON数组，不要任何额外文字。",
          },
          { role: "user", content: prompt },
        ]);

        let jsonStr = response.content.trim();
        const m = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (m) jsonStr = m[1].trim();
        const firstBracket = jsonStr.indexOf("[");
        const lastBracket = jsonStr.lastIndexOf("]");
        if (firstBracket >= 0 && lastBracket > firstBracket) {
          jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
        }
        return JSON.parse(jsonStr);
      } catch (error) {
        console.error("ai:generateInterviewQuestions error:", error);
        throw sanitizeAxiosError(error);
      }
    },
  );

  ipcMain.handle(
    "ai:analyzeCompany",
    async (_event, companyName: string, jobDescription?: string) => {
      try {
        const provider = getActiveProvider();
        const prompt = `请对以下公司进行全面分析评估：

公司名称：${companyName}
${jobDescription ? `相关职位描述：${jobDescription}` : ""}

请返回纯JSON格式（不要markdown代码块）：
{
  "industry": "所属行业",
  "size": "公司规模（如：1000-5000人）",
  "strengths": ["公司优势1", "优势2", "优势3"],
  "weaknesses": ["公司劣势/风险1", "劣势2"],
  "culture_fit": 0-100的文化匹配度分数,
  "growth_potential": 0-100的成长潜力分数,
  "recommendations": ["给求职者的建议1", "建议2"],
  "risk": {
    "registryStatus": "工商状态摘要，不确定用空字符串",
    "newsSummary": "近一年舆情摘要，不确定用空字符串",
    "riskFlags": ["工商/舆情/培训/外包等风险点"]
  }
}

要求：
1. 基于该公司的真实公开信息分析
2. 评估要客观公正，不要过度美化
3. strengths和weaknesses各至少2条
4. recommendations要具体可操作，risk字段必须标明不确定信息
5. 只返回JSON`;

        const response = await callChatCompletions(provider, [
          {
            role: "system",
            content: "你是企业分析专家，只返回JSON格式的分析结果。",
          },
          { role: "user", content: prompt },
        ]);

        let jsonStr = response.content.trim();
        const m = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (m) jsonStr = m[1].trim();
        const firstBrace = jsonStr.indexOf("{");
        const lastBrace = jsonStr.lastIndexOf("}");
        if (firstBrace >= 0 && lastBrace > firstBrace) {
          jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
        }
        return JSON.parse(jsonStr);
      } catch (error) {
        console.error("ai:analyzeCompany error:", error);
        throw sanitizeAxiosError(error);
      }
    },
  );
}
