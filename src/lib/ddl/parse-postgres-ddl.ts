import { ddlSchemaToFlow, type FlowGraph } from "@/lib/ddl/ddl-to-flow";
import { formatParseError, walkParseTree, type ParsedSchema } from "@/lib/ddl/ast-walker";
import { inferImplicitForeignKeys } from "@/lib/ddl/infer-implicit-fks";
import { sanitizePostgresDdl, type SanitizeDdlResult } from "@/lib/ddl/sanitize-postgres-ddl";
import { sanitizeMysqlDdl } from "@/lib/ddl/sanitize-mysql-ddl";
import { sanitizeMssqlDdl } from "@/lib/ddl/sanitize-mssql-ddl";
import { sanitizeSqliteDdl } from "@/lib/ddl/sanitize-sqlite-ddl";
import { sanitizeBigQueryDdl } from "@/lib/ddl/sanitize-bigquery-ddl";
import { sanitizeSnowflakeDdl } from "@/lib/ddl/sanitize-snowflake-ddl";
import { sanitizeRedshiftDdl } from "@/lib/ddl/sanitize-redshift-ddl";
import { sanitizeDb2Ddl } from "@/lib/ddl/sanitize-db2-ddl";
import { sanitizeTrinoDdl } from "@/lib/ddl/sanitize-trino-ddl";
import { sanitizeHiveDdl } from "@/lib/ddl/sanitize-hive-ddl";
import { sanitizeFlinkDdl } from "@/lib/ddl/sanitize-flink-ddl";
import { hasAlterTableForeignKey } from "@/lib/ddl/sanitize-dialect-helpers";
import type { DiagramSettings, SqlDialect, TableFlowNode } from "@/lib/types/diagram";

export type ParseDdlResult =
  | { ok: true; schema: ParsedSchema; graph: FlowGraph; sanitizeNotes: string[] }
  | { ok: false; error: string };

const SANITIZERS: Record<SqlDialect, (sql: string) => SanitizeDdlResult> = {
  postgresql: sanitizePostgresDdl,
  mysql: sanitizeMysqlDdl,
  mariadb: sanitizeMysqlDdl,
  mssql: sanitizeMssqlDdl,
  sqlite: sanitizeSqliteDdl,
  bigquery: sanitizeBigQueryDdl,
  snowflake: sanitizeSnowflakeDdl,
  redshift: sanitizeRedshiftDdl,
  db2: sanitizeDb2Ddl,
  trino: sanitizeTrinoDdl,
  hive: sanitizeHiveDdl,
  flink: sanitizeFlinkDdl,
};

const PARSER_MODES: Record<SqlDialect, string> = {
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

const PG_FALLBACK_DIALECTS = new Set<SqlDialect>([
  "mssql",
  "bigquery",
  "snowflake",
  "redshift",
  "db2",
  "trino",
  "hive",
  "flink",
]);

function astifyWithFallback(
  parser: InstanceType<typeof import("node-sql-parser").Parser>,
  sql: string,
  dialect: SqlDialect,
): unknown {
  const mode = PARSER_MODES[dialect];
  if (
    PG_FALLBACK_DIALECTS.has(dialect) &&
    mode !== "Postgresql" &&
    hasAlterTableForeignKey(sql)
  ) {
    return parser.astify(sql, { database: "Postgresql" });
  }
  try {
    return parser.astify(sql, { database: mode });
  } catch (primaryError) {
    if (!PG_FALLBACK_DIALECTS.has(dialect) || mode === "Postgresql") {
      throw primaryError;
    }
    return parser.astify(sql, { database: "Postgresql" });
  }
}

function finalizeSchema(schema: ParsedSchema, dialect: SqlDialect): ParsedSchema {
  if (dialect === "trino") {
    return inferImplicitForeignKeys(schema);
  }
  return schema;
}

export async function parsePostgresDdl(
  ddl: string,
  existingNodes: TableFlowNode[] = [],
  settings?: DiagramSettings,
  dialect: SqlDialect = "postgresql",
): Promise<ParseDdlResult> {
  const trimmed = ddl.trim();
  if (!trimmed) {
    return { ok: false, error: "Paste at least one CREATE TABLE statement." };
  }

  const { sql: sanitizedSql, notes: sanitizeNotes } = SANITIZERS[dialect](trimmed);
  if (!sanitizedSql.trim()) {
    return {
      ok: false,
      error: "No CREATE TABLE statements found after sanitizing the pasted SQL.",
    };
  }

  try {
    const { Parser } = await import("node-sql-parser");
    const parser = new Parser();
    const ast = astifyWithFallback(parser, sanitizedSql, dialect);
    const schema = finalizeSchema(walkParseTree(ast), dialect);

    if (schema.tables.length === 0) {
      return {
        ok: false,
        error: "No CREATE TABLE statements found in the pasted SQL.",
      };
    }

    const graph = await ddlSchemaToFlow(schema, existingNodes, settings);
    return { ok: true, schema, graph, sanitizeNotes };
  } catch (error) {
    return { ok: false, error: formatParseError(error) };
  }
}
