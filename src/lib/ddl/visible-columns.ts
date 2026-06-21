import type { DiagramColumnView, TableColumn } from "@/lib/types/diagram";

export type VisibleColumn = {
  column: TableColumn;
  originalIndex: number;
};

export function getVisibleColumns(
  columns: TableColumn[],
  columnView: DiagramColumnView,
): { visible: VisibleColumn[]; hiddenCount: number } {
  if (columnView === "full") {
    return {
      visible: columns.map((column, originalIndex) => ({ column, originalIndex })),
      hiddenCount: 0,
    };
  }

  const visible = columns
    .map((column, originalIndex) => ({ column, originalIndex }))
    .filter(({ column }) => column.isPrimaryKey || column.isForeignKey);

  if (visible.length === 0 && columns.length > 0) {
    return {
      visible: [{ column: columns[0], originalIndex: 0 }],
      hiddenCount: Math.max(columns.length - 1, 0),
    };
  }

  return {
    visible,
    hiddenCount: columns.length - visible.length,
  };
}

export function visibleRowIndexForColumn(
  columns: TableColumn[],
  columnName: string,
  columnView: DiagramColumnView,
): number {
  const { visible } = getVisibleColumns(columns, columnView);
  const index = visible.findIndex(({ column }) => column.name === columnName);
  return index >= 0 ? index : 0;
}
