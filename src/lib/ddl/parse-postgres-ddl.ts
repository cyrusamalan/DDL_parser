import { ddlSchemaToFlow, type FlowGraph } from "@/lib/ddl/ddl-to-flow";
import { formatParseError, walkParseTree, type ParsedSchema } from "@/lib/ddl/ast-walker";
import { sanitizePostgresDdl } from "@/lib/ddl/sanitize-postgres-ddl";
import type { DiagramSettings, TableFlowNode } from "@/lib/types/diagram";

export type ParseDdlResult =
  | { ok: true; schema: ParsedSchema; graph: FlowGraph; sanitizeNotes: string[] }
  | { ok: false; error: string };

export async function parsePostgresDdl(
  ddl: string,
  existingNodes: TableFlowNode[] = [],
  settings?: DiagramSettings,
): Promise<ParseDdlResult> {
  const trimmed = ddl.trim();
  if (!trimmed) {
    return { ok: false, error: "Paste at least one CREATE TABLE statement." };
  }

  const { sql: sanitizedSql, notes: sanitizeNotes } = sanitizePostgresDdl(trimmed);
  if (!sanitizedSql.trim()) {
    return {
      ok: false,
      error: "No CREATE TABLE statements found after sanitizing the pasted SQL.",
    };
  }

  try {
    const { Parser } = await import("node-sql-parser");
    const parser = new Parser();
    const ast = parser.astify(sanitizedSql, { database: "Postgresql" });
    const schema = walkParseTree(ast);

    if (schema.tables.length === 0) {
      return {
        ok: false,
        error: "No CREATE TABLE statements found in the pasted SQL.",
      };
    }

    const graph = ddlSchemaToFlow(schema, existingNodes, settings);
    return { ok: true, schema, graph, sanitizeNotes };
  } catch (error) {
    return { ok: false, error: formatParseError(error) };
  }
}
