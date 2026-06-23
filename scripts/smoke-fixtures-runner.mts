import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "node-sql-parser";
import { sanitizePostgresDdl } from "../src/lib/ddl/sanitize-postgres-ddl.ts";
import { walkParseTree } from "../src/lib/ddl/ast-walker.ts";

const { Parser } = pkg;
const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "fixtures");

type FixtureSpec = {
  file: string;
  minTables?: number;
  minForeignKeys?: number;
  maxParseMs?: number;
  assert?: (ctx: {
    sanitizedSql: string;
    notes: string[];
    tableCount: number;
    foreignKeyCount: number;
  }) => void;
};

const FIXTURES: FixtureSpec[] = [
  {
    file: "migration-sample.sql",
    minTables: 5,
    minForeignKeys: 4,
  },
  {
    file: "stockvisionz-sample.sql",
    minTables: 4,
    assert: ({ sanitizedSql }) => {
      if (/public\.\w+_enum/i.test(sanitizedSql)) {
        throw new Error("schema-qualified enum column not replaced");
      }
      if (/\baccount\.order\b/i.test(sanitizedSql) && !/account\."order"/i.test(sanitizedSql)) {
        throw new Error("reserved table name order not quoted");
      }
    },
  },
  {
    file: "meetoura-edge-cases.sql",
    minTables: 5,
    assert: ({ tableCount }) => {
      if (tableCount !== 5) {
        throw new Error(`expected 5 tables, got ${tableCount}`);
      }
    },
  },
  {
    file: "ddl-stress-syntax.sql",
    minTables: 8,
    assert: ({ sanitizedSql, notes }) => {
      if (!notes.some((note) => /removed/i.test(note))) {
        throw new Error("expected sanitize notes about removed statements");
      }
      if (/CREATE\s+INDEX/i.test(sanitizedSql)) {
        throw new Error("CREATE INDEX should be stripped");
      }
      if (!/CREATE TABLE "group"/i.test(sanitizedSql) && !/CREATE TABLE group/i.test(sanitizedSql)) {
        throw new Error("group table missing from sanitized SQL");
      }
      if (/\baccount\.order\b/i.test(sanitizedSql) || /\bbilling\.order\b/i.test(sanitizedSql)) {
        if (!/billing\."order"/i.test(sanitizedSql)) {
          throw new Error("billing.order should be quoted as billing.\"order\"");
        }
      }
    },
  },
  {
    file: "ddl-stress-alter-fks.sql",
    minTables: 10,
    minForeignKeys: 10,
    assert: ({ sanitizedSql }) => {
      if (!/ALTER\s+TABLE/i.test(sanitizedSql)) {
        throw new Error("expected ALTER TABLE FK statements in sanitized SQL");
      }
    },
  },
  {
    file: "ddl-stress-large-graph.sql",
    minTables: 35,
    minForeignKeys: 25,
    maxParseMs: 5000,
  },
];

function loadFixture(file: string): string {
  return readFileSync(join(fixturesDir, file), "utf8");
}

const parser = new Parser();
const results: Array<{
  file: string;
  tables: number;
  foreignKeys: number;
  notes: string[];
  parseMs: number;
}> = [];

for (const spec of FIXTURES) {
  const ddl = loadFixture(spec.file);
  const { sql: sanitizedSql, notes } = sanitizePostgresDdl(ddl);

  const parseStart = performance.now();
  const ast = parser.astify(sanitizedSql, { database: "Postgresql" });
  const parseMs = performance.now() - parseStart;

  const schema = walkParseTree(ast);
  const tableCount = schema.tables.length;
  const foreignKeyCount = schema.foreignKeys.length;

  if (spec.minTables !== undefined && tableCount < spec.minTables) {
    throw new Error(
      `${spec.file}: expected >= ${spec.minTables} tables, got ${tableCount}`,
    );
  }

  if (spec.minForeignKeys !== undefined && foreignKeyCount < spec.minForeignKeys) {
    throw new Error(
      `${spec.file}: expected >= ${spec.minForeignKeys} foreign keys, got ${foreignKeyCount}`,
    );
  }

  if (spec.maxParseMs !== undefined && parseMs > spec.maxParseMs) {
    throw new Error(
      `${spec.file}: parse took ${parseMs.toFixed(0)}ms (max ${spec.maxParseMs}ms)`,
    );
  }

  spec.assert?.({
    sanitizedSql,
    notes,
    tableCount,
    foreignKeyCount,
  });

  results.push({
    file: spec.file,
    tables: tableCount,
    foreignKeys: foreignKeyCount,
    notes,
    parseMs: Math.round(parseMs),
  });
}

console.log(JSON.stringify({ passed: results.length, results }, null, 2));
