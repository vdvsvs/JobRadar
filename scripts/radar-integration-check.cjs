const assert = require("node:assert");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
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

const sourceNames = [
  "国务院国资委",
  "中国人社部",
  "企业官网",
  "微信公众号",
  "国聘网",
  "Boss直聘",
  "前程无忧",
  "智联招聘",
];

async function main() {
  const presets = fs.readFileSync(
    path.join(root, "src/constants/radarSources.ts"),
    "utf8",
  );
  const store = fs.readFileSync(
    path.join(root, "src/stores/useJobScanStore.ts"),
    "utf8",
  );
  const crawler = fs.readFileSync(
    path.join(root, "electron/main/ipc/crawler.ts"),
    "utf8",
  );
  const app = fs.readFileSync(path.join(root, "src/App.tsx"), "utf8");

  for (const name of sourceNames) {
    if (!presets.includes(`portal_name: "${name}"`)) {
      throw new Error(`Missing JobRadar source preset: ${name}`);
    }
  }

  for (const call of [
    "getDataSources()",
    "searchJobs(query)",
    "validateJobs(results)",
    "saveJobs(prepared)",
  ]) {
    if (!store.includes(call))
      throw new Error(`Missing real scan step: ${call}`);
  }

  assert.ok(
    store.includes('validityStatus !== "invalid"'),
    "Invalid jobs must be rejected before persistence",
  );

  if (store.includes("示例职位") || store.includes("模拟添加扫描结果")) {
    throw new Error("Job radar scan still contains mock job generation");
  }

  if (
    !app.includes('label: "岗位雷达"') ||
    !app.includes('link: "/scan"') ||
    !app.includes("startRadarScheduler")
  ) {
    throw new Error("Job radar navigation or scheduler is not wired");
  }

  const scheduler = await loadTs("src/services/radarScheduler.ts");
  const now = Date.parse("2026-08-14T08:00:00.000Z");
  const dueIds = scheduler.getDueScanConfigIds(
    [
      {
        id: "never-run",
        is_active: true,
        scan_interval_hours: 6,
      },
      {
        id: "due",
        is_active: true,
        scan_interval_hours: 1,
        last_scanned_at: "2026-08-14T06:59:59.000Z",
      },
      {
        id: "not-due",
        is_active: true,
        scan_interval_hours: 2,
        last_scanned_at: "2026-08-14T07:00:01.000Z",
      },
      {
        id: "disabled",
        is_active: false,
        scan_interval_hours: 1,
      },
    ],
    now,
  );
  assert.deepStrictEqual(dueIds, ["never-run", "due"]);

  const quality = await loadTs("electron/main/lib/jobQuality.ts");
  const first = {
    title: " Java 后端开发 ",
    company: "示例科技",
    location_city: "郑州",
    source_url: "https://example.com/jobs/1",
  };
  const sameJobDifferentUrl = {
    ...first,
    source_url: "https://another.example/jobs/99",
  };
  assert.strictEqual(
    quality.jobFingerprint(first),
    quality.jobFingerprint(sameJobDifferentUrl),
    "Job identity must not change when only the source URL changes",
  );
  assert.strictEqual(
    quality.jobFingerprint(first),
    `job:${createHash("md5").update("java后端开发\0示例科技\0郑州").digest("hex")}`,
    "Job identity must follow the normalized title-company-city MD5 convention",
  );
  assert.ok(
    crawler.includes("loadJobIdentityMap") &&
      crawler.includes("knownJobs.set(identityKey, id)"),
    "Crawler persistence must deduplicate against previously saved jobs",
  );
  assert.ok(
    crawler.includes('job.quality.validityStatus !== "invalid"'),
    "Invalid jobs must be rejected at the persistence boundary",
  );

  console.log("JobRadar integration check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
