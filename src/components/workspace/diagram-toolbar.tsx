"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { GroupNavigator } from "@/components/workspace/group-navigator";
import type { GroupFocusId } from "@/lib/ddl/group-focus";
import type { DiagramGrouping, TableFlowNode } from "@/lib/types/diagram";

type DiagramToolbarProps = {
  nodes: TableFlowNode[];
  grouping: DiagramGrouping;
  activeGroupId: GroupFocusId | null;
  onSearchSelect: (nodeId: string) => void;
  onSelectGroup: (groupId: GroupFocusId) => void;
  onShowAll: () => void;
};

export function DiagramToolbar({
  nodes,
  grouping,
  activeGroupId,
  onSearchSelect,
  onSelectGroup,
  onShowAll,
}: DiagramToolbarProps) {
  const [query, setQuery] = useState("");
  const [showHint, setShowHint] = useState(
    () => typeof window !== "undefined" && !localStorage.getItem("ddl-erd-focus-hint-dismissed"),
  );

  const nodeIds = useMemo(() => nodes.map((node) => node.id), [nodes]);

  const matches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    return nodes
      .filter((node) => node.data.tableName.toLowerCase().includes(trimmed))
      .slice(0, 8);
  }, [nodes, query]);

  const dismissHint = () => {
    setShowHint(false);
    localStorage.setItem("ddl-erd-focus-hint-dismissed", "1");
  };

  if (nodes.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {showHint && (
        <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white/95 px-3 py-2 text-xs text-zinc-600 shadow-md backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-300">
          <span>Click a table to trace its relationships</span>
          <button
            type="button"
            onClick={dismissHint}
            className="rounded p-0.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Dismiss hint"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-start gap-2">
        <div className="relative min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white/95 p-2 shadow-md backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find table…"
            className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pr-2 pl-8 text-xs text-zinc-900 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
          />
          {matches.length > 0 && (
            <ul className="absolute top-full right-2 left-2 z-20 mt-1 max-h-48 overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              {matches.map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-xs text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    onClick={() => {
                      onSearchSelect(node.id);
                      setQuery("");
                    }}
                  >
                    {node.data.tableName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <GroupNavigator
          grouping={grouping}
          nodeIds={nodeIds}
          activeGroupId={activeGroupId}
          onSelectGroup={onSelectGroup}
          onShowAll={onShowAll}
        />
      </div>
    </div>
  );
}
