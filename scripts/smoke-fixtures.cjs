const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

const output = execFileSync(
  process.execPath,
  ["--experimental-strip-types", join(__dirname, "smoke-fixtures-runner.mts")],
  { cwd: join(__dirname, ".."), encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
);

const { passed, results } = JSON.parse(output.trim());
if (!passed || passed < 6) {
  throw new Error(`expected 6 fixtures to pass, got ${passed}`);
}

console.log("DDL fixtures smoke test passed.");
for (const result of results) {
  console.log(
    `  ${result.file}: ${result.tables} tables, ${result.foreignKeys} FKs, ${result.parseMs}ms`,
  );
}
