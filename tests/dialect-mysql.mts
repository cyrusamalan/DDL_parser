import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "node-sql-parser";
import { sanitizeMysqlDdl } from "../src/lib/ddl/sanitize-mysql-ddl.ts";
import { walkParseTree } from "../src/lib/ddl/ast-walker.ts";
import { assertSchema, type CaseResult } from "./test-utils.mts";

const { Parser } = pkg;
const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures", "mysql");

function load(file: string): string {
  return readFileSync(join(fixtures, file), "utf8");
}

const parser = new Parser();
const results: CaseResult[] = [];

// 01-simple: backtick identifiers, ENGINE= stripped, table-level PRIMARY KEY
{
  const { sql } = sanitizeMysqlDdl(load("01-simple.sql"));
  const schema = walkParseTree(parser.astify(sql, { database: "MySQL" }));
  results.push(
    assertSchema("01-simple", schema, {
      tables: [
        {
          name: "users",
          columns: [
            { name: "id", isPrimaryKey: true },
            { name: "email" },
            { name: "name" },
            { name: "created_at" },
          ],
        },
      ],
      fks: [],
      fkCount: 0,
    }),
  );
}

// 02-relationships: reserved-word table names (user/group/order), self-ref,
// multiple FKs from one table to same target, 5 tables, 8 FKs via inline REFERENCES.
{
  const { sql } = sanitizeMysqlDdl(load("02-relationships.sql"));
  const schema = walkParseTree(parser.astify(sql, { database: "MySQL" }));
  results.push(
    assertSchema("02-relationships", schema, {
      tables: [
        { name: "user", columns: [{ name: "parent_id", isForeignKey: true }] },
        { name: "group", columns: [{ name: "owner_id", isForeignKey: true }, { name: "created_by", isForeignKey: true }] },
        { name: "group_member" },
        { name: "order" },
        { name: "order_item" },
      ],
      fks: [
        // self-ref
        { fromTable: "user", fromColumn: "parent_id", toTable: "user", toColumn: "id" },
        // two FKs from group to user
        { fromTable: "group", fromColumn: "owner_id", toTable: "user", toColumn: "id" },
        { fromTable: "group", fromColumn: "created_by", toTable: "user", toColumn: "id" },
        // junction table
        { fromTable: "group_member", fromColumn: "group_id", toTable: "group", toColumn: "id" },
        { fromTable: "group_member", fromColumn: "user_id", toTable: "user", toColumn: "id" },
        // chain continues
        { fromTable: "order", fromColumn: "user_id", toTable: "user", toColumn: "id" },
        { fromTable: "order", fromColumn: "group_id", toTable: "group", toColumn: "id" },
        { fromTable: "order_item", fromColumn: "order_id", toTable: "order", toColumn: "id" },
      ],
      fkCount: 8,
    }),
  );
}

// 03-complex: 4 self-refs, multiple FKs from item+comment to account,
// junction table with 3 FKs, ENUM+JSON columns, 3 CREATE INDEX stripped, 6 tables, 12 FKs.
{
  const { sql, notes } = sanitizeMysqlDdl(load("03-complex.sql"));
  const schema = walkParseTree(parser.astify(sql, { database: "MySQL" }));
  const r = assertSchema("03-complex", schema, {
    tables: [
      { name: "account", columns: [{ name: "parent_id", isForeignKey: true }] },
      { name: "category", columns: [{ name: "parent_id", isForeignKey: true }] },
      { name: "item", columns: [{ name: "parent_id", isForeignKey: true }] },
      { name: "comment", columns: [{ name: "parent_id", isForeignKey: true }] },
      { name: "tag" },
      { name: "item_tag" },
    ],
    fks: [
      // 4 self-refs
      { fromTable: "account", fromColumn: "parent_id", toTable: "account", toColumn: "id" },
      { fromTable: "category", fromColumn: "parent_id", toTable: "category", toColumn: "id" },
      { fromTable: "item", fromColumn: "parent_id", toTable: "item", toColumn: "id" },
      { fromTable: "comment", fromColumn: "parent_id", toTable: "comment", toColumn: "id" },
      // two FKs from item to account
      { fromTable: "item", fromColumn: "created_by", toTable: "account", toColumn: "id" },
      { fromTable: "item", fromColumn: "approved_by", toTable: "account", toColumn: "id" },
      // junction table FKs
      { fromTable: "item_tag", fromColumn: "item_id", toTable: "item", toColumn: "id" },
      { fromTable: "item_tag", fromColumn: "tag_id", toTable: "tag", toColumn: "id" },
      { fromTable: "item_tag", fromColumn: "added_by", toTable: "account", toColumn: "id" },
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
