import type { Edge } from "@xyflow/react";
import { mergeDiagramSettings, spacingMultiplier } from "@/lib/diagram-settings";
import { optimizeEdgeHandles } from "@/lib/ddl/optimize-edge-handles";
import { TABLE_WIDTH, estimateTableNodeHeight } from "./node-metrics";
import type { DiagramSettings, TableFlowNode } from "@/lib/types/diagram";

const BASE_HORIZONTAL_GAP = 48;
const BASE_VERTICAL_GAP = 72;
const BASE_LEVEL_GAP = 96;
const BASE_ORPHAN_SECTION_GAP = 120;

type LayoutGaps = {
  horizontalGap: number;
  verticalGap: number;
  levelGap: number;
  orphanSectionGap: number;
};

function resolveGaps(settings: DiagramSettings): LayoutGaps {
  const scale = spacingMultiplier(settings.spacing);
  return {
    horizontalGap: Math.round(BASE_HORIZONTAL_GAP * scale),
    verticalGap: Math.round(BASE_VERTICAL_GAP * scale),
    levelGap: Math.round(BASE_LEVEL_GAP * scale),
    orphanSectionGap: Math.round(BASE_ORPHAN_SECTION_GAP * scale),
  };
}

function buildHierarchy(
  nodeIds: string[],
  edges: Edge[],
): {
  levels: Map<number, string[]>;
  orphans: string[];
} {
  const childrenByParent = new Map<string, string[]>();
  const parentCount = new Map<string, number>();

  for (const id of nodeIds) {
    childrenByParent.set(id, []);
    parentCount.set(id, 0);
  }

  for (const edge of edges) {
    const parent = edge.target;
    const child = edge.source;
    if (!childrenByParent.has(parent) || !parentCount.has(child)) continue;
    childrenByParent.get(parent)!.push(child);
    parentCount.set(child, (parentCount.get(child) ?? 0) + 1);
  }

  const roots = nodeIds
    .filter((id) => (parentCount.get(id) ?? 0) === 0)
    .sort((a, b) => a.localeCompare(b));

  const levels = new Map<number, string[]>();
  const assigned = new Set<string>();
  const queue: Array<{ id: string; level: number }> = roots.map((id) => ({ id, level: 0 }));

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    if (assigned.has(id)) continue;
    assigned.add(id);

    const bucket = levels.get(level) ?? [];
    bucket.push(id);
    levels.set(level, bucket);

    const children = [...(childrenByParent.get(id) ?? [])].sort((a, b) => a.localeCompare(b));
    for (const child of children) {
      if (!assigned.has(child)) {
        queue.push({ id: child, level: level + 1 });
      }
    }
  }

  const orphans = nodeIds.filter((id) => !assigned.has(id)).sort((a, b) => a.localeCompare(b));
  for (const level of levels.keys()) {
    levels.get(level)!.sort((a, b) => a.localeCompare(b));
  }

  return { levels, orphans };
}

function layoutGridVertical(
  nodeIds: string[],
  nodeById: Map<string, TableFlowNode>,
  startX: number,
  startY: number,
  gridSize: number,
  gaps: LayoutGaps,
): { positions: Map<string, { x: number; y: number }>; width: number; height: number } {
  const positions = new Map<string, { x: number; y: number }>();
  if (nodeIds.length === 0) {
    return { positions, width: 0, height: 0 };
  }

  let x = startX;
  let y = startY;
  let rowHeight = 0;
  let maxWidth = 0;
  let col = 0;

  for (const id of nodeIds) {
    const node = nodeById.get(id);
    if (!node) continue;

    const height = estimateTableNodeHeight(node);
    positions.set(id, { x, y });
    rowHeight = Math.max(rowHeight, height);
    maxWidth = Math.max(maxWidth, x + TABLE_WIDTH - startX);
    col++;

    if (col >= gridSize) {
      col = 0;
      x = startX;
      y += rowHeight + gaps.verticalGap;
      rowHeight = 0;
    } else {
      x += TABLE_WIDTH + gaps.horizontalGap;
    }
  }

  if (col > 0) {
    y += rowHeight;
  }

  return {
    positions,
    width: maxWidth,
    height: y - startY,
  };
}

