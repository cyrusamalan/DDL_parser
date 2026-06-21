import type { Edge } from "@xyflow/react";
import {
  countReverseDependents,
  findArticulationPoints,
  maxDirectedDepthFromRoots,
} from "@/lib/ddl/schema-graph";
import type { SchemaGraphContext } from "@/lib/ddl/schema-graph-context";
import { buildSchemaGraphContext } from "@/lib/ddl/schema-graph-context";
import type { TableFlowNode } from "@/lib/types/diagram";

export type BottleneckImpact = "high" | "medium" | "low";

export type SchemaBottleneck = {
  id: string;
  ruleId: string;
  impact: BottleneckImpact;
  title: string;
  message: string;
  tableIds: string[];
};

export const BOTTLENECK_THRESHOLDS = {
  joinHotspotInDegree: 8,
  wideFanOutDegree: 6,
  deepJoinChainDepth: 6,
  expensiveDeleteDependents: 12,
  wideTableColumns: 20,
  hubInDegreeExempt: 8,
} as const;

const IMPACT_ORDER: Record<BottleneckImpact, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const APPEND_HEAVY_NAME_PATTERN = /_(events|logs|history|audit)s?$/i;

const TIME_COLUMN_PATTERN = /(_at|_on|timestamp|date)$/i;

const PAYLOAD_TYPE_PATTERN = /\b(jsonb?|text|bytea)\b/i;

function shortTableName(tableName: string): string {
  const dotIndex = tableName.lastIndexOf(".");
  return dotIndex >= 0 ? tableName.slice(dotIndex + 1) : tableName;
}

function bottleneckTitle(label: string, tableName: string): string {
  return `${label}: ${shortTableName(tableName)}`;
}

function bottleneck(
  ruleId: string,
  impact: BottleneckImpact,
  title: string,
  message: string,
  tableIds: string[],
  uniqueKey?: string,
): SchemaBottleneck {
  const key = uniqueKey ?? tableIds[0] ?? "global";
  return {
    id: `${ruleId}:${key}`,
    ruleId,
    impact,
    title,
    message,
    tableIds,
  };
}

function hasTimeColumn(node: TableFlowNode): boolean {
  return node.data.columns.some(
    (col) =>
      TIME_COLUMN_PATTERN.test(col.name) ||
      /\btimestamp\b/i.test(col.dataType) ||
      /\bdatetime\b/i.test(col.dataType),
  );
}

function hasAppendTimestamp(node: TableFlowNode): boolean {
  return node.data.columns.some(
    (col) =>
      col.name === "created_at" ||
      col.name === "timestamp" ||
      /\btimestamp\b/i.test(col.dataType),
  );
}

function isAppendHeavyTable(node: TableFlowNode): boolean {
  const shortName = shortTableName(node.data.tableName);
  return APPEND_HEAVY_NAME_PATTERN.test(shortName) && hasAppendTimestamp(node);
}

function payloadColumns(node: TableFlowNode): string[] {
  return node.data.columns
    .filter((col) => PAYLOAD_TYPE_PATTERN.test(col.dataType))
    .map((col) => col.name);
}

function unindexedFkColumns(node: TableFlowNode): string[] {
  return node.data.columns
    .filter((col) => col.isForeignKey && !col.isPrimaryKey)
    .map((col) => col.name);
}

function sortBottlenecks(items: SchemaBottleneck[]): SchemaBottleneck[] {
  return [...items].sort((a, b) => {
    const impactDiff = IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact];
    if (impactDiff !== 0) return impactDiff;
    return a.ruleId.localeCompare(b.ruleId);
  });
}

