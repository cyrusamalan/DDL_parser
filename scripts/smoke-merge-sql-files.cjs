const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

execFileSync(
  process.execPath,
  ["--experimental-strip-types", join(__dirname, "smoke-merge-sql-files-runner.mts")],
  { cwd: join(__dirname, ".."), encoding: "utf8", stdio: "inherit" },
);

console.log("Merge SQL smoke wrapper passed.");
