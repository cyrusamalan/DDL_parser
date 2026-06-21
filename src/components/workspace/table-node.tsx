"use client";

import { memo, type CSSProperties } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Key, Link2 } from "lucide-react";
import { useDiagramDisplay } from "@/components/workspace/diagram-display-context";
import { useDiagramFocus, type NodeVisualState } from "@/components/workspace/diagram-focus-context";
import { groupStyles } from "@/lib/ddl/table-grouping";
import type { HandleSide } from "@/lib/ddl/optimize-edge-handles";
import { TABLE_ROW_HEIGHT } from "@/lib/ddl/node-metrics";
import { getVisibleColumns } from "@/lib/ddl/visible-columns";
import type { TableNodeData } from "@/lib/types/diagram";

const SIDES: HandleSide[] = ["left", "right", "top", "bottom"];

const POSITION_BY_SIDE: Record<HandleSide, Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

function columnHandleStyle(side: HandleSide): CSSProperties {
  if (side === "left" || side === "right") {
    return { top: "50%", transform: "translateY(-50%)" };
  }

  return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
}

function ColumnHandles({
  columnName,
  role,
}: {
  columnName: string;
  role: "source" | "target";
}) {
  return (
    <>
      {SIDES.map((side) => (
        <Handle
          key={`${columnName}-${role}-${side}`}
          id={`${columnName}-${role}-${side}`}
          type={role}
          position={POSITION_BY_SIDE[side]}
          style={columnHandleStyle(side)}
          className="!h-2 !w-2 !border-zinc-400 !bg-zinc-300 opacity-0"
        />
      ))}
    </>
  );
}

function rowClassName(isPrimaryKey: boolean, isForeignKey: boolean): string {
  if (isPrimaryKey) return "bg-amber-50/80 dark:bg-amber-950/30";
  if (isForeignKey) return "bg-sky-50/80 dark:bg-sky-950/25";
  return "bg-white dark:bg-zinc-900";
}

function nodeVisualClassName(state: NodeVisualState): string {
  switch (state) {
    case "focused":
      return "relative z-10 ring-2 ring-sky-500 ring-offset-2 ring-offset-zinc-100 opacity-100 dark:ring-offset-zinc-950";
    case "connected":
      return "relative z-[5] ring-1 ring-sky-300/80 opacity-100 dark:ring-sky-600/80";
    case "dimmed":
      return "opacity-35";
    case "search":
      return "ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-100 dark:ring-offset-zinc-950";
    default:
      return "";
  }
}

function TableNodeComponent({ id, data }: NodeProps) {
  const nodeData = data as TableNodeData;
  const { columnView, getGroupForNode } = useDiagramDisplay();
  const { getNodeVisualState } = useDiagramFocus();
  const visualState = getNodeVisualState(id);
  const { visible, hiddenCount } = getVisibleColumns(nodeData.columns, columnView);
  const group = getGroupForNode(id);
  const styles = group ? groupStyles(group.color) : null;

  return (
    <div
      className={`w-[260px] overflow-hidden rounded-xl border bg-white shadow-lg shadow-zinc-200/50 dark:bg-zinc-900 dark:shadow-black/20 ${
        styles ? styles.border : "border-zinc-300/80 dark:border-zinc-600"
      } ${styles ? styles.bodyTint : ""} ${nodeVisualClassName(visualState)}`}
    >
      <div
        className={`border-b bg-gradient-to-r px-3 py-2.5 ${
          styles
            ? styles.header
            : "border-zinc-200 from-zinc-100 to-zinc-50 dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-900"
        }`}
      >
        <p className="truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {nodeData.tableName}
        </p>
        {group && (
          <p className="mt-0.5 truncate text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
            {group.name}
          </p>
        )}
      </div>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {visible.map(({ column }) => {
          const isKeyColumn = column.isPrimaryKey || column.isForeignKey;

          return (
            <li
              key={column.name}
              style={{ height: TABLE_ROW_HEIGHT }}
              className={`relative flex items-start justify-between gap-2 px-3 py-1.5 text-xs ${rowClassName(
                column.isPrimaryKey,
                column.isForeignKey,
              )}`}
            >
              {isKeyColumn && (
                <>
                  <ColumnHandles columnName={column.name} role="target" />
                  <ColumnHandles columnName={column.name} role="source" />
                </>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-800 dark:text-zinc-200">{column.name}</p>
                <p className="truncate font-mono text-[10px] leading-tight text-zinc-500 dark:text-zinc-400">
                  {column.dataType}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1 pt-0.5">
                {column.isPrimaryKey && (
                  <Key className="h-3 w-3 text-amber-600 dark:text-amber-400" aria-label="Primary key" />
                )}
                {column.isForeignKey && (
                  <Link2 className="h-3 w-3 text-sky-600 dark:text-sky-400" aria-label="Foreign key" />
                )}
              </div>
            </li>
          );
        })}
        {hiddenCount > 0 && (
          <li className="flex items-center bg-zinc-50 px-3 py-1.5 text-[10px] text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
            +{hiddenCount} more column{hiddenCount === 1 ? "" : "s"}
          </li>
        )}
      </ul>
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);
