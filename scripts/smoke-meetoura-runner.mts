import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "node-sql-parser";
import { walkParseTree } from "../src/lib/ddl/ast-walker.ts";
import { sanitizePostgresDdl } from "../src/lib/ddl/sanitize-postgres-ddl.ts";

const here = dirname(fileURLToPath(import.meta.url));
const ddl = readFileSync(join(here, "fixtures", "meetoura-edge-cases.sql"), "utf8");
const { sql, notes } = sanitizePostgresDdl(ddl);
const { Parser } = pkg;
const parser = new Parser();
const ast = parser.astify(sql, { database: "Postgresql" });
const schema = walkParseTree(ast);

if (schema.tables.length !== 5) {
  throw new Error(`expected 5 tables, got ${schema.tables.length}`);
}

console.log(
  JSON.stringify({
    tables: schema.tables.map((table) => table.name).sort(),
    notes,
    fks: schema.foreignKeys.length,
  }),
);