export function runSchemaBottleneckAnalysisFromContext(
  ctx: SchemaGraphContext,
): SchemaBottleneck[] {
  if (ctx.nodes.length === 0) return [];

  const bottlenecks: SchemaBottleneck[] = [];
  const {
    nodes,
    nodeIds,
    nodeById,
    directedAdj,
    reverseAdj,
    undirectedAdj,
    inDegree,
    outDegree,
  } = ctx;

  for (const nodeId of nodeIds) {
    const inDeg = inDegree.get(nodeId) ?? 0;
    if (inDeg >= BOTTLENECK_THRESHOLDS.joinHotspotInDegree) {
      const node = nodeById.get(nodeId);
      const tableName = node?.data.tableName ?? nodeId;
      bottlenecks.push(
        bottleneck(
          "join-hotspot",
          "high",
          bottleneckTitle("Join hotspot", tableName),
          `${tableName} is joined by ${inDeg} tables — contention and cache pressure grow as dependent data scales.`,
          [nodeId],
        ),
      );
    }
  }

  for (const nodeId of nodeIds) {
    const outDeg = outDegree.get(nodeId) ?? 0;
    if (outDeg >= BOTTLENECK_THRESHOLDS.wideFanOutDegree) {
      const node = nodeById.get(nodeId);
      const tableName = node?.data.tableName ?? nodeId;
      bottlenecks.push(
        bottleneck(
          "wide-fan-out",
          "medium",
          bottleneckTitle("Wide fan-out", tableName),
          `Reading ${tableName} often pulls in ${outDeg} related tables — query cost grows with each join.`,
          [nodeId],
        ),
      );
    }
  }

  const { maxDepth, deepestNode } = maxDirectedDepthFromRoots(nodeIds, directedAdj);
  if (maxDepth >= BOTTLENECK_THRESHOLDS.deepJoinChainDepth && deepestNode) {
    const node = nodeById.get(deepestNode);
    const tableName = node?.data.tableName ?? deepestNode;
    bottlenecks.push(
      bottleneck(
        "deep-join-chain",
        "high",
        bottleneckTitle("Deep join chain", tableName),
        `FK paths reach ${maxDepth} hops (deepest: ${tableName}) — long join chains slow reads at scale.`,
        [deepestNode],
        "global",
      ),
    );
  }

  for (const nodeId of nodeIds) {
    const dependents = countReverseDependents(nodeId, reverseAdj);
    if (dependents >= BOTTLENECK_THRESHOLDS.expensiveDeleteDependents) {
      const node = nodeById.get(nodeId);
      const tableName = node?.data.tableName ?? nodeId;
      bottlenecks.push(
        bottleneck(
          "expensive-delete",
          "high",
          bottleneckTitle("Expensive delete", tableName),
          `Deleting from ${tableName} can touch ${dependents} dependent tables — costly cascades and lock time.`,
          [nodeId],
        ),
      );
    }
  }

  for (const articulationPoint of findArticulationPoints(nodeIds, undirectedAdj)) {
    const inDeg = inDegree.get(articulationPoint) ?? 0;
    const outDeg = outDegree.get(articulationPoint) ?? 0;
    if (inDeg >= BOTTLENECK_THRESHOLDS.hubInDegreeExempt && outDeg <= 1) continue;

    const node = nodeById.get(articulationPoint);
    const tableName = node?.data.tableName ?? articulationPoint;
    bottlenecks.push(
      bottleneck(
        "graph-bottleneck",
        "medium",
        bottleneckTitle("Graph bottleneck", tableName),
        `${tableName} sits on critical paths — many queries must route through it as data grows.`,
        [articulationPoint],
      ),
    );
  }

  for (const node of nodes) {
    if (node.data.columns.length < BOTTLENECK_THRESHOLDS.wideTableColumns) continue;

    bottlenecks.push(
      bottleneck(
        "wide-table",
        "medium",
        bottleneckTitle("Wide table", node.data.tableName),
        `${node.data.tableName} has ${node.data.columns.length} columns — wider rows increase I/O per fetch.`,
        [node.id],
      ),
    );
  }

  for (const node of nodes) {
    const fkCols = unindexedFkColumns(node);
    if (fkCols.length === 0) continue;

    const preview = fkCols.slice(0, 3).join(", ");
    const suffix = fkCols.length > 3 ? ` (+${fkCols.length - 3} more)` : "";

    bottlenecks.push(
      bottleneck(
        "unindexed-fk",
        "medium",
        bottleneckTitle(`Unindexed FKs (${fkCols.length})`, node.data.tableName),
        `${node.data.tableName} has ${fkCols.length} non-PK FK column(s) (${preview}${suffix}) — ensure indexes exist for join/filter performance.`,
        [node.id],
      ),
    );
  }

  for (const node of nodes) {
    const payloads = payloadColumns(node);
    if (payloads.length === 0) continue;

    const preview = payloads.slice(0, 3).join(", ");
    const suffix = payloads.length > 3 ? ` (+${payloads.length - 3} more)` : "";

    bottlenecks.push(
      bottleneck(
        "large-payload-columns",
        "medium",
        bottleneckTitle("Large payloads", node.data.tableName),
        `${node.data.tableName} stores heavy types on ${preview}${suffix} — storage and serialization cost grow with row volume.`,
        [node.id],
      ),
    );
  }

  for (const node of nodes) {
    if (!isAppendHeavyTable(node)) continue;

    bottlenecks.push(
      bottleneck(
        "append-heavy-table",
        "high",
        bottleneckTitle("Append-heavy", node.data.tableName),
        `${node.data.tableName} looks like an event/log table — row count tends to grow without bound; plan retention or partitioning.`,
        [node.id],
      ),
    );
  }

  for (const node of nodes) {
    const outDeg = outDegree.get(node.id) ?? 0;
    if (outDeg === 0 || !hasTimeColumn(node)) continue;
    if (isAppendHeavyTable(node)) continue;

    bottlenecks.push(
      bottleneck(
        "timeseries-shape",
        "low",
        bottleneckTitle("Time-series shape", node.data.tableName),
        `${node.data.tableName} has FK relationships and time columns — time-range scans may need indexes or partitioning as volume grows.`,
        [node.id],
      ),
    );
  }

  return sortBottlenecks(bottlenecks);
}

export function runSchemaBottleneckAnalysis(
  nodes: TableFlowNode[],
  edges: Edge[],
): SchemaBottleneck[] {
  return runSchemaBottleneckAnalysisFromContext(buildSchemaGraphContext(nodes, edges));
}

export function countBottlenecksByImpact(
  bottlenecks: SchemaBottleneck[],
): Record<BottleneckImpact, number> {
  const counts: Record<BottleneckImpact, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const item of bottlenecks) {
    counts[item.impact]++;
  }
  return counts;
}
