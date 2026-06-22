"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Layers } from "lucide-react";
import {
  groupSwatchClass,
  groupsWithAssignments,
  tablesForGroup,
  ungroupedNodeIds,
} from "@/lib/ddl/table-grouping";
import type { DiagramGrouping } from "@/lib/types/diagram";
import type { GroupFocusId } from "@/lib/ddl/group-focus";

type GroupNavigatorProps = {
  grouping: DiagramGrouping;
  nodeIds: string[];
  activeGroupId: GroupFocusId | null;
  onSelectGroup: (groupId: GroupFocusId) => void;
  onShowAll: () => void;
};

export function GroupNavigator({
  grouping,
  nodeIds,
  activeGroupId,
  onSelectGroup,
  onShowAll,
}: GroupNavigatorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const assignedGroups = useMemo(() => groupsWithAssignments(grouping), [grouping]);

  const groupRows = useMemo(
    () =>
      assignedGroups.map((group) => ({
        id: group.id as GroupFocusId,
        name: group.name,
        color: group.color,
        count: tablesForGroup(grouping, group.id).length,
      })),
    [assignedGroups, grouping],
  );

  const ungroupedCount = useMemo(
    () => ungroupedNodeIds(nodeIds, grouping).length,
    [grouping, nodeIds],
  );

  const hasNavigator = groupRows.length > 0 || ungroupedCount > 0;

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  if (!hasNavigator) return null;

  const activeLabel =
    activeGroupId === "ungrouped"
      ? "Ungrouped"
      : groupRows.find((row) => row.id === activeGroupId)?.name;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex h-[34px] items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium shadow-sm transition ${
          activeGroupId
            ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-100 dark:hover:bg-amber-950"
            : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800"
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Jump to a table group"
      >
        <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="hidden max-w-[88px] truncate sm:inline">
          {activeLabel ?? "Groups"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute top-full right-0 z-30 mt-1 min-w-[200px] max-w-[260px] overflow-hidden rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {groupRows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                role="option"
                aria-selected={activeGroupId === row.id}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  activeGroupId === row.id
                    ? "bg-zinc-50 font-medium text-zinc-900 dark:bg-zinc-800/80 dark:text-zinc-100"
                    : "text-zinc-800 dark:text-zinc-200"
                }`}
                onClick={() => {
                  onSelectGroup(row.id);
                  setOpen(false);
                }}
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-sm ${groupSwatchClass(row.color)}`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                <span className="shrink-0 text-zinc-400 dark:text-zinc-500">{row.count}</span>
              </button>
            </li>
          ))}

          {ungroupedCount > 0 && (
            <li>
              <button
                type="button"
                role="option"
                aria-selected={activeGroupId === "ungrouped"}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  activeGroupId === "ungrouped"
                    ? "bg-zinc-50 font-medium text-zinc-900 dark:bg-zinc-800/80 dark:text-zinc-100"
                    : "text-zinc-800 dark:text-zinc-200"
                }`}
                onClick={() => {
                  onSelectGroup("ungrouped");
                  setOpen(false);
                }}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm border border-dashed border-zinc-400 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">Ungrouped</span>
                <span className="shrink-0 text-zinc-400 dark:text-zinc-500">{ungroupedCount}</span>
              </button>
            </li>
          )}

          <li className="mt-1 border-t border-zinc-200 pt-1 dark:border-zinc-700">
            <button
              type="button"
              className="w-full px-3 py-1.5 text-left text-xs text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              onClick={() => {
                onShowAll();
                setOpen(false);
              }}
            >
              Show all
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
