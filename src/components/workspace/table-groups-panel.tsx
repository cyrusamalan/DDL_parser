"use client";

import { useMemo, useState, type DragEvent } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  TABLE_GROUP_COLORS,
  groupSwatchClass,
  tablesForGroup,
  ungroupedNodeIds,
} from "@/lib/ddl/table-grouping";
import type { DiagramGrouping, TableFlowNode, TableGroupColor } from "@/lib/types/diagram";

const NODE_ID_MIME = "application/x-ddl-table-node-id";

type TableGroupsPanelProps = {
  nodes: TableFlowNode[];
  grouping: DiagramGrouping;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onCreateGroup: () => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onSetGroupColor: (groupId: string, color: TableGroupColor) => void;
  onDeleteGroup: (groupId: string) => void;
  onAssignTable: (nodeId: string, groupId: string) => void;
  onUnassignTable: (nodeId: string) => void;
  isAutoGrouping?: boolean;
  autoGroupError?: string | null;
  onAutoGroupRequest?: () => void;
};

function readDraggedNodeId(event: DragEvent): string | null {
  return event.dataTransfer.getData(NODE_ID_MIME) || event.dataTransfer.getData("text/plain") || null;
}

function TableChip({
  node,
  onAssign,
  groups,
}: {
  node: TableFlowNode;
  onAssign?: (groupId: string) => void;
  groups: DiagramGrouping["groups"];
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData(NODE_ID_MIME, node.id);
          event.dataTransfer.setData("text/plain", node.id);
          event.dataTransfer.effectAllowed = "move";
        }}
        onClick={() => {
          if (onAssign && groups.length > 0) {
            setMenuOpen((value) => !value);
          }
        }}
        className="cursor-grab rounded-md border border-zinc-200 bg-white px-2 py-1 text-left text-[11px] text-zinc-800 shadow-sm active:cursor-grabbing dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        title={node.data.tableName}
      >
        <span className="block truncate">{node.data.tableName}</span>
      </button>
      {menuOpen && onAssign && (
        <div className="absolute top-full left-0 z-20 mt-1 min-w-[140px] rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              className="flex w-full items-center gap-2 px-2 py-1 text-left text-[11px] text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              onClick={() => {
                onAssign(group.id);
                setMenuOpen(false);
              }}
            >
              <span className={`h-2 w-2 shrink-0 rounded-sm ${groupSwatchClass(group.color)}`} />
              {group.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DropZone({
  label,
  nodeIds,
  nodeById,
  groups,
  onDropNode,
  emptyText,
  onMoveToGroup,
}: {
  label: string;
  nodeIds: string[];
  nodeById: Map<string, TableFlowNode>;
  groups: DiagramGrouping["groups"];
  onDropNode: (nodeId: string) => void;
  emptyText: string;
  onMoveToGroup?: (nodeId: string, groupId: string) => void;
}) {
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const nodeId = readDraggedNodeId(event);
    if (nodeId) onDropNode(nodeId);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="min-h-[72px] rounded-lg border border-dashed border-zinc-300 bg-zinc-50/80 p-2 dark:border-zinc-700 dark:bg-zinc-900/40"
    >
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      {nodeIds.length === 0 ? (
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {nodeIds.map((nodeId) => {
            const node = nodeById.get(nodeId);
            if (!node) return null;
            return (
              <TableChip
                key={nodeId}
                node={node}
                groups={groups}
                onAssign={
                  onMoveToGroup ? (groupId) => onMoveToGroup(nodeId, groupId) : undefined
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TableGroupsPanel({
  nodes,
  grouping,
  collapsed,
  onToggleCollapsed,
  onCreateGroup,
  onRenameGroup,
  onSetGroupColor,
  onDeleteGroup,
  onAssignTable,
  onUnassignTable,
  isAutoGrouping = false,
  autoGroupError = null,
  onAutoGroupRequest,
}: TableGroupsPanelProps) {
  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const nodeIds = useMemo(() => nodes.map((node) => node.id), [nodes]);
  const ungroupedIds = useMemo(
    () => ungroupedNodeIds(nodeIds, grouping),
    [grouping, nodeIds],
  );

  if (collapsed) {
    return (
      <div className="flex h-full w-10 shrink-0 flex-col items-center border-l border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="mt-3 rounded-md p-1.5 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Expand groups panel"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col border-l border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Table groups</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Drag tables into a group to color them on the canvas
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Collapse groups panel"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {grouping.groups.length} group{grouping.groups.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={onCreateGroup}
            disabled={nodes.length === 0}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add group
          </button>
        </div>
        {onAutoGroupRequest && (
          <button
            type="button"
            onClick={onAutoGroupRequest}
            disabled={nodes.length === 0 || isAutoGrouping}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-2 py-1.5 text-xs font-medium text-violet-900 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100 dark:hover:bg-violet-950/70"
          >
            {isAutoGrouping ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Auto-group with AI
              </>
            )}
          </button>
        )}
        {autoGroupError && (
          <p className="text-[11px] leading-snug text-rose-600 dark:text-rose-400">{autoGroupError}</p>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {nodes.length === 0 && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Regenerate a diagram first, then create groups and drag tables into them.
          </p>
        )}

        {grouping.groups.map((group) => {
          const assignedIds = tablesForGroup(grouping, group.id);

          return (
            <div
              key={group.id}
              className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="mb-2 flex items-start gap-2">
                <div className="flex flex-wrap gap-1">
                  {TABLE_GROUP_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Set color ${color}`}
                      onClick={() => onSetGroupColor(group.id, color)}
                      className={`h-4 w-4 rounded-full border-2 ${groupSwatchClass(color)} ${
                        group.color === color
                          ? "border-zinc-900 dark:border-zinc-100"
                          : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteGroup(group.id)}
                  className="ml-auto rounded p-1 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                  aria-label={`Delete ${group.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <input
                type="text"
                value={group.name}
                onChange={(event) => onRenameGroup(group.id, event.target.value)}
                className="mb-2 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm font-medium text-zinc-900 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />

              <DropZone
                label={`${group.name} (${assignedIds.length})`}
                nodeIds={assignedIds}
                nodeById={nodeById}
                groups={grouping.groups}
                onDropNode={(nodeId) => onAssignTable(nodeId, group.id)}
                emptyText="Drop tables here"
              />
            </div>
          );
        })}

        {nodes.length > 0 && (
          <DropZone
            label={`Ungrouped (${ungroupedIds.length})`}
            nodeIds={ungroupedIds}
            nodeById={nodeById}
            groups={grouping.groups}
            onDropNode={onUnassignTable}
            onMoveToGroup={onAssignTable}
            emptyText="All tables are grouped"
          />
        )}
      </div>
    </aside>
  );
}
