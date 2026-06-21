import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "node-sql-parser";
import { sanitizePostgresDdl, splitSqlStatements } from "../src/lib/ddl/sanitize-postgres-ddl.ts";

const { Parser } = pkg;
const here = dirname(fileURLToPath(import.meta.url));

const split = splitSqlStatements(`
CREATE TABLE a (id int);
-- trailing comment
CREATE TABLE b (id int);
`);
if (split.length !== 2) {
  throw new Error("splitSqlStatements failed");
}

const migrationSample = readFileSync(
  join(here, "fixtures", "migration-sample.sql"),
  "utf8",
);

const { sql: sanitized, notes } = sanitizePostgresDdl(migrationSample);
if (notes.length < 3) throw new Error("expected multiple sanitize notes");
if (/CREATE OR REPLACE FUNCTION/i.test(sanitized)) throw new Error("function not removed");
if (/CREATE INDEX/i.test(sanitized)) throw new Error("index not removed");
if (/DROP TABLE/i.test(sanitized)) throw new Error("drop not removed");
if (!/CREATE TABLE users/i.test(sanitized)) throw new Error("users table missing");
if (/\bonboarding_step onboarding_step\b/i.test(sanitized)) {
  throw new Error("enum column not replaced");
}
if (/\bsignal_type\[\]/i.test(sanitized)) throw new Error("enum array not replaced");
if (/\bUUID\[\]/i.test(sanitized)) throw new Error("uuid array not replaced");
if (/\bJSONB\[\]/i.test(sanitized)) throw new Error("jsonb array not replaced");
if (/UNIQUE NULLS NOT DISTINCT/i.test(sanitized)) {
  throw new Error("unique nulls not normalized");
}

const parser = new Parser();
const ast = parser.astify(sanitized, { database: "Postgresql" });
if (!Array.isArray(ast) || ast.length < 5) {
  throw new Error("parser returned too few statements");
}

const stockvisionzSample = readFileSync(
  join(here, "fixtures", "stockvisionz-sample.sql"),
  "utf8",
);
const stockvisionz = sanitizePostgresDdl(stockvisionzSample);
if (/public\.\w+_enum/i.test(stockvisionz.sql)) {
  throw new Error("schema-qualified enum column not replaced");
}
if (/\baccount\.order\b/i.test(stockvisionz.sql) && !/account\."order"/i.test(stockvisionz.sql)) {
  throw new Error("reserved table name order not quoted");
}
parser.astify(stockvisionz.sql, { database: "Postgresql" });

console.log(JSON.stringify({ notes }));
