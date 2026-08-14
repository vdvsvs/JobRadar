const assert = require("assert");
const path = require("path");
const Module = require("module");
const esbuild = require("esbuild");

const root = path.resolve(__dirname, "..");

async function main() {
  const built = await esbuild.build({
    entryPoints: [path.join(root, "electron/main/ipc/autoApplyPolicy.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    logLevel: "silent",
  });

  const mod = new Module("autoApplyPolicy.cjs");
  mod._compile(built.outputFiles[0].text, "autoApplyPolicy.cjs");
  const {
    score100To5,
    score5To100,
    isAllowedDomain,
    matchesWhitelist,
    DEFAULT_AUTO_APPLY_CONFIG,
  } = mod.exports;

  assert.strictEqual(DEFAULT_AUTO_APPLY_CONFIG.dryRun, true);
  assert.strictEqual(score100To5(70), 3.5);
  assert.strictEqual(score100To5(4.5), 4.5);
  assert.strictEqual(score5To100(4.5), 90);
  assert.strictEqual(
    isAllowedDomain(
      "https://www.zhipin.com/job_detail/1.html",
      DEFAULT_AUTO_APPLY_CONFIG.allowedDomains,
    ),
    true,
  );
  assert.deepStrictEqual(
    matchesWhitelist(
      { title: "Java后端开发实习生", company: "A", location_city: "郑州" },
      DEFAULT_AUTO_APPLY_CONFIG,
    ),
    [],
  );
  console.log("Auto apply policy check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
