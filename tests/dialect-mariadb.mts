import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "node-sql-parser";
import { sanitizeMysqlDdl } from "../src/lib/ddl/sanitize-mysql-ddl.ts";
import { walkParseTree } from "../src/lib/ddl/ast-walker.ts";
import { assertSchema, type CaseResult } from "./test-utils.mts";

const { Parser } = pkg;
const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures", "mariadb");

function load(file: string): string {
  return readFileSync(join(fixtures, file), "utf8");
}

const parser = new Parser();
const results: CaseResult[] = [];

// 01-simple: single table, ENGINE=InnoDB stripped
{
  const { sql } = sanitizeMysqlDdl(load("01-simple.sql"));
  const schema = walkParseTree(parser.astify(sql, { database: "MariaDB" }));
  results.push(
    assertSchema("01-simple", schema, {
      tables: [
        {
          name: "employees",
          columns: [
            { name: "id", isPrimaryKey: true },
            { name: "first_name" },
            { name: "last_name" },
            { name: "hire_date" },
          ],
        },
      ],
      fks: [],
      fkCount: 0,
    }),
  );
}

// 02-relationships: 4 self-refs (one per table!), deep chain user→project→task→comment,
// multiple FKs from task to user, 4 tables, 11 FKs via inline REFERENCES.
{
  const { sql } = sanitizeMysqlDdl(load("02-relationships.sql"));
  const schema = walkParseTree(parser.astify(sql, { database: "MariaDB" }));
  results.push(
    assertSchema("02-relationships", schema, {
      tables: [
        { name: "user", columns: [{ name: "manager_id", isForeignKey: true }] },
        { name: "project", columns: [{ name: "parent_id", isForeignKey: true }] },
        { name: "task", columns: [{ name: "parent_task_id", isForeignKey: true }] },
        { name: "comment", columns: [{ name: "parent_comment_id", isForeignKey: true }] },
      ],
      fks: [
        // 4 self-refs
        { fromTable: "user", fromColumn: "manager_id", toTable: "user", toColumn: "id" },
        { fromTable: "project", fromColumn: "parent_id", toTable: "project", toColumn: "id" },
        { fromTable: "task", fromColumn: "parent_task_id", toTable: "task", toColumn: "id" },
        { fromTable: "comment", fromColumn: "parent_comment_id", toTable: "comment", toColumn: "id" },
        // two FKs from project to user
        { fromTable: "project", fromColumn: "lead_id", toTable: "user", toColumn: "id" },
        { fromTable: "project", fromColumn: "reviewer_id", toTable: "user", toColumn: "id" },
        // two FKs from task to user
        { fromTable: "task", fromColumn: "assigned_to", toTable: "user", toColumn: "id" },
        { fromTable: "task", fromColumn: "created_by", toTable: "user", toColumn: "id" },
      ],
      fkCount: 11,
    }),
  );
}

// 03-complex: 4 self-refs, 5-level chain, ENUM+JSON, multiple FKs from permission
// to resource+role+account, 2 CREATE INDEX stripped, 5 tables, 12 FKs.
{
  const { sql, notes } = sanitizeMysqlDdl(load("03-complex.sql"));
  const schema = walkParseTree(parser.astify(sql, { database: "MariaDB" }));
  const r = assertSchema("03-complex", schema, {
    tables: [
      { name: "tenant", columns: [{ name: "parent_id", isForeignKey: true }] },
      { name: "role", columns: [{ name: "parent_role_id", isForeignKey: true }] },
      { name: "account", columns: [{ name: "created_by", isForeignKey: true }] },
      { name: "resource", columns: [{ name: "parent_id", isForeignKey: true }] },
      { name: "permission" },
    ],
    fks: [
      // 4 self-refs
      { fromTable: "tenant", fromColumn: "parent_id", toTable: "tenant", toColumn: "id" },
      { fromTable: "role", fromColumn: "parent_role_id", toTable: "role", toColumn: "id" },
      { fromTable: "account", fromColumn: "created_by", toTable: "account", toColumn: "id" },
      { fromTable: "resource", fromColumn: "parent_id", toTable: "resource", toColumn: "id" },
      // cross-table chain
      { fromTable: "account", fromColumn: "tenant_id", toTable: "tenant", toColumn: "id" },
      { fromTable: "account", fromColumn: "role_id", toTable: "role", toColumn: "id" },
      { fromTable: "resource", fromColumn: "owner_id", toTable: "account", toColumn: "id" },
      // permission has 3 FKs to different tables
      { fromTable: "permission", fromColumn: "resource_id", toTable: "resource", toColumn: "id" },
      { fromTable: "permission", fromColumn: "role_id", toTable: "role", toColumn: "id" },
      { fromTable: "permission", fromColumn: "granted_by", toTable: "account", toColumn: "id" },
    ],
    fkCount: 12,
  });
  if (!notes.some((n) => /removed/i.test(n))) {
    r.errors.push("Expected sanitize notes to mention removed statements (CREATE INDEX)");
    r.ok = false;
  }
  results.push(r);
}

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
console.log(JSON.stringify({ passed, failed, results }));
