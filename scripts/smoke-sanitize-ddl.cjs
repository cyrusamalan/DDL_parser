const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

const output = execFileSync(
  process.execPath,
  ["--experimental-strip-types", join(__dirname, "smoke-sanitize-runner.mts")],
  { cwd: join(__dirname, ".."), encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
);

const { notes } = JSON.parse(output.trim());
assert.ok(Array.isArray(notes));
console.log("DDL sanitize smoke test passed.");
console.log(notes.join(" "));
