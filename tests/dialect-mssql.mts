import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeMssqlDdl } from "../src/lib/ddl/sanitize-mssql-ddl.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures", "mssql");

function load(file: string): string {
  return readFileSync(join(fixtures, file), "utf8");
}

type CaseResult = { label: string; ok: boolean; errors: string[] };

function checkSql(
  label: string,
  sql: string,
  checks: Array<(s: string) => string | null>,
): CaseResult {
  const errors: string[] = [];
  for (const check of checks) {
    const err = check(sql);
    if (err) errors.push(err);
  }
  return { label, ok: errors.length === 0, errors };
}

const results: CaseResult[] = [];

// 01-simple: GO stripped, CREATE TABLE kept, ON [PRIMARY] stripped
{
  const { sql } = sanitizeMssqlDdl(load("01-simple.sql"));
  results.push(
    checkSql("01-simple", sql, [
      (s) => (/\bCREATE\s+TABLE\b/i.test(s) ? null : "CREATE TABLE missing from output"),
      (s) => (/\bGO\b/im.test(s) ? "GO should be stripped" : null),
      (s) => (/ON\s+\[PRIMARY\]/i.test(s) ? "ON [PRIMARY] should be stripped" : null),
    ]),
  );
}

// 02-relationships: reserved-word tables (user/group/order), self-ref FK,
// 3 CREATE TABLE kept, 3 CREATE INDEX stripped, 5 FOREIGN KEY kept, no GO, no ON [PRIMARY].
{
  const { sql } = sanitizeMssqlDdl(load("02-relationships.sql"));
  const tableCount = (sql.match(/\bCREATE\s+TABLE\b/gi) ?? []).length;
  const fkCount = (sql.match(/\bFOREIGN\s+KEY\b/gi) ?? []).length;
  results.push(
    checkSql("02-relationships", sql, [
      () => (tableCount === 3 ? null : `Expected 3 CREATE TABLE statements, got ${tableCount}`),
      (s) =>
        /\bCREATE\s+(?:NONCLUSTERED\s+)?INDEX\b/i.test(s)
          ? "CREATE INDEX should be stripped"
          : null,
      () => (fkCount === 5 ? null : `Expected 5 FOREIGN KEY constraints, got ${fkCount}`),
      (s) => (/\bGO\b/im.test(s) ? "GO should be stripped" : null),
      (s) => (/ON\s+\[PRIMARY\]/i.test(s) ? "ON [PRIMARY] should be stripped" : null),
    ]),
  );
}

// 03-complex: USE/SET statements stripped, CREATE VIEW/PROCEDURE stripped,
// 4 CREATE TABLE kept, 3 CREATE INDEX stripped, 8 FOREIGN KEY kept, no GO, no ON [PRIMARY].
{
  const { sql } = sanitizeMssqlDdl(load("03-complex.sql"));
  const tableCount = (sql.match(/\bCREATE\s+TABLE\b/gi) ?? []).length;
  const fkCount = (sql.match(/\bFOREIGN\s+KEY\b/gi) ?? []).length;
  results.push(
    checkSql("03-complex", sql, [
      (s) => (/\bUSE\b/i.test(s) ? "USE statement should be stripped" : null),
      (s) => (/\bSET\s+ANSI_NULLS\b/i.test(s) ? "SET ANSI_NULLS should be stripped" : null),
      (s) => (/\bCREATE\s+VIEW\b/i.test(s) ? "CREATE VIEW should be stripped" : null),
      (s) => (/\bCREATE\s+PROCEDURE\b/i.test(s) ? "CREATE PROCEDURE should be stripped" : null),
      () => (tableCount === 4 ? null : `Expected 4 CREATE TABLE statements, got ${tableCount}`),
      (s) =>
        /\bCREATE\s+(?:NONCLUSTERED\s+)?INDEX\b/i.test(s)
          ? "CREATE INDEX should be stripped"
          : null,
      () => (fkCount === 8 ? null : `Expected 8 FOREIGN KEY constraints, got ${fkCount}`),
      (s) => (/\bGO\b/im.test(s) ? "GO should be stripped" : null),
      (s) => (/ON\s+\[PRIMARY\]/i.test(s) ? "ON [PRIMARY] should be stripped" : null),
    ]),
  );
}

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
console.log(JSON.stringify({ passed, failed, results }));
