import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "node-sql-parser";
import { sanitizeSqliteDdl } from "../src/lib/ddl/sanitize-sqlite-ddl.ts";
import { walkParseTree } from "../src/lib/ddl/ast-walker.ts";
import { assertSchema, type CaseResult } from "./test-utils.mts";

const { Parser } = pkg;
const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures", "sqlite");

function load(file: string): string {
  return readFileSync(join(fixtures, file), "utf8");
}

const parser = new Parser();
const results: CaseResult[] = [];

// 01-simple: single table, AUTOINCREMENT
{
  const { sql } = sanitizeSqliteDdl(load("01-simple.sql"));
  const schema = walkParseTree(parser.astify(sql, { database: "SQLite" }));
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

// 02-relationships: two self-refs on same table (manager_id + mentor_id), self-ref on categories,
// nullable FK (approver_id), 6 tables, 10 FKs.
{
  const { sql } = sanitizeSqliteDdl(load("02-relationships.sql"));
  const schema = walkParseTree(parser.astify(sql, { database: "SQLite" }));
  results.push(
    assertSchema("02-relationships", schema, {
      tables: [
        { name: "users", columns: [{ name: "manager_id", isForeignKey: true }, { name: "mentor_id", isForeignKey: true }] },
        { name: "categories", columns: [{ name: "parent_id", isForeignKey: true }] },
        { name: "products" },
        { name: "orders" },
        { name: "order_items" },
        { name: "addresses" },
      ],
      fks: [
        // two self-refs on users
        { fromTable: "users", fromColumn: "manager_id", toTable: "users", toColumn: "id" },
        { fromTable: "users", fromColumn: "mentor_id", toTable: "users", toColumn: "id" },
        // self-ref on categories
        { fromTable: "categories", fromColumn: "parent_id", toTable: "categories", toColumn: "id" },
        // products → two FKs to different tables + nullable FK
        { fromTable: "products", fromColumn: "category_id", toTable: "categories", toColumn: "id" },
        { fromTable: "products", fromColumn: "creator_id", toTable: "users", toColumn: "id" },
        { fromTable: "products", fromColumn: "approver_id", toTable: "users", toColumn: "id" },
        // deep chain continues
        { fromTable: "orders", fromColumn: "user_id", toTable: "users", toColumn: "id" },
        { fromTable: "order_items", fromColumn: "order_id", toTable: "orders", toColumn: "id" },
        { fromTable: "order_items", fromColumn: "product_id", toTable: "products", toColumn: "id" },
        { fromTable: "addresses", fromColumn: "user_id", toTable: "users", toColumn: "id" },
      ],
      fkCount: 10,
    }),
  );
}

// 03-complex: entries with 4 FKs including self-ref, two junction tables (one WITHOUT ROWID stripped),
// 2 self-refs, 2 CREATE INDEX stripped, 7 tables, 9 FKs.
{
  const { sql, notes } = sanitizeSqliteDdl(load("03-complex.sql"));
  const schema = walkParseTree(parser.astify(sql, { database: "SQLite" }));
  const r = assertSchema("03-complex", schema, {
    tables: [
      { name: "content" },
      { name: "content_meta" },
      { name: "catalogs" },
      { name: "entries", columns: [{ name: "parent_id", isForeignKey: true }] },
      { name: "entry_tags" },
      { name: "collections", columns: [{ name: "parent_id", isForeignKey: true }] },
      { name: "collection_entries" },
    ],
    fks: [
      // entries has 4 FKs — this is the main bug-catcher
      { fromTable: "entries", fromColumn: "catalog_id", toTable: "catalogs", toColumn: "id" },
      { fromTable: "entries", fromColumn: "meta_id", toTable: "content_meta", toColumn: "id" },
      { fromTable: "entries", fromColumn: "content_id", toTable: "content", toColumn: "id" },
      { fromTable: "entries", fromColumn: "parent_id", toTable: "entries", toColumn: "id" },
      // junction tables
      { fromTable: "entry_tags", fromColumn: "entry_id", toTable: "entries", toColumn: "id" },
      // self-ref on collections
      { fromTable: "collections", fromColumn: "parent_id", toTable: "collections", toColumn: "id" },
      { fromTable: "collection_entries", fromColumn: "collection_id", toTable: "collections", toColumn: "id" },
      { fromTable: "collection_entries", fromColumn: "entry_id", toTable: "entries", toColumn: "id" },
    ],
    fkCount: 9,
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
