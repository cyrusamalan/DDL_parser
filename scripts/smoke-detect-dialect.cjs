"use strict";

const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

execFileSync(
  process.execPath,
  [
    "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
    "--experimental-strip-types",
    join(__dirname, "smoke-detect-dialect-runner.mts"),
  ],
  { cwd: join(__dirname, ".."), stdio: "inherit" },
);
