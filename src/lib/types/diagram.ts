import type { Edge, Node, Viewport } from "@xyflow/react";

export type TableColumn = {
  name: string;
  dataType: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
};

export type TableNodeData = {
  tableName: string;
  columns: TableColumn[];
};

export type TableFlowNode = Node<TableNodeData, "tableNode">;
export type DiagramEdge = Edge;

export type DiagramLayoutDirection = "vertical" | "landscape" | "web";
export type DiagramSpacing = "compact" | "normal" | "roomy";
export type DiagramGridSize = 3 | 4 | 5 | 6;
export type DiagramLayoutEngine = "elk" | "grid";
export type DiagramColumnView = "full" | "keysOnly";

export type FkEdgeData = {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  label: string;
};

export type TableGroupColor =
  | "indigo"
  | "emerald"
  | "violet"
  | "amber"
  | "rose"
  | "cyan"
  | "orange"
  | "teal";

export type TableGroup = {
  id: string;
  name: string;
  color: TableGroupColor;
};

export type DiagramGrouping = {
  groups: TableGroup[];
  assignments: Record<string, string>;
};

export type DiagramSettings = {
  layoutDirection: DiagramLayoutDirection;
  layoutEngine: DiagramLayoutEngine;
  gridSize: DiagramGridSize;
  spacing: DiagramSpacing;
  columnView: DiagramColumnView;
  hideIsolatedTables: boolean;
  showMinimap: boolean;
  autoFitOnLayout: boolean;
};

export type CanvasState = {
  nodes: TableFlowNode[];
  edges: DiagramEdge[];
  viewport?: Viewport;
  sql?: string;
  diagramSettings?: DiagramSettings;
  grouping?: DiagramGrouping;
};

export type DiagramSummary = {
  id: number;
  project_name: string;
  updated_at: string;
};

export type Diagram = DiagramSummary & {
  canvas_state: CanvasState;
};

export const EMPTY_CANVAS: CanvasState = {
  nodes: [],
  edges: [],
};
