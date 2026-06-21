"use client";

import { Database } from "lucide-react";
import { groupSwatchClass, groupsWithAssignments } from "@/lib/ddl/table-grouping";
import {
  computeSchemaStats,
  computeTableStats,
  type SchemaStats,
} from "@/lib/ddl/schema-stats";
import type { Edge } from "@xyflow/react";
import type { DiagramGrouping, TableFlowNode } from "@/lib/types/diagram";

type SchemaInfoPanelProps = {
  nodes: TableFlowNode[];
  edges: Edge[];
  focusedNodeId: string | null;
  grouping: DiagramGrouping;
};

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{value}</span>
    </div>
  );
}

function SchemaOverview({ stats, relationshipCount }: { stats: SchemaStats; relationshipCount: number }) {
  return (
    <div className="space-y-1.5">
      <StatRow label="Tables" value={stats.tableCount} />
      <StatRow label="Columns" value={stats.columnCount} />
      <StatRow label="Primary keys" value={stats.primaryKeyCount} />
      <StatRow label="FK columns" value={stats.foreignKeyCount} />
      <StatRow label="Relationships" value={relationshipCount} />
      <StatRow label="Isolated tables" value={stats.isolatedTableCount} />
      <StatRow label="Avg cols / table" value={stats.avgColumnsPerTable} />
    </div>
  );
}

export function SchemaInfoPanel({ nodes, edges, focusedNodeId, grouping }: SchemaInfoPanelProps) {
  if (nodes.length === 0) return null;

  const stats = computeSchemaStats(nodes, edges);
  const focusedNode = focusedNodeId
    ? nodes.find((node) => node.id === focusedNodeId)
    : undefined;
  const tableStats = focusedNode ? computeTableStats(focusedNode, edges) : null;
  const activeGroups = groupsWithAssignments(grouping);

  return (
    <div className="w-52 rounded-lg border border-zinc-200 bg-white/95 px-3 py-2.5 shadow-md backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
      <div className="mb-2 flex items-center gap-1.5">
        <Database className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Model overview</span>
      </div>

      <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-zinc-500 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-amber-400/80" aria-hidden />
          PK
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-sky-400/80" aria-hidden />
          FK
        </span>
        {activeGroups.map((group) => (
          <span key={group.id} className="inline-flex items-center gap-1">
            <span
              className={`inline-block h-2 w-2 rounded-sm ${groupSwatchClass(group.color)}`}
              aria-hidden
            />
            {group.name}
          </span>
        ))}
      </div>

      <SchemaOverview stats={stats} relationshipCount={edges.length} />

      {tableStats && (
        <>
          <div className="my-2 border-t border-zinc-200 dark:border-zinc-700" />
          <p className="mb-1.5 truncate text-xs font-semibold text-sky-700 dark:text-sky-300">
            {tableStats.tableName}
          </p>
          <div className="space-y-1.5">
            <StatRow label="Columns" value={tableStats.columnCount} />
            <StatRow label="Primary keys" value={tableStats.primaryKeyCount} />
            <StatRow label="FK columns" value={tableStats.foreignKeyCount} />
            <StatRow label="References out" value={tableStats.outgoingFkCount} />
            <StatRow label="Referenced by" value={tableStats.incomingFkCount} />
          </div>
        </>
      )}
    </div>
  );
}
