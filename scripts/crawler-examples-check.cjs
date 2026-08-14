const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dir = path.join(root, "public/crawler-examples");
const required = ["boss直聘.json", "拉勾.json", "实习僧.json"];

for (const file of required) {
  const fullPath = path.join(dir, file);
  assert.ok(fs.existsSync(fullPath), `missing ${file}`);
  const data = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  assert.ok(data.source?.endpoint, `${file} missing source.endpoint`);
  assert.ok(
    Array.isArray(data.fieldMapping) && data.fieldMapping.length > 0,
    `${file} missing fieldMapping`,
  );
}

console.log("Crawler examples check passed.");
