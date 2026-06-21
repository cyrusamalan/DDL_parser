"use client";

import { groupSwatchClass, groupsWithAssignments } from "@/lib/ddl/table-grouping";
import { countBottlenecksByImpact, type SchemaBottleneck } from "@/lib/ddl/schema-bottlenecks";
import {
  countIssuesBySeverity,
  type SchemaIssue,
  type SchemaIssueSeverity,
} from "@/lib/ddl/schema-linter";
import { computeTableStats, type SchemaStats } from "@/lib/ddl/schema-stats";
import { useSchemaAnalysis } from "@/lib/hooks/use-schema-analysis";
import type { Edge } from "@xyflow/react";
import type { BottleneckImpact } from "@/lib/ddl/schema-bottlenecks";
import { ChevronDown, ChevronRight, Database } from "lucide-react";
import { useMemo, useState } from "react";
import type { DiagramGrouping, TableFlowNode } from "@/lib/types/diagram";

type SchemaInfoPanelProps = {
  nodes: TableFlowNode[];
  edges: Edge[];
  focusedNodeId: string | null;
  grouping: DiagramGrouping;
  onFocusTable?: (tableId: string) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
};

type FindingItem = {
  id: string;
  title: string;
  message: string;
  tableIds: string[];
};

const HEURISTIC_FOOTNOTE =
  "Schema-level heuristics — verify with indexes and EXPLAIN.";

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

const SEVERITY_DOT: Record<SchemaIssueSeverity, string> = {
  error: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-sky-500",
};

const IMPACT_DOT: Record<BottleneckImpact, string> = {
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-sky-500",
};

function formatSeveritySummary(counts: Record<SchemaIssueSeverity, number>): string {
  const parts: string[] = [];
  if (counts.error > 0) parts.push(`${counts.error} error${counts.error === 1 ? "" : "s"}`);
  if (counts.warning > 0) parts.push(`${counts.warning} warning${counts.warning === 1 ? "" : "s"}`);
  if (counts.info > 0) parts.push(`${counts.info} info`);
  return parts.join(", ");
}

function formatImpactSummary(counts: Record<BottleneckImpact, number>): string {
  const parts: string[] = [];
  if (counts.high > 0) parts.push(`${counts.high} high`);
  if (counts.medium > 0) parts.push(`${counts.medium} medium`);
  if (counts.low > 0) parts.push(`${counts.low} low`);
  return parts.join(", ");
}

function FindingsSection<T extends FindingItem>({
  title,
  items,
  summary,
  dotClass,
  emptyMessage,
  expanded,
  onExpandedChange,
  onFocusTable,
}: {
  title: string;
  items: T[];
  summary: string;
  dotClass: (item: T) => string;
  emptyMessage: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onFocusTable?: (tableId: string) => void;
}) {
  return (
    <>
      <div className="my-2 border-t border-zinc-200 dark:border-zinc-700" />
      <button
        type="button"
        onClick={() => onExpandedChange(!expanded)}
        className="flex w-full items-center gap-1 text-left text-xs font-semibold text-zinc-900 dark:text-zinc-100"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        )}
        <span>{title}</span>
        {items.length > 0 && summary && (
          <span className="ml-auto text-[10px] font-normal text-zinc-500 dark:text-zinc-400">
            {summary}
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-1.5">
          {items.length === 0 ? (
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{emptyMessage}</p>
          ) : (
            <>
              <ul className="max-h-44 space-y-1 overflow-y-auto pr-0.5">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (item.tableIds[0] && onFocusTable) {
                          onFocusTable(item.tableIds[0]);
                        }
                      }}
                      className="flex w-full items-start gap-1.5 rounded px-1 py-0.5 text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                      title={item.message}
                    >
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dotClass(item)}`}
                        aria-hidden
                      />
                      <span className="min-w-0 text-[11px] leading-snug text-zinc-700 dark:text-zinc-300">
                        {item.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[10px] leading-snug text-zinc-400 dark:text-zinc-500">
                {HEURISTIC_FOOTNOTE}
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}

export function SchemaInfoPanel({
  nodes,
  edges,
  focusedNodeId,
  grouping,
  onFocusTable,
  collapsed: collapsedProp,
  onCollapsedChange,
}: SchemaInfoPanelProps) {
  const [collapsedState, setCollapsedState] = useState(true);
  const [issuesExpanded, setIssuesExpanded] = useState(false);
  const [bottlenecksExpanded, setBottlenecksExpanded] = useState(false);
  const collapsed = collapsedProp ?? collapsedState;

  const setCollapsed = (value: boolean) => {
    if (!value) {
      setIssuesExpanded(false);
      setBottlenecksExpanded(false);
    }
    onCollapsedChange?.(value);
    if (collapsedProp === undefined) {
      setCollapsedState(value);
    }
  };

  const { stats, issues, bottlenecks, isAnalyzing } = useSchemaAnalysis(nodes, edges, grouping);

  const issueCounts = useMemo(() => countIssuesBySeverity(issues), [issues]);
  const bottleneckCounts = useMemo(() => countBottlenecksByImpact(bottlenecks), [bottlenecks]);

  if (nodes.length === 0) return null;

  const focusedNode = focusedNodeId
    ? nodes.find((node) => node.id === focusedNodeId)
    : undefined;
  const tableStats = focusedNode ? computeTableStats(focusedNode, edges) : null;
  const activeGroups = groupsWithAssignments(grouping);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white/95 px-2.5 py-2 shadow-md backdrop-blur transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/95 dark:hover:bg-zinc-800/90"
        aria-label="Expand model overview"
        aria-expanded={false}
      >
        <Database className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Model overview</span>
        <ChevronRight className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
      </button>
    );
  }

  return (
    <div className="w-60 rounded-lg border border-zinc-200 bg-white/95 px-3 py-2.5 shadow-md backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
      <div className="mb-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          aria-label="Collapse model overview"
          aria-expanded
        >
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <Database className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" />
          <span className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            Model overview
          </span>
        </button>
        {isAnalyzing && (
          <span className="shrink-0 text-[10px] font-normal text-zinc-400 dark:text-zinc-500">
            Updating…
          </span>
        )}
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

      <FindingsSection<SchemaIssue>
        title="Schema issues"
        items={issues}
        summary={formatSeveritySummary(issueCounts)}
        dotClass={(item) => SEVERITY_DOT[item.severity]}
        emptyMessage="No issues detected"
        expanded={issuesExpanded}
        onExpandedChange={setIssuesExpanded}
        onFocusTable={onFocusTable}
      />

      <FindingsSection<SchemaBottleneck>
        title="Potential bottlenecks"
        items={bottlenecks}
        summary={formatImpactSummary(bottleneckCounts)}
        dotClass={(item) => IMPACT_DOT[item.impact]}
        emptyMessage="No bottlenecks flagged"
        expanded={bottlenecksExpanded}
        onExpandedChange={setBottlenecksExpanded}
        onFocusTable={onFocusTable}
      />

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
