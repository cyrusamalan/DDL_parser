import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "node-sql-parser";
import { sanitizeBigQueryDdl } from "../src/lib/ddl/sanitize-bigquery-ddl.ts";
import { walkParseTree } from "../src/lib/ddl/ast-walker.ts";
import { assertSchema, type CaseResult } from "./test-utils.mts";

const { Parser } = pkg;
const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures", "bigquery");

function load(file: string): string {
  return readFileSync(join(fixtures, file), "utf8");
}

const parser = new Parser();
const results: CaseResult[] = [];

// 01-simple: multi-part backtick name resolved, INT64/STRING/BOOL/FLOAT64/DATETIME converted
{
  const { sql, notes } = sanitizeBigQueryDdl(load("01-simple.sql"));
  const schema = walkParseTree(parser.astify(sql, { database: "Postgresql" }));
  const r = assertSchema("01-simple", schema, {
    tables: [
      {
        name: "users",
        columns: [
          { name: "id" },
          { name: "email" },
          { name: "is_active" },
          { name: "score" },
          { name: "created_at" },
        ],
      },
    ],
    fks: [],
    fkCount: 0,
  });
  if (!notes.some((n) => /resolved/i.test(n))) {
    r.errors.push("Expected sanitize notes to mention resolved multi-part names");
    r.ok = false;
  }
  if (!notes.some((n) => /converted/i.test(n))) {
    r.errors.push("Expected sanitize notes to mention type conversions");
    r.ok = false;
  }
  results.push(r);
}

// 02-relationships: self-ref on departments (inline column REFERENCES), self-ref on employees
// (table-level CONSTRAINT), FK columns NOT named 'id', hyphenated project name, 3 tables, 5 FKs.
{
  const { sql } = sanitizeBigQueryDdl(load("02-relationships.sql"));
  const schema = walkParseTree(parser.astify(sql, { database: "Postgresql" }));
  results.push(
    assertSchema("02-relationships", schema, {
      tables: [
        { name: "departments", columns: [{ name: "parent_dept_id", isForeignKey: true }] },
        { name: "employees", columns: [{ name: "department_id", isForeignKey: true }, { name: "manager_id", isForeignKey: true }] },
        { name: "projects" },
      ],
      fks: [
        // self-ref: FK column target is department_id, not id
        { fromTable: "departments", fromColumn: "parent_dept_id", toTable: "departments", toColumn: "department_id" },
        // self-ref: FK column target is employee_id, not id
        { fromTable: "employees", fromColumn: "manager_id", toTable: "employees", toColumn: "employee_id" },
        { fromTable: "employees", fromColumn: "department_id", toTable: "departments", toColumn: "department_id" },
        { fromTable: "projects", fromColumn: "lead_employee_id", toTable: "employees", toColumn: "employee_id" },
        { fromTable: "projects", fromColumn: "dept_id", toTable: "departments", toColumn: "department_id" },
      ],
      fkCount: 5,
    }),
  );
}

// 03-complex: ARRAY<STRUCT<>>, nested STRUCTs→TEXT, GEOGRAPHY, BIGNUMERIC, JSON→JSONB,
// FK deduplication (inline fk_event_parent + ALTER TABLE fk_event_parent_dup = 1 FK),
// FK columns named type_id/session_id/event_id/agg_id (not 'id'), 4 tables, 5 FKs after dedup.
{
  const { sql, notes } = sanitizeBigQueryDdl(load("03-complex.sql"));
  const schema = walkParseTree(parser.astify(sql, { database: "Postgresql" }));
  const r = assertSchema("03-complex", schema, {
    tables: [
      { name: "event_types", columns: [{ name: "parent_type_id", isForeignKey: true }] },
      { name: "sessions" },
      { name: "events", columns: [{ name: "parent_event_id", isForeignKey: true }] },
      { name: "aggregates" },
    ],
    fks: [
      // self-ref on event_types
      { fromTable: "event_types", fromColumn: "parent_type_id", toTable: "event_types", toColumn: "type_id" },
      // self-ref on events (deduplicated from inline + ALTER TABLE)
      { fromTable: "events", fromColumn: "parent_event_id", toTable: "events", toColumn: "event_id" },
      // FK target columns are not named 'id'
      { fromTable: "events", fromColumn: "session_id", toTable: "sessions", toColumn: "session_id" },
      { fromTable: "events", fromColumn: "type_id", toTable: "event_types", toColumn: "type_id" },
      { fromTable: "aggregates", fromColumn: "event_type_id", toTable: "event_types", toColumn: "type_id" },
    ],
    fkCount: 5,
  });
  if (!notes.some((n) => /struct|array/i.test(n))) {
    r.errors.push("Expected sanitize notes to mention STRUCT/ARRAY simplification");
    r.ok = false;
  }
  if (!notes.some((n) => /converted/i.test(n))) {
    r.errors.push("Expected sanitize notes to mention type conversions");
    r.ok = false;
  }
  results.push(r);
}

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok).length;
console.log(JSON.stringify({ passed, failed, results }));