function layoutGridLandscape(
  nodeIds: string[],
  nodeById: Map<string, TableFlowNode>,
  startX: number,
  startY: number,
  gridSize: number,
  gaps: LayoutGaps,
): { positions: Map<string, { x: number; y: number }>; width: number; height: number } {
  const positions = new Map<string, { x: number; y: number }>();
  if (nodeIds.length === 0) {
    return { positions, width: 0, height: 0 };
  }

  let x = startX;
  let y = startY;
  let colWidth = 0;
  let maxHeight = 0;
  let row = 0;

  for (const id of nodeIds) {
    const node = nodeById.get(id);
    if (!node) continue;

    const height = estimateTableNodeHeight(node);
    positions.set(id, { x, y });
    colWidth = Math.max(colWidth, TABLE_WIDTH);
    maxHeight = Math.max(maxHeight, y + height - startY);
    row++;

    if (row >= gridSize) {
      row = 0;
      x += colWidth + gaps.horizontalGap;
      y = startY;
      colWidth = 0;
    } else {
      y += height + gaps.verticalGap;
    }
  }

  const totalWidth = row > 0 ? x + colWidth - startX : x + colWidth - startX;

  return {
    positions,
    width: totalWidth,
    height: maxHeight,
  };
}

function layoutLevelGrid(
  nodeIds: string[],
  nodeById: Map<string, TableFlowNode>,
  startX: number,
  startY: number,
  settings: DiagramSettings,
  gaps: LayoutGaps,
): { positions: Map<string, { x: number; y: number }>; width: number; height: number } {
  if (settings.layoutDirection === "landscape") {
    return layoutGridLandscape(nodeIds, nodeById, startX, startY, settings.gridSize, gaps);
  }
  return layoutGridVertical(nodeIds, nodeById, startX, startY, settings.gridSize, gaps);
}

function computeLayout(
  nodes: TableFlowNode[],
  edges: Edge[],
  settings: DiagramSettings,
): Map<string, { x: number; y: number }> {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const nodeIds = nodes.map((node) => node.id);
  const { levels, orphans } = buildHierarchy(nodeIds, edges);
  const positions = new Map<string, { x: number; y: number }>();
  const gaps = resolveGaps(settings);

  let offsetX = 0;
  let offsetY = 0;
  const sortedLevels = [...levels.keys()].sort((a, b) => a - b);

  for (const level of sortedLevels) {
    const ids = levels.get(level) ?? [];
    if (ids.length === 0) continue;

    const grid = layoutLevelGrid(ids, nodeById, 0, 0, settings, gaps);

    for (const [id, pos] of grid.positions) {
      positions.set(id, {
        x: pos.x + offsetX,
        y: pos.y + offsetY,
      });
    }

    if (settings.layoutDirection === "landscape") {
      offsetX += grid.width + gaps.levelGap;
    } else {
      offsetY += grid.height + gaps.levelGap;
    }
  }

  if (orphans.length > 0) {
    if (settings.layoutDirection === "landscape") {
      offsetX += gaps.orphanSectionGap - gaps.levelGap;
    } else {
      offsetY += gaps.orphanSectionGap - gaps.levelGap;
    }

    const grid = layoutLevelGrid(orphans, nodeById, 0, 0, settings, gaps);
    for (const [id, pos] of grid.positions) {
      positions.set(id, {
        x: pos.x + offsetX,
        y: pos.y + offsetY,
      });
    }
  }

  return positions;
}

export function layoutBounds(nodes: TableFlowNode[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + TABLE_WIDTH);
    maxY = Math.max(maxY, node.position.y + estimateTableNodeHeight(node));
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function layoutTableNodes(
  nodes: TableFlowNode[],
  edges: Edge[],
  preservedPositions: Map<string, { x: number; y: number }> = new Map(),
  settings?: DiagramSettings,
): TableFlowNode[] {
  if (nodes.length === 0) return nodes;

  const resolvedSettings = mergeDiagramSettings(settings);
  const autoPositions = computeLayout(nodes, edges, resolvedSettings);

  return nodes.map((node) => ({
    ...node,
    position: preservedPositions.get(node.id) ?? autoPositions.get(node.id) ?? node.position,
  }));
}

export function relayoutNodes(
  nodes: TableFlowNode[],
  edges: Edge[],
  settings?: DiagramSettings,
): { nodes: TableFlowNode[]; edges: Edge[] } {
  const laidOutNodes = layoutTableNodes(nodes, edges, new Map(), settings);
  return {
    nodes: laidOutNodes,
    edges: optimizeEdgeHandles(laidOutNodes, edges),
  };
}
