import { ipcMain } from "electron";
import { createSafeStore } from "../store";
import { queryAll, queryOne, executeRun, persist } from "../db";
import {
  AutoApplyConfig,
  AutoApplySession,
  DEFAULT_AUTO_APPLY_CONFIG,
  buildFingerprint,
  getDateKey,
  getSession,
  isAllowedDomain,
  matchesWhitelist,
  score100To5,
  score5To100,
} from "./autoApplyPolicy";
import { submitWithAdapter } from "./jobApplyAdapters";

type AutoApplyLogType = "info" | "success" | "warning" | "error" | "blocked";

interface AutoApplyLog {
  id: string;
  time: string;
  type: AutoApplyLogType;
  title: string;
  detail?: string;
  jobId?: string;
}

interface AppliedRecord {
  fingerprint: string;
  jobId: string;
  title: string;
  company: string;
  date: string;
  session: AutoApplySession;
  appliedAt: string;
  mode?: "live" | "dry_run";
}

interface FailureRecord {
  count: number;
  lastError: string;
  blockedUntil?: string;
}

interface AutoApplyStore {
  config: AutoApplyConfig;
  logs: AutoApplyLog[];
  applied: AppliedRecord[];
  failures: Record<string, FailureRecord>;
}

interface QueueStats {
  totalJobs: number;
  evaluatedJobs: number;
  unevaluatedJobs: number;
  eligibleJobs: number;
  minScore: number;
  blockedReasons: Record<string, number>;
}

const autoApplyStore = createSafeStore<AutoApplyStore>({
  name: "auto-apply",
  defaults: {
    config: DEFAULT_AUTO_APPLY_CONFIG,
    logs: [],
    applied: [],
    failures: {},
  },
});

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let nextRunAt: string | null = null;

export function registerAutoApplyHandlers() {
  ipcMain.handle("autoApply:getStatus", async () => getStatus());
  ipcMain.handle("autoApply:start", async () => {
    updateConfig({ enabled: true });
    startWorker(0);
    return getStatus();
  });
  ipcMain.handle("autoApply:stop", async () => {
    updateConfig({ enabled: false });
    stopWorker();
    addLog("warning", "自动投递已停止");
    return getStatus();
  });
  ipcMain.handle(
    "autoApply:updateConfig",
    async (_event, updates: Partial<AutoApplyConfig>) => {
      updateConfig(updates);
      if (getConfig().enabled) startWorker(0);
      return getStatus();
    },
  );
  ipcMain.handle("autoApply:refreshQueue", async () => {
    const jobs = findEligibleJobs(new Date()).slice(0, 20);
    const stats = getQueueStats(new Date());
    addLog(
      "info",
      `已刷新候选队列：${jobs.length} 个安全候选岗位`,
      queueHint(stats),
    );
    return { success: true, jobs, stats, status: getStatus() };
  });

  if (getConfig().enabled) startWorker(0);
}

function startWorker(delayMs = 30_000) {
  stopWorker();
  running = true;
  schedule(delayMs);
  addLog("info", "自动投递调度器已启动");
}

function stopWorker() {
  running = false;
  nextRunAt = null;
  if (timer) clearTimeout(timer);
  timer = null;
}

function schedule(delayMs: number) {
  if (!running) return;
  if (timer) clearTimeout(timer);
  nextRunAt = new Date(Date.now() + delayMs).toISOString();
  timer = setTimeout(() => void tick(), delayMs);
}

async function tick() {
  if (!running || !getConfig().enabled) return;
  const now = new Date();
  const config = getConfig();
  const session = getSession(now, config);

  if (!session) {
    schedule(msUntilHour(config.morningStartHour));
    return;
  }

  const limit =
    session === "morning"
      ? config.dailyMorningLimit
      : config.dailyAfternoonLimit;
  if (countApplied(getDateKey(now), session) >= limit) {
    addLog("info", `${sessionLabel(session)}额度已用完，等待下一个投递窗口`);
    schedule(msUntilNextSession(session, config));
    return;
  }

  const job = findEligibleJobs(now)[0];
  if (!job) {
    addLog("info", "暂无符合白名单和去重规则的岗位");
    schedule(5 * 60_000);
    return;
  }

  await applyOne(job, session, now);
  schedule(Math.max(config.intervalMinutes, 1) * 60_000);
}

