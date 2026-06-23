import { ddlSchemaToFlow, type FlowGraph } from "@/lib/ddl/ddl-to-flow";
import type { ParsedForeignKey, ParsedSchema, ParsedTable } from "@/lib/ddl/ast-walker";
import type { DiagramSettings, SqlDialect, SqlFileEntry, TableFlowNode } from "@/lib/types/diagram";
import { parsePostgresDdl, type ParseDdlResult } from "@/lib/ddl/parse-postgres-ddl";

function mergeSchemas(
  fileSchemas: Array<{ fileId: string; schema: ParsedSchema }>,
): { schema: ParsedSchema; sourceFileByTable: Map<string, string> } {
  const tablesByName = new Map<string, ParsedTable>();
  const sourceFileByTable = new Map<string, string>();
  const foreignKeys: ParsedForeignKey[] = [];
  const seenFkIds = new Set<string>();

  for (const { fileId, schema } of fileSchemas) {
    for (const table of schema.tables) {
      tablesByName.set(table.name, table);
      sourceFileByTable.set(table.name, fileId);
    }
    for (const fk of schema.foreignKeys) {
      if (seenFkIds.has(fk.id)) continue;
      seenFkIds.add(fk.id);
      foreignKeys.push(fk);
    }
  }

  return {
    schema: {
      tables: Array.from(tablesByName.values()),
      foreignKeys,
    },
    sourceFileByTable,
  };
}

function stampSourceFileIds(
  graph: FlowGraph,
  sourceFileByTable: Map<string, string>,
): FlowGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        sourceFileId: sourceFileByTable.get(node.id),
      },
    })),
  };
}

export async function parseSqlFileEntries(
  files: SqlFileEntry[],
  existingNodes: TableFlowNode[] = [],
  settings?: DiagramSettings,
  dialect: SqlDialect = "postgresql",
): Promise<ParseDdlResult> {
  if (files.length === 0) {
    return { ok: false, error: "Upload at least one .sql file." };
  }

  if (files.length === 1) {
    const result = await parsePostgresDdl(files[0].sql, existingNodes, settings, dialect);
    if (!result.ok) return result;
    const sourceFileByTable = new Map<string, string>();
    for (const table of result.schema.tables) {
      sourceFileByTable.set(table.name, files[0].id);
    }
    return {
      ...result,
      graph: stampSourceFileIds(result.graph, sourceFileByTable),
    };
  }

  const fileSchemas: Array<{ fileId: string; schema: ParsedSchema }> = [];
  const allSanitizeNotes: string[] = [];

  for (const file of files) {
    const trimmed = file.sql.trim();
    if (!trimmed) continue;

    // Yield so large multi-file parses do not freeze the UI thread.
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });

    const result = await parsePostgresDdl(trimmed, [], settings, dialect);
    if (!result.ok) {
      return {
        ok: false,
        error: `${file.name}: ${result.error}`,
      };
    }
    fileSchemas.push({ fileId: file.id, schema: result.schema });
    for (const note of result.sanitizeNotes) {
      if (!allSanitizeNotes.includes(note)) {
        allSanitizeNotes.push(note);
      }
    }
  }

  if (fileSchemas.length === 0) {
    return { ok: false, error: "No CREATE TABLE statements found in the uploaded files." };
  }

  const { schema, sourceFileByTable } = mergeSchemas(fileSchemas);

  if (schema.tables.length === 0) {
    return { ok: false, error: "No CREATE TABLE statements found in the uploaded files." };
  }

  try {
    const graph = await ddlSchemaToFlow(schema, existingNodes, settings);
    return {
      ok: true,
      schema,
      graph: stampSourceFileIds(graph, sourceFileByTable),
      sanitizeNotes: allSanitizeNotes,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build diagram from SQL files.";
    return { ok: false, error: message };
  }
}

export async function parseDiagramSql(
  options: {
    sql: string;
    sqlFiles: SqlFileEntry[];
    existingNodes?: TableFlowNode[];
    settings?: DiagramSettings;
    dialect?: SqlDialect;
  },
): Promise<ParseDdlResult> {
  const { sql, sqlFiles, existingNodes = [], settings, dialect = "postgresql" } = options;
  if (sqlFiles.length > 0) {
    return parseSqlFileEntries(sqlFiles, existingNodes, settings, dialect);
  }
  return parsePostgresDdl(sql, existingNodes, settings, dialect);
}
