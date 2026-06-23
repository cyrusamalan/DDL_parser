"use strict";

const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

const DIALECTS = ["postgresql", "mysql", "mariadb", "sqlite", "mssql", "bigquery"];
const MSSQL_NOTE = " (sanitizer only)";

let allPassed = 0;
let allFailed = 0;

for (const dialect of DIALECTS) {
  let output;
  try {
    output = execFileSync(
      process.execPath,
      [
        "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
        "--experimental-strip-types",
        join(__dirname, `dialect-${dialect}.mts`),
      ],
      { cwd: join(__dirname, ".."), encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
    );
  } catch (err) {
    const stderr = (err && err.stderr) || "";
    const stdout = (err && err.stdout) || "";
    console.error(`[FAIL] ${dialect}: runner crashed`);
    if (stderr) console.error(stderr.trim());
    if (stdout) console.error("stdout:", stdout.trim());
    allFailed += 3;
    continue;
  }

  let parsed;
  try {
    parsed = JSON.parse(output.trim());
  } catch {
    console.error(`[FAIL] ${dialect}: could not parse runner output`);
    console.error(output);
    allFailed += 3;
    continue;
  }

  const { passed, failed, results } = parsed;
  allPassed += passed;
  allFailed += failed;

  const note = dialect === "mssql" ? MSSQL_NOTE : "";
  const marker = failed > 0 ? "FAIL" : "pass";
  console.log(`[${marker}] ${dialect}${note}: ${passed} passed, ${failed} failed`);

  if (Array.isArray(results)) {
    for (const r of results) {
      if (!r.ok) {
        console.log(`       FAIL ${r.label}:`);
        for (const e of r.errors) {
          console.log(`         - ${e}`);
        }
      }
    }
  }
}

console.log("");
if (allFailed > 0) {
  console.error(`${allFailed} dialect test(s) failed.`);
  process.exit(1);
} else {
  console.log(`All ${allPassed} dialect tests passed.`);
}
