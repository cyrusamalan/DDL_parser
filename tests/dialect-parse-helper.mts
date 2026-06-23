import pkg from "node-sql-parser";
import { walkParseTree, type ParsedSchema } from "../src/lib/ddl/ast-walker.ts";
import { inferImplicitForeignKeys } from "../src/lib/ddl/infer-implicit-fks.ts";
import { hasAlterTableForeignKey } from "../src/lib/ddl/sanitize-dialect-helpers.ts";
import type { SanitizeDdlResult } from "../src/lib/ddl/sanitize-postgres-ddl.ts";
import type { SqlDialect } from "../src/lib/types/diagram.ts";

const { Parser } = pkg;

const PARSER_MODES: Record<string, string> = {
  postgresql: "Postgresql",
  mysql: "MySQL",
  mariadb: "MariaDB",
  mssql: "Postgresql",
  sqlite: "SQLite",
  bigquery: "Postgresql",
  snowflake: "Snowflake",
  redshift: "Redshift",
  db2: "DB2",
  trino: "Trino",
  hive: "Hive",
  flink: "FlinkSQL",
};

const PG_FALLBACK = new Set([
  "mssql",
  "bigquery",
  "snowflake",
  "redshift",
  "db2",
  "trino",
  "hive",
  "flink",
]);

export function parseDialectFixture(
  sql: string,
  dialect: SqlDialect,
  sanitize: (input: string) => SanitizeDdlResult,
): ParsedSchema {
  const { sql: sanitized } = sanitize(sql);
  const parser = new Parser();
  const mode = PARSER_MODES[dialect] ?? "Postgresql";

  let ast: unknown;
  if (PG_FALLBACK.has(dialect) && mode !== "Postgresql" && hasAlterTableForeignKey(sanitized)) {
    ast = parser.astify(sanitized, { database: "Postgresql" });
  } else {
    try {
      ast = parser.astify(sanitized, { database: mode });
    } catch {
      if (!PG_FALLBACK.has(dialect)) throw new Error(`Parse failed for ${dialect}`);
      ast = parser.astify(sanitized, { database: "Postgresql" });
    }
  }

  let schema = walkParseTree(ast);
  if (dialect === "trino") {
    schema = inferImplicitForeignKeys(schema);
  }
  return schema;
}
