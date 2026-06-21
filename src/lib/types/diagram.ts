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

export type DiagramLayoutDirection = "vertical" | "landscape";
export type DiagramSpacing = "compact" | "normal" | "roomy";
export type DiagramGridSize = 3 | 4 | 5 | 6;

export type DiagramSettings = {
  layoutDirection: DiagramLayoutDirection;
  gridSize: DiagramGridSize;
  spacing: DiagramSpacing;
  showMinimap: boolean;
  autoFitOnLayout: boolean;
};

export type CanvasState = {
  nodes: TableFlowNode[];
  edges: DiagramEdge[];
  viewport?: Viewport;
  sql?: string;
  diagramSettings?: DiagramSettings;
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
