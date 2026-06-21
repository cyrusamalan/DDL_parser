const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

execFileSync(
  process.execPath,
  ["--experimental-strip-types", join(__dirname, "smoke-meetoura-runner.mts")],
  { cwd: join(__dirname, ".."), encoding: "utf8", stdio: "inherit" },
);

console.log("MeetOura edge-case parse test passed.");
