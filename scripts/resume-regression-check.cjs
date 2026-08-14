const fs = require("fs");
const path = require("path");
const Module = require("module");
const esbuild = require("esbuild");

const root = path.resolve(__dirname, "..");

async function main() {
  const built = await esbuild.build({
    entryPoints: [path.join(root, "electron/main/lib/resumeParser.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    logLevel: "silent",
  });

  const mod = new Module("resumeParser.cjs");
  mod._compile(built.outputFiles[0].text, "resumeParser.cjs");
  const { extractResumeBasics, validateResumeBasics } = mod.exports;
  const fixtureDir = path.join(root, "scripts/fixtures");
  const expectedFiles = fs
    .readdirSync(fixtureDir)
    .filter((name) => name.endsWith(".expected.json"));
  const errors = [];
  for (const file of expectedFiles) {
    const stem = file.replace(".expected.json", "");
    const text = fs.readFileSync(path.join(fixtureDir, `${stem}.txt`), "utf8");
    const expected = JSON.parse(
      fs.readFileSync(path.join(fixtureDir, file), "utf8"),
    );
    const parsed = extractResumeBasics(text);
    for (const error of validateResumeBasics(parsed, expected))
      errors.push(`${stem}: ${error}`);
  }

  if (errors.length) {
    console.error("Resume regression failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log("Resume regression passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
