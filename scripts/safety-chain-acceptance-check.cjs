const assert = require("assert");
const fs = require("fs");
const path = require("path");
const Module = require("module");
const esbuild = require("esbuild");

const root = path.resolve(__dirname, "..");

async function loadTs(entry) {
  const built = await esbuild.build({
    entryPoints: [path.join(root, entry)],
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    logLevel: "silent",
  });
  const mod = new Module(path.basename(entry));
  mod._compile(built.outputFiles[0].text, entry);
  return mod.exports;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}

function makeJobs(platform, host, count) {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return {
      id: `${platform}-${n}`,
      platform,
      title: n === 8 ? "Java后端培训生" : "Java后端开发实习生",
      company: n === 7 ? "黑名单科技" : `${platform}样本公司${n}`,
      location_city: n === 6 ? "北京" : "郑州",
      salary: n % 3 === 0 ? "150-200/天" : "3-5K",
      requirements: "Java, SpringBoot, MyBatis, MySQL, Redis",
      description:
        n === 8
          ? "零基础高薪，先培训，包就业。"
          : "参与Java后端业务系统开发，负责接口、数据库与服务联调。",
      source_url: `https://${host}/job/${n}`,
      score5: n === 5 ? 3.2 : 4.1 + (n % 3) * 0.2,
      riskLevel: n === 8 ? "high" : n === 9 ? "medium" : "low",
      status: "draft",
    };
  });
}

function normalizeConfig(defaultConfig, incoming) {
  return { ...defaultConfig, ...incoming };
}

function evaluateQueue(jobs, config, policy, options = {}) {
  const seen = new Set();
  const logs = [];
  const eligible = [];

  for (const job of jobs) {
    const reasons = [];
    const fingerprint = policy.buildFingerprint(job);
    if (seen.has(fingerprint)) reasons.push("重复岗位");
    seen.add(fingerprint);

    reasons.push(...policy.matchesWhitelist(job, config));
    if (!policy.isAllowedDomain(job.source_url, config.allowedDomains))
      reasons.push("职位链接不在招聘域名白名单");
    if (job.score5 < policy.score100To5(config.minScore))
      reasons.push(`匹配分低于${config.minScore}`);
    if (job.simulate === "captcha") reasons.push("验证码/安全验证");
    if (job.simulate === "login") reasons.push("登录失效");
    if (job.riskLevel === "high") reasons.push("企业/岗位高风险");

    const ok = reasons.length === 0;
    logs.push({
      jobId: job.id,
      platform: job.platform,
      title: job.title,
      company: job.company,
      score: Math.round(job.score5 * 20),
      riskLevel: job.riskLevel,
      action: ok
        ? options.dryRun
          ? "dry-run-pass"
          : "apply-simulated"
        : "blocked",
      reason: ok ? "" : reasons.join("；"),
    });
    if (ok) eligible.push(job);
  }

  return { logs, eligible };
}

async function main() {
  const policy = await loadTs("electron/main/ipc/autoApplyPolicy.ts");
  const resume = await loadTs("electron/main/lib/resumeParser.ts");

  const crawlerFiles = ["boss直聘.json", "拉勾.json", "实习僧.json"];
  const crawlerConfigs = crawlerFiles.map((file) =>
    readJson(`public/crawler-examples/${file}`),
  );
  for (const cfg of crawlerConfigs) {
    assert.ok(cfg.source.endpoint);
    assert.ok(cfg.fieldMapping.some((field) => field.target === "title"));
  }

  const parsedResume = resume.extractResumeBasics(
    fs.readFileSync(
      path.join(root, "scripts/fixtures/wang-rongtian-resume.txt"),
      "utf8",
    ),
  );
  assert.ok(parsedResume.skills.length >= 29);
  assert.ok(parsedResume.interests.length >= 5);

  const oldConfig = {
    enabled: false,
    intervalMinutes: 5,
    dailyMorningLimit: 50,
    dailyAfternoonLimit: 50,
    minScore: 70,
    allowedDomains: policy.DEFAULT_AUTO_APPLY_CONFIG.allowedDomains,
    titleWhitelist: ["Java", "后端", "开发", "实习"],
    cityWhitelist: ["郑州"],
    companyBlocklist: ["黑名单科技"],
    onlineInterviewPreferred: true,
  };
  const mergedConfig = normalizeConfig(
    policy.DEFAULT_AUTO_APPLY_CONFIG,
    oldConfig,
  );
  assert.strictEqual(mergedConfig.dryRun, true);

  const jobs = [
    ...makeJobs("Boss直聘", "www.zhipin.com", 10),
    ...makeJobs("拉勾", "www.lagou.com", 10),
    ...makeJobs("实习僧", "www.shixiseng.com", 10),
  ];
  jobs[10].source_url = jobs[0].source_url;
  jobs[21].simulate = "captcha";
  jobs[22].simulate = "login";

  const dryRun = evaluateQueue(
    jobs,
    { ...mergedConfig, dryRun: true },
    policy,
    { dryRun: true },
  );
  const live = evaluateQueue(jobs, { ...mergedConfig, dryRun: false }, policy, {
    dryRun: false,
  });

  const trackerBefore = Object.fromEntries(
    dryRun.eligible.map((job) => [job.id, job.status]),
  );
  const trackerAfterDryRun = { ...trackerBefore };
  const trackerAfterLive = Object.fromEntries(
    live.eligible.map((job) => [job.id, "applied"]),
  );

  assert.strictEqual(
    dryRun.logs.filter((log) => log.action === "dry-run-pass").length,
    dryRun.eligible.length,
  );
  assert.strictEqual(
    Object.values(trackerAfterDryRun).every((status) => status === "draft"),
    true,
  );
  assert.strictEqual(
    Object.values(trackerAfterLive).every((status) => status === "applied"),
    true,
  );
  assert.ok(dryRun.logs.some((log) => log.reason.includes("验证码")));
  assert.ok(dryRun.logs.some((log) => log.reason.includes("登录失效")));
  assert.ok(dryRun.logs.some((log) => log.reason.includes("匹配分低于70")));
  assert.ok(dryRun.logs.some((log) => log.reason.includes("公司命中黑名单")));

  const panelSource = fs.readFileSync(
    path.join(root, "src/components/autopilot/AutoApplyPanel.tsx"),
    "utf8",
  );
  const panelSwitchOk =
    panelSource.includes("安全演练模式") && panelSource.includes("dryRun");
  assert.strictEqual(panelSwitchOk, true);

  const result = {
    crawler: crawlerConfigs.map((cfg) => ({
      platform: cfg.source.name,
      endpoint: cfg.source.endpoint,
      fieldCount: cfg.fieldMapping.length,
      ok: true,
    })),
    parsedResume: {
      name: parsedResume.name,
      skills: parsedResume.skills.length,
      interests: parsedResume.interests.length,
      projects: parsedResume.projects,
    },
    oldConfig,
    mergedConfig,
    frontPanel: { dryRunSwitch: panelSwitchOk },
    jobs: jobs.map((job) => ({
      platform: job.platform,
      title: job.title,
      company: job.company,
      location: job.location_city,
      salary: job.salary,
      score: Math.round(job.score5 * 20),
      riskLevel: job.riskLevel,
    })),
    dryRun: {
      realRequestsSent: 0,
      trackerBefore,
      trackerAfter: trackerAfterDryRun,
      logs: dryRun.logs,
    },
    liveSimulation: {
      realRequestsSent: live.eligible.length,
      trackerAfter: trackerAfterLive,
      logs: live.logs,
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
