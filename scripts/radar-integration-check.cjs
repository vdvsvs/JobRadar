const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const presets = fs.readFileSync(
  path.join(root, "src/constants/radarSources.ts"),
  "utf8",
);
const store = fs.readFileSync(
  path.join(root, "src/stores/useJobScanStore.ts"),
  "utf8",
);
const app = fs.readFileSync(path.join(root, "src/App.tsx"), "utf8");

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

for (const name of sourceNames) {
  if (!presets.includes(`portal_name: "${name}"`)) {
    throw new Error(`Missing JobRadar source preset: ${name}`);
  }
}

for (const call of [
  "getDataSources()",
  "searchJobs(query)",
  "validateJobs(results)",
  "saveScannedJobs(prepared)",
]) {
  if (!store.includes(call)) throw new Error(`Missing real scan step: ${call}`);
}

if (store.includes("示例职位") || store.includes("模拟添加扫描结果")) {
  throw new Error("Job radar scan still contains mock job generation");
}

if (!app.includes('label: "岗位雷达"') || !app.includes('link: "/scan"')) {
  throw new Error("Job radar navigation is not wired");
}

console.log("JobRadar integration check passed.");
