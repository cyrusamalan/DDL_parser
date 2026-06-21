"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { groupSwatchClass, tablesForGroup } from "@/lib/ddl/table-grouping";
import type { AiGroupingPreview } from "@/lib/ai/gemini-grouping";
import type { TableFlowNode } from "@/lib/types/diagram";

type AiGroupingPreviewDialogProps = {
  open: boolean;
  preview: AiGroupingPreview | null;
  nodes: TableFlowNode[];
  onApply: () => void;
  onClose: () => void;
};

function GroupPreviewCard({
  groupId,
  name,
  color,
  tableNames,
}: {
  groupId: string;
  name: string;
  color: Parameters<typeof groupSwatchClass>[0];
  tableNames: string[];
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/50">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        )}
        <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${groupSwatchClass(color)}`} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {name}
        </span>
        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          {tableNames.length}
        </span>
      </button>
      {expanded && (
        <ul className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-700">
          {tableNames.map((tableName) => (
            <li
              key={`${groupId}-${tableName}`}
              className="truncate py-0.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-300"
            >
              {tableName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AiGroupingPreviewDialog({
  open,
  preview,
  nodes,
  onApply,
  onClose,
}: AiGroupingPreviewDialogProps) {
  const titleId = useId();

  if (!open || !preview) return null;

  const nodeNameById = new Map(nodes.map((node) => [node.id, node.data.tableName]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
        aria-label="Close AI grouping preview"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 id={titleId} className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            AI grouping preview
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Review suggested groups before applying. This will replace your current groups.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {preview.grouping.groups.map((group) => {
            const tableIds = tablesForGroup(preview.grouping, group.id);
            const tableNames = tableIds.map((id) => nodeNameById.get(id) ?? id);
            return (
              <GroupPreviewCard
                key={group.id}
                groupId={group.id}
                name={group.name}
                color={group.color}
                tableNames={tableNames}
              />
            );
          })}

          {preview.ungroupedTableIds.length > 0 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {preview.ungroupedTableIds.length} table
              {preview.ungroupedTableIds.length === 1 ? "" : "s"} will remain ungrouped:{" "}
              {preview.ungroupedTableIds
                .map((id) => nodeNameById.get(id) ?? id)
                .slice(0, 5)
                .join(", ")}
              {preview.ungroupedTableIds.length > 5 ? "…" : ""}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Apply groups
          </button>
        </div>
      </div>
    </div>
  );
}
