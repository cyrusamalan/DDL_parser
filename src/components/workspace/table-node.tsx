"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Key, Link2 } from "lucide-react";
import type { HandleSide } from "@/lib/ddl/optimize-edge-handles";
import type { TableNodeData } from "@/lib/types/diagram";

const SIDES: HandleSide[] = ["left", "right", "top", "bottom"];

const POSITION_BY_SIDE: Record<HandleSide, Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

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
          className="!h-2 !w-2 !border-zinc-400 !bg-zinc-300 opacity-0"
        />
      ))}
    </>
  );
}

function TableNodeComponent({ data }: NodeProps) {
  const nodeData = data as TableNodeData;

  return (
    <div className="w-[260px] overflow-hidden rounded-xl border border-zinc-300/80 bg-white shadow-lg shadow-zinc-200/50 dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-black/20">
      <div className="border-b border-zinc-200 bg-gradient-to-r from-zinc-100 to-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-900">
        <p className="truncate text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {nodeData.tableName}
        </p>
      </div>
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {nodeData.columns.map((column) => {
          const isKeyColumn = column.isPrimaryKey || column.isForeignKey;

          return (
            <li
              key={column.name}
              className={`relative flex items-center justify-between gap-2 px-3 py-1.5 text-xs ${
                column.isPrimaryKey
                  ? "bg-amber-50/70 dark:bg-amber-950/20"
                  : "bg-white dark:bg-zinc-900"
              }`}
            >
              {isKeyColumn && (
                <>
                  <ColumnHandles columnName={column.name} role="target" />
                  <ColumnHandles columnName={column.name} role="source" />
                </>
              )}
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">
                  {column.name}
                </span>
                <span className="truncate text-zinc-500 dark:text-zinc-400">
                  {column.dataType}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {column.isPrimaryKey && (
                  <Key className="h-3 w-3 text-amber-600" aria-label="Primary key" />
                )}
                {column.isForeignKey && (
                  <Link2 className="h-3 w-3 text-sky-600" aria-label="Foreign key" />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export const TableNode = memo(TableNodeComponent);