async function applyOne(
  job: Record<string, any>,
  session: AutoApplySession,
  now: Date,
) {
  const fingerprint = buildFingerprint(job);
  try {
    if (getConfig().dryRun) {
      rememberApplication(job, fingerprint, session, now, "dry_run");
      addLog(
        "success",
        `Dry-run passed: ${job.title} @ ${job.company}`,
        "未执行真实投递；已验证队列、白名单、去重和分数门槛。",
        job.id,
      );
      return;
    }

    const result = await submitApplication(job);
    if (!result.success) throw new Error(result.error);

    markTrackerApplied(job, "自动投递完成；面试偏好：线上面试");
    rememberApplication(job, fingerprint, session, now, "live");
    addLog(
      "success",
      `已自动投递：${job.title} @ ${job.company}`,
      job.source_url,
      job.id,
    );
  } catch (error) {
    const message = (error as Error).message || "投递失败";
    recordFailure(fingerprint, message);
    addLog(
      message.includes("适配器") ? "blocked" : "error",
      `投递被拦截：${job.title} @ ${job.company}`,
      message,
      job.id,
    );
  }
}

function rememberApplication(
  job: Record<string, any>,
  fingerprint: string,
  session: AutoApplySession,
  now: Date,
  mode: "live" | "dry_run",
) {
  autoApplyStore.set("applied", [
    {
      fingerprint,
      jobId: job.id,
      title: job.title,
      company: job.company,
      date: getDateKey(now),
      session,
      appliedAt: new Date().toISOString(),
      mode,
    },
    ...autoApplyStore.store.applied,
  ]);
}

async function submitApplication(
  _job: Record<string, any>,
): Promise<{ success: boolean; error?: string }> {
  return submitWithAdapter(_job);
}

function findEligibleJobs(now: Date) {
  const config = getConfig();
  const minScore = score100To5(config.minScore);
  const rows = queryAll(
    `SELECT jl.*, er.overall_score, er.overall_letter
     FROM job_listings jl
     JOIN evaluation_results er ON er.job_listing_id = jl.id
     WHERE er.overall_score >= ?
     ORDER BY er.overall_score DESC, er.created_at DESC
     LIMIT 100`,
    [minScore],
  );
  return rows.filter((job) => isEligible(job, now).ok);
}

function getQueueStats(now: Date): QueueStats {
  const config = getConfig();
  const minScore = score100To5(config.minScore);
  const totalJobs = Number(
    queryOne("SELECT COUNT(*) AS count FROM job_listings")?.count || 0,
  );
  const rows = queryAll(
    `SELECT jl.*, er.overall_score, er.overall_letter
     FROM job_listings jl
     JOIN evaluation_results er ON er.job_listing_id = jl.id
     ORDER BY er.created_at DESC
     LIMIT 500`,
  );
  const seen = new Set<string>();
  const blockedReasons: Record<string, number> = {};
  let eligibleJobs = 0;
  for (const job of rows) {
    const id = String(job.id || "");
    if (seen.has(id)) continue;
    seen.add(id);
    const reasons =
      Number(job.overall_score || 0) < minScore
        ? [`匹配分低于${config.minScore}`]
        : (isEligible(job, now).reason || "").split("；").filter(Boolean);
    if (reasons.length === 0) eligibleJobs++;
    for (const reason of reasons)
      blockedReasons[reason] = (blockedReasons[reason] || 0) + 1;
  }
  return {
    totalJobs,
    evaluatedJobs: seen.size,
    unevaluatedJobs: Math.max(0, totalJobs - seen.size),
    eligibleJobs,
    minScore: config.minScore,
    blockedReasons,
  };
}

function isEligible(
  job: Record<string, any>,
  now: Date,
): { ok: boolean; reason?: string } {
  const config = getConfig();
  const fingerprint = buildFingerprint(job);
  const failure = autoApplyStore.store.failures[fingerprint];
  const blockReasons = matchesWhitelist(job, config);

  if (!isAllowedDomain(job.source_url, config.allowedDomains))
    blockReasons.push("职位链接不在招聘域名白名单");
  if (
    autoApplyStore.store.applied.some(
      (item) => item.fingerprint === fingerprint,
    )
  )
    blockReasons.push("已投递过相同岗位");
  if (hasAppliedTracker(job.id))
    blockReasons.push("投递跟踪中已存在已投递状态");
  if (failure?.blockedUntil && new Date(failure.blockedUntil) > now)
    blockReasons.push("失败保护冷却中");

  return blockReasons.length > 0
    ? { ok: false, reason: blockReasons.join("；") }
    : { ok: true };
}

