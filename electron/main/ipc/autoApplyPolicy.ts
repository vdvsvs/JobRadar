export type AutoApplySession = "morning" | "afternoon";

export interface AutoApplyConfig {
  enabled: boolean;
  intervalMinutes: number;
  morningStartHour: number;
  afternoonStartHour: number;
  dailyMorningLimit: number;
  dailyAfternoonLimit: number;
  minScore: number;
  allowedDomains: string[];
  titleWhitelist: string[];
  cityWhitelist: string[];
  companyBlocklist: string[];
  onlineInterviewPreferred: boolean;
  dryRun: boolean;
}

export const DEFAULT_AUTO_APPLY_CONFIG: AutoApplyConfig = {
  enabled: false,
  intervalMinutes: 2,
  morningStartHour: 10,
  afternoonStartHour: 15,
  dailyMorningLimit: 50,
  dailyAfternoonLimit: 50,
  minScore: 70,
  allowedDomains: [
    "zhipin.com",
    "bosszhipin.com",
    "liepin.com",
    "51job.com",
    "lagou.com",
    "zhaopin.com",
    "shixiseng.com",
  ],
  titleWhitelist: [
    "开发",
    "工程师",
    "算法",
    "前端",
    "后端",
    "全栈",
    "数据",
    "AI",
    "人工智能",
    "产品",
    "运营",
    "实习",
  ],
  cityWhitelist: [],
  companyBlocklist: [],
  onlineInterviewPreferred: true,
  dryRun: true,
};

export function score100To5(score: number): number {
  return score > 5 ? Math.max(0, Math.min(5, score / 20)) : score;
}

export function score5To100(score: number): number {
  return score <= 5 ? Math.round(score * 20) : score;
}

export function getSession(
  now = new Date(),
  config = DEFAULT_AUTO_APPLY_CONFIG,
): AutoApplySession | null {
  const hour = now.getHours();
  if (hour >= config.morningStartHour && hour < config.afternoonStartHour)
    return "morning";
  if (hour >= config.afternoonStartHour) return "afternoon";
  return null;
}

export function getDateKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function isAllowedDomain(
  url: string | undefined,
  domains: string[],
): boolean {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return false;
    return domains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}

export function buildFingerprint(job: {
  title?: string;
  company?: string;
  source_url?: string;
}): string {
  const title = normalize(job.title);
  const company = normalize(job.company);
  let urlPart = "";
  try {
    const url = new URL(job.source_url || "");
    urlPart = `${url.hostname}${url.pathname}`.toLowerCase();
  } catch {
    urlPart = normalize(job.source_url);
  }
  return [company, title, urlPart].filter(Boolean).join("|");
}

export function matchesWhitelist(
  job: { title?: string; company?: string; location_city?: string },
  config: AutoApplyConfig,
): string[] {
  const reasons: string[] = [];
  const title = job.title || "";
  const city = job.location_city || "";
  const company = job.company || "";

  if (
    config.titleWhitelist.length > 0 &&
    !config.titleWhitelist.some((word) => title.includes(word))
  ) {
    reasons.push("职位标题未命中白名单");
  }
  if (
    config.cityWhitelist.length > 0 &&
    !config.cityWhitelist.some((word) => city.includes(word))
  ) {
    reasons.push("城市未命中白名单");
  }
  if (config.companyBlocklist.some((word) => company.includes(word))) {
    reasons.push("公司命中黑名单");
  }
  return reasons;
}

function normalize(value: unknown): string {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}
