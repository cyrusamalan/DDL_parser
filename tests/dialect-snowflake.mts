import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeSnowflakeDdl } from "../src/lib/ddl/sanitize-snowflake-ddl.ts";
import { parseDialectFixture } from "./dialect-parse-helper.mts";
import { assertSchema, type CaseResult } from "./test-utils.mts";

const RELATIONSHIP_FKS = [
  { fromTable: "accounts", fromColumn: "parent_id", toTable: "accounts", toColumn: "account_id" },
  { fromTable: "groups", fromColumn: "owner_id", toTable: "accounts", toColumn: "account_id" },
  { fromTable: "groups", fromColumn: "created_by", toTable: "accounts", toColumn: "account_id" },
  { fromTable: "memberships", fromColumn: "group_id", toTable: "groups", toColumn: "group_id" },
  { fromTable: "memberships", fromColumn: "account_id", toTable: "accounts", toColumn: "account_id" },
  { fromTable: "orders", fromColumn: "account_id", toTable: "accounts", toColumn: "account_id" },
  { fromTable: "orders", fromColumn: "group_id", toTable: "groups", toColumn: "group_id" },
  { fromTable: "audit_log", fromColumn: "account_id", toTable: "accounts", toColumn: "account_id" },
];

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures", "snowflake");

function load(file: string): string {
  return readFileSync(join(fixtures, file), "utf8");
}

const results: CaseResult[] = [];

{
  const schema = parseDialectFixture(load("01-simple.sql"), "snowflake", sanitizeSnowflakeDdl);
  results.push(
    assertSchema("01-simple", schema, {
      tables: [{ name: "users", columns: [{ name: "user_id" }, { name: "email" }] }],
      fkCount: 0,
    }),
  );
}

{
  const { notes } = sanitizeSnowflakeDdl(load("02-relationships.sql"));
  const schema = parseDialectFixture(load("02-relationships.sql"), "snowflake", sanitizeSnowflakeDdl);
  const r = assertSchema("02-relationships", schema, {
    tables: [
      { name: "accounts" },
      { name: "groups" },
      { name: "memberships" },
      { name: "audit_log" },
      { name: "orders" },
    ],
    fks: RELATIONSHIP_FKS,
    fkCount: 8,
  });
  if (!notes.some((n) => /snowflake|converted|removed/i.test(n))) {
    r.errors.push("Expected sanitize notes");
    r.ok = false;
  }
  results.push(r);
}

{
  const schema = parseDialectFixture(load("03-complex.sql"), "snowflake", sanitizeSnowflakeDdl);
  results.push(
    assertSchema("03-complex", schema, {
      tables: [
        { name: "organizations" },
        { name: "teams" },
        { name: "users" },
        { name: "projects" },
        { name: "tasks" },
      ],
      fkCount: 13,
    }),
  );
}

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
console.log(JSON.stringify({ passed, failed, results }));
