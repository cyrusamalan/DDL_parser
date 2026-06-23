import type { Edge } from "@xyflow/react";
import { spacingMultiplier } from "@/lib/diagram-settings";
import { buildNodePartitions } from "@/lib/ddl/table-grouping";
import { TABLE_WIDTH, estimateTableNodeHeight } from "./node-metrics";
import type { DiagramGrouping, DiagramSettings, TableFlowNode } from "@/lib/types/diagram";

type LayoutGaps = {
  horizontalGap: number;
  verticalGap: number;
  levelGap: number;
};

function resolveGaps(settings: DiagramSettings): LayoutGaps {
  const scale = spacingMultiplier(settings.spacing);
  return {
    horizontalGap: Math.round(56 * scale),
    verticalGap: Math.round(88 * scale),
    levelGap: Math.round(120 * scale),
  };
}

function buildAdjacency(nodeIds: string[], edges: Edge[]): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();
  for (const id of nodeIds) {
    adjacency.set(id, new Set());
  }
  for (const edge of edges) {
    if (!adjacency.has(edge.source) || !adjacency.has(edge.target)) continue;
    adjacency.get(edge.source)!.add(edge.target);
    adjacency.get(edge.target)!.add(edge.source);
  }
  return adjacency;
}

function connectedComponents(nodeIds: string[], adjacency: Map<string, Set<string>>): string[][] {
  const remaining = new Set(nodeIds);
  const components: string[][] = [];

  while (remaining.size > 0) {
    const start = [...remaining].sort((a, b) => a.localeCompare(b))[0];
    const component: string[] = [];
    const queue = [start];
    remaining.delete(start);

    while (queue.length > 0) {
      const id = queue.shift()!;
      component.push(id);
      for (const neighbor of adjacency.get(id) ?? []) {
        if (remaining.delete(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    component.sort((a, b) => a.localeCompare(b));
    components.push(component);
  }

  return components.sort((a, b) => b.length - a.length);
}

function pickHub(component: string[], adjacency: Map<string, Set<string>>): string {
  let hub = component[0];
  let bestDegree = -1;
  for (const id of component) {
    const degree = adjacency.get(id)?.size ?? 0;
    if (degree > bestDegree) {
      bestDegree = degree;
      hub = id;
    }
  }
  return hub;
}

function chunkIds(ids: string[], maxPerRing: number): string[][] {
  if (ids.length <= maxPerRing) return [ids];
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += maxPerRing) {
    chunks.push(ids.slice(i, i + maxPerRing));
  }
  return chunks;
}

function buildWebRings(
  component: string[],
  edges: Edge[],
  maxPerRing: number,
): string[][] {
  const adjacency = buildAdjacency(component, edges);
  const hub = pickHub(component, adjacency);

  const depth = new Map<string, number>();
  const queue: string[] = [hub];
  depth.set(hub, 0);

  while (queue.length > 0) {
    const id = queue.shift()!;
    const nextDepth = depth.get(id)! + 1;
    for (const neighbor of adjacency.get(id) ?? []) {
      if (!depth.has(neighbor)) {
        depth.set(neighbor, nextDepth);
        queue.push(neighbor);
      }
    }
  }

  for (const id of component) {
    if (!depth.has(id)) {
      depth.set(id, (Math.max(...depth.values(), 0)) + 1);
    }
  }

  const byDepth = new Map<number, string[]>();
  for (const id of component) {
    const level = depth.get(id) ?? 0;
    const bucket = byDepth.get(level) ?? [];
    bucket.push(id);
    byDepth.set(level, bucket);
  }

  const rings: string[][] = [];
  for (const level of [...byDepth.keys()].sort((a, b) => a - b)) {
    const ids = (byDepth.get(level) ?? []).sort((a, b) => a.localeCompare(b));
    for (const chunk of chunkIds(ids, maxPerRing)) {
      rings.push(chunk);
    }
  }

  return rings;
}

function minRingRadius(nodeCount: number, gaps: LayoutGaps): number {
  if (nodeCount <= 1) return 0;
  const slotWidth = TABLE_WIDTH + gaps.horizontalGap;
  return (nodeCount * slotWidth) / (2 * Math.PI);
}

// Circular mean of angles — handles wrap-around correctly.
function circularMean(angles: number[]): number {
  const sinSum = angles.reduce((s, a) => s + Math.sin(a), 0);
  const cosSum = angles.reduce((s, a) => s + Math.cos(a), 0);
  return Math.atan2(sinSum, cosSum);
}

// Average angle of a node's already-placed neighbors, or null if none placed yet.
function barycenterAngle(
  nodeId: string,
  placedAngles: Map<string, number>,
  adjacency: Map<string, Set<string>>,
): number | null {
  const angles: number[] = [];
  for (const neighbor of adjacency.get(nodeId) ?? []) {
    const a = placedAngles.get(neighbor);
    if (a !== undefined) angles.push(a);
  }
  return angles.length > 0 ? circularMean(angles) : null;
}

function placeWebRings(
  rings: string[][],
  nodeById: Map<string, TableFlowNode>,
  centerX: number,
  centerY: number,
  settings: DiagramSettings,
  gaps: LayoutGaps,
  edges: Edge[],
): { positions: Map<string, { x: number; y: number }>; width: number; height: number } {
  const positions = new Map<string, { x: number; y: number }>();
  if (rings.length === 0) {
    return { positions, width: 0, height: 0 };
  }

  const allNodeIds = rings.flat();
  const adjacency = buildAdjacency(allNodeIds, edges);
  // Tracks the placed angle for each node so subsequent rings can sort by barycenter.
  const placedAngles = new Map<string, number>();

  let orbit = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const track = (x: number, y: number, height: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + TABLE_WIDTH);
    maxY = Math.max(maxY, y + height);
  };

  for (let ringIndex = 0; ringIndex < rings.length; ringIndex++) {
    const ring = rings[ringIndex];
    const isSoloHub = ring.length === 1 && ringIndex === 0 && rings.length > 1;

    if (isSoloHub) {
      const node = nodeById.get(ring[0]);
      if (!node) continue;
      const height = estimateTableNodeHeight(node, settings.columnView);
      const x = centerX - TABLE_WIDTH / 2;
      const y = centerY - height / 2;
      positions.set(ring[0], { x, y });
      track(x, y, height);
      orbit = Math.max(TABLE_WIDTH, height) / 2 + gaps.levelGap;
      continue;
    }

    const ringRadius = Math.max(
      minRingRadius(ring.length, gaps),
      TABLE_WIDTH * 0.75 + gaps.horizontalGap,
    );
    orbit += ringRadius + (ringIndex === 0 ? 0 : gaps.levelGap);

    // Sort nodes by the circular mean of their already-placed neighbors' angles.
    // This minimizes crossings by grouping connected nodes in the same angular sector.
    const sorted = [...ring].sort((a, b) => {
      const aA = barycenterAngle(a, placedAngles, adjacency);
      const bA = barycenterAngle(b, placedAngles, adjacency);
      if (aA === null && bA === null) return a.localeCompare(b);
      if (aA === null) return 1;
      if (bA === null) return -1;
      return aA - bA;
    });

    const n = sorted.length;
    const angleStep = (2 * Math.PI) / n;

    // Align the ring so it "faces" its parents rather than using an arbitrary stagger.
    const neighborAngles = sorted.flatMap((id) => {
      const a = barycenterAngle(id, placedAngles, adjacency);
      return a !== null ? [a] : [];
    });
    const meanAngle =
      neighborAngles.length > 0 ? circularMean(neighborAngles) : -Math.PI / 2;
    const startAngle = meanAngle - ((n - 1) * angleStep) / 2;

    for (let i = 0; i < sorted.length; i++) {
      const id = sorted[i];
      const node = nodeById.get(id);
      if (!node) continue;
      const height = estimateTableNodeHeight(node, settings.columnView);
      const angle = startAngle + i * angleStep;
      placedAngles.set(id, angle);
      const x = centerX + orbit * Math.cos(angle) - TABLE_WIDTH / 2;
      const y = centerY + orbit * Math.sin(angle) - height / 2;
      positions.set(id, { x, y });
      track(x, y, height);
    }
  }

  return {
    positions,
    width: Number.isFinite(minX) ? maxX - minX : 0,
    height: Number.isFinite(minY) ? maxY - minY : 0,
  };
}

function layoutComponentWeb(
  component: string[],
  edges: Edge[],
  nodes: TableFlowNode[],
  settings: DiagramSettings,
  gaps: LayoutGaps,
  centerX: number,
  centerY: number,
): { positions: Map<string, { x: number; y: number }>; width: number; height: number } {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const componentEdges = edges.filter(
    (edge) => component.includes(edge.source) && component.includes(edge.target),
  );
  const rings = buildWebRings(component, componentEdges, settings.gridSize);
  return placeWebRings(rings, nodeById, centerX, centerY, settings, gaps, componentEdges);
}

function tileLayouts(
  layouts: Array<{ positions: Map<string, { x: number; y: number }>; width: number; height: number }>,
  positions: Map<string, { x: number; y: number }>,
  gaps: LayoutGaps,
): void {
  const maxHeight = Math.max(...layouts.map((l) => l.height), 0);
  let offsetX = 0;

  for (const layout of layouts) {
    if (layout.positions.size === 0) continue;

    const xs = [...layout.positions.values()].map((p) => p.x);
    const ys = [...layout.positions.values()].map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const yShift = (maxHeight - layout.height) / 2;

    for (const [id, pos] of layout.positions) {
      positions.set(id, {
        x: pos.x - minX + offsetX,
        y: pos.y - minY + yShift,
      });
    }
    offsetX += layout.width + gaps.levelGap * 2;
  }
}

export function webLayoutTableNodes(
  nodes: TableFlowNode[],
  edges: Edge[],
  settings: DiagramSettings,
  grouping?: DiagramGrouping,
): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map();

  const gaps = resolveGaps(settings);
  const nodeIds = nodes.map((node) => node.id);
  const partitions = buildNodePartitions(grouping, nodeIds);
  const positions = new Map<string, { x: number; y: number }>();

  if (partitions) {
    const buckets = new Map<number, string[]>();
    for (const node of nodes) {
      const partition = partitions.get(node.id) ?? 0;
      const bucket = buckets.get(partition) ?? [];
      bucket.push(node.id);
      buckets.set(partition, bucket);
    }

    const layouts = [...buckets.keys()]
      .sort((a, b) => a - b)
      .map((partition) => {
        const ids = (buckets.get(partition) ?? []).sort((a, b) => a.localeCompare(b));
        if (ids.length === 0) return { positions: new Map(), width: 0, height: 0 };
        return layoutComponentWeb(ids, edges, nodes, settings, gaps, 0, 0);
      });

    tileLayouts(layouts, positions, gaps);
    return positions;
  }

  const adjacency = buildAdjacency(nodeIds, edges);
  const components = connectedComponents(nodeIds, adjacency);

  const layouts = components.map((component) =>
    layoutComponentWeb(component, edges, nodes, settings, gaps, 0, 0),
  );

  tileLayouts(layouts, positions, gaps);
  return positions;
}
