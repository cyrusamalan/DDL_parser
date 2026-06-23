import { ddlSchemaToFlow, type FlowGraph } from "@/lib/ddl/ddl-to-flow";
import { formatParseError, walkParseTree, type ParsedSchema } from "@/lib/ddl/ast-walker";
import { sanitizePostgresDdl, type SanitizeDdlResult } from "@/lib/ddl/sanitize-postgres-ddl";
import { sanitizeMysqlDdl } from "@/lib/ddl/sanitize-mysql-ddl";
import { sanitizeMssqlDdl } from "@/lib/ddl/sanitize-mssql-ddl";
import { sanitizeSqliteDdl } from "@/lib/ddl/sanitize-sqlite-ddl";
import { sanitizeBigQueryDdl } from "@/lib/ddl/sanitize-bigquery-ddl";
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
};

const PARSER_MODES: Record<SqlDialect, string> = {
  postgresql: "Postgresql",
  mysql: "MySQL",
  mariadb: "MariaDB",
  mssql: "Postgresql",
  sqlite: "SQLite",
  bigquery: "Postgresql",
};

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
    const ast = parser.astify(sanitizedSql, { database: PARSER_MODES[dialect] });
    const schema = walkParseTree(ast);

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
