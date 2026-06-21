import type { Edge } from "@xyflow/react";
import type { FkEdgeData, TableFlowNode } from "@/lib/types/diagram";

export type AiGroupingTableInput = {
  id: string;
  columns: string[];
  foreignKeys: { column: string; references: string }[];
};

export type AiGroupingInput = {
  tables: AiGroupingTableInput[];
};

export function buildAiGroupingInput(
  nodes: TableFlowNode[],
  edges: Edge[],
): AiGroupingInput {
  const outgoingBySource = new Map<string, { column: string; references: string }[]>();

  for (const edge of edges) {
    const data = edge.data as FkEdgeData | undefined;
    if (!data) continue;

    const bucket = outgoingBySource.get(edge.source) ?? [];
    bucket.push({
      column: data.fromColumn,
      references: `${data.toTable}.${data.toColumn}`,
    });
    outgoingBySource.set(edge.source, bucket);
  }

  return {
    tables: nodes.map((node) => ({
      id: node.id,
      columns: node.data.columns.map((column) => {
        const flags: string[] = [];
        if (column.isPrimaryKey) flags.push("PK");
        if (column.isForeignKey) flags.push("FK");
        return flags.length > 0 ? `${column.name} (${flags.join(",")})` : column.name;
      }),
      foreignKeys: outgoingBySource.get(node.id) ?? [],
    })),
  };
}

export function buildGroupingPrompt(input: AiGroupingInput): string {
  return [
    "You are organizing database tables into logical subject-area groups for an ERD diagram.",
    "Given the schema below, propose meaningful groups (e.g. Auth, Billing, Voice, Core).",
    "Rules:",
    "- Use each table id exactly once across all groups, or omit it to leave ungrouped.",
    "- Prefer 3–8 groups for large schemas; fewer for small schemas.",
    "- Group by business domain, naming prefixes, and foreign-key relationships.",
    "- Group names should be short and human-readable.",
    "",
    "Schema JSON:",
    JSON.stringify(input, null, 2),
  ].join("\n");
}