function hasAppliedTracker(jobId: string): boolean {
  const row = queryOne(
    `SELECT id FROM application_tracker
     WHERE job_listing_id = ? AND status IN ('applied','phone_screen','technical_interview','onsite','offer','accepted')`,
    [jobId],
  );
  return !!row;
}

function markTrackerApplied(job: Record<string, any>, notes: string) {
  const existing = queryOne(
    "SELECT id, status_history FROM application_tracker WHERE job_listing_id = ?",
    [job.id],
  );
  const now = new Date().toISOString();
  if (existing?.id) {
    const history = safeJson((existing.status_history as string) || "[]", []);
    history.push({ status: "applied", timestamp: now, notes });
    executeRun(
      "UPDATE application_tracker SET status = ?, status_history = ?, notes = ?, updated_at = ? WHERE id = ?",
      ["applied", JSON.stringify(history), notes, now, existing.id],
    );
  } else {
    executeRun(
      `INSERT INTO application_tracker (id, job_listing_id, status, status_history, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        `auto-${Date.now()}`,
        job.id,
        "applied",
        JSON.stringify([{ status: "applied", timestamp: now, notes }]),
        notes,
        now,
        now,
      ],
    );
  }
  persist();
}

function recordFailure(fingerprint: string, message: string) {
  const failures = { ...autoApplyStore.store.failures };
  const prev = failures[fingerprint] || { count: 0, lastError: "" };
  const count = prev.count + 1;
  failures[fingerprint] = {
    count,
    lastError: message,
    blockedUntil:
      count >= 3
        ? new Date(Date.now() + 24 * 60 * 60_000).toISOString()
        : prev.blockedUntil,
  };
  autoApplyStore.set("failures", failures);
}

function countApplied(date: string, session: AutoApplySession): number {
  return autoApplyStore.store.applied.filter(
    (item) =>
      item.date === date && item.session === session && item.mode !== "dry_run",
  ).length;
}

function getStatus() {
  const now = new Date();
  const date = getDateKey(now);
  const config = getConfig();
  return {
    running,
    nextRunAt,
    config: { ...config, minScore: score5To100(config.minScore) },
    session: getSession(now, config),
    today: {
      morning: countApplied(date, "morning"),
      afternoon: countApplied(date, "afternoon"),
    },
    logs: autoApplyStore.store.logs.slice(0, 100),
    eligibleCount: findEligibleJobs(now).length,
    queueStats: getQueueStats(now),
  };
}

function updateConfig(updates: Partial<AutoApplyConfig>) {
  const current = getConfig();
  autoApplyStore.set("config", {
    ...current,
    ...updates,
    minScore: score5To100(updates.minScore ?? current.minScore),
  });
}

function getConfig(): AutoApplyConfig {
  return { ...DEFAULT_AUTO_APPLY_CONFIG, ...autoApplyStore.store.config };
}

function addLog(
  type: AutoApplyLogType,
  title: string,
  detail?: string,
  jobId?: string,
) {
  const logs = [
    {
      id: `auto-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      time: new Date().toISOString(),
      type,
      title,
      detail,
      jobId,
    },
    ...autoApplyStore.store.logs,
  ].slice(0, 200);
  autoApplyStore.set("logs", logs);
}

function queueHint(stats: QueueStats): string {
  if (stats.totalJobs === 0)
    return "本地还没有岗位。登录后需要进入职位列表页，并点击“抓取当前页岗位”。";
  if (stats.evaluatedJobs === 0)
    return `本地有 ${stats.totalJobs} 条岗位，但还没有 AI 匹配评分。请先运行 AI 全自动流程完成岗位评估。`;
  if (stats.eligibleJobs === 0)
    return `本地 ${stats.totalJobs} 条岗位，已评分 ${stats.evaluatedJobs} 条，但全部被过滤：${
      Object.entries(stats.blockedReasons)
        .map(([k, v]) => `${k} ${v}`)
        .join("，") || "无明细"
    }`;
  return `本地 ${stats.totalJobs} 条岗位，已评分 ${stats.evaluatedJobs} 条，符合条件 ${stats.eligibleJobs} 条。`;
}

function msUntilHour(hour: number): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

function msUntilNextSession(
  session: AutoApplySession,
  config: AutoApplyConfig,
): number {
  return session === "morning"
    ? msUntilHour(config.afternoonStartHour)
    : msUntilHour(config.morningStartHour);
}

function sessionLabel(session: AutoApplySession): string {
  return session === "morning" ? "上午" : "下午";
}

function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
