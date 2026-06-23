import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "node-sql-parser";
import { sanitizePostgresDdl } from "../src/lib/ddl/sanitize-postgres-ddl.ts";
import { walkParseTree } from "../src/lib/ddl/ast-walker.ts";
import { assertSchema, type CaseResult } from "./test-utils.mts";

const { Parser } = pkg;
const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures", "postgresql");

function load(file: string): string {
  return readFileSync(join(fixtures, file), "utf8");
}

const parser = new Parser();
const results: CaseResult[] = [];

// 01-simple: single table, basic column types
{
  const { sql } = sanitizePostgresDdl(load("01-simple.sql"));
  const schema = walkParseTree(parser.astify(sql, { database: "Postgresql" }));
  results.push(
    assertSchema("01-simple", schema, {
      tables: [
        {
          name: "users",
          columns: [
            { name: "id", isPrimaryKey: true },
            { name: "email" },
            { name: "created_at" },
            { name: "is_active" },
          ],
        },
      ],
      fks: [],
      fkCount: 0,
    }),
  );
}

// 02-relationships: self-ref, multiple FKs to same target, composite-PK junction,
// forward-ref via ALTER TABLE, ENUM type stripped, 5 tables, 8 FKs.
{
  const { sql } = sanitizePostgresDdl(load("02-relationships.sql"));
  const schema = walkParseTree(parser.astify(sql, { database: "Postgresql" }));
  results.push(
    assertSchema("02-relationships", schema, {
      tables: [
        { name: "accounts", columns: [{ name: "parent_id", isForeignKey: true }] },
        { name: "groups", columns: [{ name: "owner_id", isForeignKey: true }, { name: "created_by", isForeignKey: true }] },
        { name: "memberships" },
        { name: "audit_log" },
        { name: "orders" },
      ],
      fks: [
        // self-referential
        { fromTable: "accounts", fromColumn: "parent_id", toTable: "accounts", toColumn: "id" },
        // two FKs from groups to accounts
        { fromTable: "groups", fromColumn: "owner_id", toTable: "accounts", toColumn: "id" },
        { fromTable: "groups", fromColumn: "created_by", toTable: "accounts", toColumn: "id" },
        // junction table
        { fromTable: "memberships", fromColumn: "group_id", toTable: "groups", toColumn: "id" },
        { fromTable: "memberships", fromColumn: "account_id", toTable: "accounts", toColumn: "id" },
        // orders with two FKs
        { fromTable: "orders", fromColumn: "account_id", toTable: "accounts", toColumn: "id" },
        { fromTable: "orders", fromColumn: "group_id", toTable: "groups", toColumn: "id" },
        // forward-ref via ALTER TABLE
        { fromTable: "audit_log", fromColumn: "account_id", toTable: "accounts", toColumn: "id" },
      ],
      fkCount: 8,
    }),
  );
}

// 03-complex: 5-level chain, 3 self-refs, ALTER TABLE forward-ref, multiple FKs
// from one table to same target, UUID PKs, ENUM types stripped, INDEX+DROP removed.
{
  const { sql, notes } = sanitizePostgresDdl(load("03-complex.sql"));
  const schema = walkParseTree(parser.astify(sql, { database: "Postgresql" }));
  const r = assertSchema("03-complex", schema, {
    tables: [
      { name: "organizations", columns: [{ name: "parent_org_id", isForeignKey: true }] },
      { name: "teams" },
      { name: "users", columns: [{ name: "manager_id", isForeignKey: true }] },
      { name: "projects" },
      { name: "tasks", columns: [{ name: "parent_task_id", isForeignKey: true }] },
    ],
    fks: [
      // 3 self-refs
      { fromTable: "organizations", fromColumn: "parent_org_id", toTable: "organizations", toColumn: "id" },
      { fromTable: "users", fromColumn: "manager_id", toTable: "users", toColumn: "id" },
      { fromTable: "tasks", fromColumn: "parent_task_id", toTable: "tasks", toColumn: "id" },
      // forward-ref ALTER TABLE
      { fromTable: "teams", fromColumn: "lead_user_id", toTable: "users", toColumn: "id" },
      // two FKs from projects to users
      { fromTable: "projects", fromColumn: "owner_id", toTable: "users", toColumn: "id" },
      { fromTable: "projects", fromColumn: "reviewer_id", toTable: "users", toColumn: "id" },
      // two FKs from tasks to users
      { fromTable: "tasks", fromColumn: "assignee_id", toTable: "users", toColumn: "id" },
      { fromTable: "tasks", fromColumn: "reporter_id", toTable: "users", toColumn: "id" },
    ],
    fkCount: 13,
  });
  if (!notes.some((n) => /removed/i.test(n))) {
    r.errors.push("Expected sanitize notes to mention removed statements (INDEX/DROP)");
    r.ok = false;
  }
  results.push(r);
}

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
console.log(JSON.stringify({ passed, failed, results }));
