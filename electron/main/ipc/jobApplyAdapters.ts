import { BrowserWindow } from "electron";

export interface JobApplyResult {
  success: boolean;
  error?: string;
  code?:
    | "unsupported"
    | "login_required"
    | "verification_required"
    | "not_found"
    | "already_applied"
    | "blocked";
}

interface JobRecord {
  source_url?: string;
  title?: string;
  company?: string;
}

interface PlatformConfig {
  name: string;
  domains: string[];
  applyText: string[];
  doneText: string[];
  confirmText?: string[];
}

interface JobApplyAdapter {
  name: string;
  canHandle: (job: JobRecord) => boolean;
  apply: (job: JobRecord) => Promise<JobApplyResult>;
}

const RISK_TEXT = [
  "验证码",
  "安全验证",
  "人机验证",
  "滑块",
  "异常访问",
  "访问受限",
];
const LOGIN_TEXT = [
  "登录后",
  "扫码登录",
  "密码登录",
  "手机登录",
  "注册/登录",
  "请登录",
  "账号登录",
];
const DEFAULT_DONE_TEXT = [
  "已沟通",
  "继续沟通",
  "已投递",
  "投递成功",
  "已申请",
  "申请成功",
];

const PLATFORMS: PlatformConfig[] = [
  {
    name: "Boss",
    domains: ["zhipin.com", "bosszhipin.com"],
    applyText: ["立即沟通", "投递简历"],
    doneText: DEFAULT_DONE_TEXT,
  },
  {
    name: "Liepin",
    domains: ["liepin.com"],
    applyText: ["投递简历", "立即投递", "申请职位"],
    doneText: DEFAULT_DONE_TEXT,
    confirmText: ["确认投递", "立即投递"],
  },
  {
    name: "51job",
    domains: ["51job.com"],
    applyText: ["申请职位", "立即申请", "投递简历"],
    doneText: DEFAULT_DONE_TEXT,
    confirmText: ["确认投递", "立即投递"],
  },
  {
    name: "Lagou",
    domains: ["lagou.com"],
    applyText: ["投个简历", "投递简历", "立即投递", "申请职位"],
    doneText: DEFAULT_DONE_TEXT,
    confirmText: ["确认投递", "立即投递"],
  },
  {
    name: "Zhaopin",
    domains: ["zhaopin.com"],
    applyText: ["申请职位", "立即申请", "投递简历", "立即投递"],
    doneText: DEFAULT_DONE_TEXT,
    confirmText: ["确认投递", "立即投递"],
  },
  {
    name: "Shixiseng",
    domains: ["shixiseng.com"],
    applyText: ["投递简历", "立即投递", "申请职位", "申请实习"],
    doneText: DEFAULT_DONE_TEXT,
    confirmText: ["确认投递", "立即投递", "确认申请"],
  },
];

const adapters: JobApplyAdapter[] = PLATFORMS.map((platform) => ({
  name: platform.name,
  canHandle: (job) => isHostAllowed(job.source_url, platform.domains),
  apply: (job) => applyPlatform(job, platform),
}));

export async function submitWithAdapter(
  job: JobRecord,
): Promise<JobApplyResult> {
  const adapter = adapters.find((item) => item.canHandle(job));
  if (!adapter) {
    return {
      success: false,
      code: "unsupported",
      error: "No safe apply adapter is configured for this platform.",
    };
  }
  return adapter.apply(job);
}

async function applyPlatform(
  job: JobRecord,
  platform: PlatformConfig,
): Promise<JobApplyResult> {
  const url = normalizeUrl(job.source_url, platform.domains);
  if (!url)
    return {
      success: false,
      code: "blocked",
      error: `${platform.name} job URL is invalid.`,
    };

  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    show: false,
    title: `${platform.name} auto apply`,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });

  try {
    await withTimeout(
      win.loadURL(url),
      45_000,
      `${platform.name} page load timed out.`,
    );
    await delay(2500);

    const before = await inspectPage(win);
    const blocked = classifyBlock(before.text, platform);
    if (blocked) return blocked;
    if (containsAny(before.text, platform.doneText)) {
      return { success: true, code: "already_applied" };
    }

    const clicked = await clickVisibleText(win, platform.applyText);
    if (!clicked) {
      return {
        success: false,
        code: "not_found",
        error: `No clear ${platform.name} apply button was found.`,
      };
    }

    await delay(2500);
    const afterClick = await inspectPage(win);
    const afterBlocked = classifyBlock(afterClick.text, platform);
    if (afterBlocked) return afterBlocked;
    if (containsAny(afterClick.text, platform.doneText)) {
      return { success: true, error: `${platform.name} apply completed.` };
    }

    const confirmed = platform.confirmText
      ? await clickVisibleText(win, platform.confirmText)
      : null;
    if (confirmed) {
      await delay(2500);
      const afterConfirm = await inspectPage(win);
      const confirmBlocked = classifyBlock(afterConfirm.text, platform);
      if (confirmBlocked) return confirmBlocked;
    }

    return {
      success: true,
      error: `${platform.name} apply action triggered. Interview preference: online first.`,
    };
  } finally {
    if (!win.isDestroyed()) win.close();
  }
}

async function inspectPage(win: BrowserWindow): Promise<{ text: string }> {
  return win.webContents.executeJavaScript(`
    (() => ({ text: document.body ? document.body.innerText : '' }))()
  `);
}

async function clickVisibleText(
  win: BrowserWindow,
  textList: string[],
): Promise<string | null> {
  return win.webContents.executeJavaScript(`
    (() => {
      const wanted = ${JSON.stringify(textList)};
      const nodes = Array.from(document.querySelectorAll('a,button,[role="button"],.btn,.button,.apply,.deliver,.send,.chat'));
      const visible = (el) => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
      };
      const target = nodes.find((el) => {
        const text = (el.innerText || el.textContent || '').trim().replace(/\\s+/g, '');
        return visible(el) && wanted.some((word) => text === word || text.includes(word));
      });
      if (!target) return null;
      const text = (target.innerText || target.textContent || '').trim().replace(/\\s+/g, '');
      target.click();
      return text;
    })()
  `);
}

function classifyBlock(
  text: string,
  platform: PlatformConfig,
): JobApplyResult | null {
  if (containsAny(text, RISK_TEXT)) {
    return {
      success: false,
      code: "verification_required",
      error: `${platform.name} requested verification. Auto apply stopped.`,
    };
  }
  if (containsAny(text, LOGIN_TEXT)) {
    return {
      success: false,
      code: "login_required",
      error: `${platform.name} is not logged in. Auto apply stopped.`,
    };
  }
  return null;
}

function containsAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function normalizeUrl(
  value: string | undefined,
  domains: string[],
): string | null {
  if (!value || !isHostAllowed(value, domains)) return null;
  return value;
}

function isHostAllowed(value: string | undefined, domains: string[]): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      domains.some(
        (domain) =>
          url.hostname === domain || url.hostname.endsWith(`.${domain}`),
      )
    );
  } catch {
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
