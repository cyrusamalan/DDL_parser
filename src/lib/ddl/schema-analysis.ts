import type { Edge } from "@xyflow/react";
import { buildSchemaGraphContext } from "@/lib/ddl/schema-graph-context";
import { runSchemaBottleneckAnalysisFromContext } from "@/lib/ddl/schema-bottlenecks";
import { runSchemaLinterFromContext } from "@/lib/ddl/schema-linter";
import type { SchemaStats } from "@/lib/ddl/schema-stats";
import type { SchemaBottleneck } from "@/lib/ddl/schema-bottlenecks";
import type { SchemaIssue } from "@/lib/ddl/schema-linter";
import type { DiagramGrouping, TableFlowNode } from "@/lib/types/diagram";

export type SchemaAnalysisResult = {
  stats: SchemaStats;
  issues: SchemaIssue[];
  bottlenecks: SchemaBottleneck[];
};

export function runSchemaAnalysis(
  nodes: TableFlowNode[],
  edges: Edge[],
  grouping?: DiagramGrouping,
): SchemaAnalysisResult {
  const ctx = buildSchemaGraphContext(nodes, edges);
  return {
    stats: ctx.stats,
    issues: runSchemaLinterFromContext(ctx, grouping),
    bottlenecks: runSchemaBottleneckAnalysisFromContext(ctx),
  };
}
