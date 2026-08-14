import { createHash } from "node:crypto";

export interface RawJobLike {
  id?: unknown;
  title?: unknown;
  name?: unknown;
  company?: unknown;
  company_name?: unknown;
  location?: unknown;
  location_city?: unknown;
  city?: unknown;
  salary?: unknown;
  url?: unknown;
  link?: unknown;
  source_url?: unknown;
  description?: unknown;
  snippet?: unknown;
  requirements?: unknown;
  tags?: unknown;
}

export interface JobQualityReport {
  validityStatus: "valid" | "needs_review" | "invalid";
  validityScore: number;
  trainingRiskScore: number;
  duplicateKey: string;
  flags: string[];
}

const TRAINING_PATTERNS = [
  /先培训|岗前培训|带薪培训.*就业|就业班|实训基地|包就业|推荐就业/,
  /学费|培训费|贷款|分期|入学|招生|转行|零基础高薪/,
  /签订培训|就业协议|入职收费|押金|保证金/,
];

const INACTIVE_PATTERNS = [/已下线|停止招聘|职位关闭|已过期|招聘结束|暂停招聘/];

function asText(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : value == null
      ? ""
      : String(value).trim();
}

function normalize(value: unknown): string {
  return asText(value)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export function jobUrl(job: RawJobLike): string {
  return asText(job.url || job.link || job.source_url);
}

export function jobFingerprint(job: RawJobLike): string {
  const rawTitle = asText(job.title || job.name);
  const rawCompany = asText(job.company || job.company_name);
  const title = rawTitle === "未命名职位" ? "" : normalize(rawTitle);
  const company = rawCompany === "未知公司" ? "" : normalize(rawCompany);
  const location = normalize(job.location || job.location_city || job.city);
  if (title && company) {
    const digest = createHash("md5")
      .update(`${title}\0${company}\0${location}`)
      .digest("hex");
    return `job:${digest}`;
  }

  const url = jobUrl(job);
  if (url) {
    try {
      const u = new URL(url);
      return `url:${u.hostname}${u.pathname}`.toLowerCase().replace(/\/$/, "");
    } catch {
      return `url:${normalize(url)}`;
    }
  }
  return `job:${company}|${title}|${location}`;
}

export function assessJobQuality(job: RawJobLike): JobQualityReport {
  const title = asText(job.title || job.name);
  const company = asText(job.company || job.company_name);
  const location = asText(job.location || job.location_city || job.city);
  const url = jobUrl(job);
  const body = [
    title,
    company,
    location,
    asText(job.salary),
    asText(job.description || job.snippet),
    asText(job.requirements),
  ].join("\n");

  const flags: string[] = [];
  let validityScore = 100;
  if (!title || title === "未命名职位") {
    validityScore -= 25;
    flags.push("缺少岗位名称");
  }
  if (!company || company === "未知公司") {
    validityScore -= 25;
    flags.push("缺少公司名称");
  }
  if (!location) {
    validityScore -= 10;
    flags.push("缺少工作地点");
  }
  if (!url) {
    validityScore -= 10;
    flags.push("缺少原始链接");
  }
  if (asText(job.description || job.snippet).length < 20) {
    validityScore -= 10;
    flags.push("JD描述过短");
  }
  if (INACTIVE_PATTERNS.some((pattern) => pattern.test(body))) {
    validityScore -= 50;
    flags.push("疑似岗位已失效");
  }

  const trainingHits = TRAINING_PATTERNS.filter((pattern) =>
    pattern.test(body),
  ).length;
  const trainingRiskScore = Math.min(
    100,
    trainingHits * 35 + (/培训|实训|招生|学费/.test(body) ? 20 : 0),
  );
  if (trainingRiskScore >= 70) flags.push("高培训机构风险");
  else if (trainingRiskScore >= 35) flags.push("疑似培训/招生包装");

  const bounded = Math.max(0, Math.min(100, validityScore));
  const validityStatus =
    bounded < 55
      ? "invalid"
      : bounded < 80 || trainingRiskScore >= 70
        ? "needs_review"
        : "valid";
  return {
    validityStatus,
    validityScore: bounded,
    trainingRiskScore,
    duplicateKey: jobFingerprint(job),
    flags,
  };
}

function readTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return value
        .split(/[,，]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function enrichJobWithQuality<T extends RawJobLike>(
  job: T,
): T & { tags: string[]; quality: JobQualityReport } {
  const quality = assessJobQuality(job);
  const tags = new Set(readTags(job.tags));
  tags.add(`有效性:${quality.validityStatus}`);
  tags.add(`有效分:${quality.validityScore}`);
  tags.add(`培训风险:${quality.trainingRiskScore}`);
  for (const flag of quality.flags) tags.add(flag);
  return { ...job, tags: Array.from(tags), quality };
}

export function dedupeJobs<T extends RawJobLike>(
  jobs: T[],
): {
  jobs: Array<T & { tags: string[]; quality: JobQualityReport }>;
  duplicateCount: number;
} {
  const seen = new Set<string>();
  const unique: Array<T & { tags: string[]; quality: JobQualityReport }> = [];
  let duplicateCount = 0;
  for (const job of jobs) {
    const enriched = enrichJobWithQuality(job);
    if (seen.has(enriched.quality.duplicateKey)) {
      duplicateCount++;
      continue;
    }
    seen.add(enriched.quality.duplicateKey);
    unique.push(enriched);
  }
  return { jobs: unique, duplicateCount };
}
