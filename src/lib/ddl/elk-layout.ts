import type { Edge } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import { mergeDiagramSettings, spacingMultiplier } from "@/lib/diagram-settings";
import { TABLE_WIDTH, estimateTableNodeHeight } from "./node-metrics";
import type { DiagramSettings, TableFlowNode } from "@/lib/types/diagram";

const elk = new ELK();

const BASE_NODE_SPACING = 48;
const BASE_LAYER_SPACING = 96;

function elkDirection(settings: DiagramSettings): string {
  return settings.layoutDirection === "landscape" ? "RIGHT" : "DOWN";
}

function elkSpacing(settings: DiagramSettings): { nodeNode: number; layer: number } {
  const scale = spacingMultiplier(settings.spacing);
  return {
    nodeNode: Math.round(BASE_NODE_SPACING * scale),
    layer: Math.round(BASE_LAYER_SPACING * scale),
  };
}

function buildElkGraph(nodes: TableFlowNode[], edges: Edge[], settings: DiagramSettings) {
  const spacing = elkSpacing(settings);

  return {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": elkDirection(settings),
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.spacing.nodeNode": String(spacing.nodeNode),
      "elk.layered.spacing.nodeNodeBetweenLayers": String(spacing.layer),
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: TABLE_WIDTH,
      height: estimateTableNodeHeight(node, settings.columnView),
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };
}

export async function elkLayoutTableNodes(
  nodes: TableFlowNode[],
  edges: Edge[],
  settings?: DiagramSettings,
): Promise<Map<string, { x: number; y: number }>> {
  if (nodes.length === 0) return new Map();

  const resolvedSettings = mergeDiagramSettings(settings);
  const graph = buildElkGraph(nodes, edges, resolvedSettings);
  const layouted = await elk.layout(graph);

  const positions = new Map<string, { x: number; y: number }>();
  for (const child of layouted.children ?? []) {
    if (child.id && typeof child.x === "number" && typeof child.y === "number") {
      positions.set(child.id, { x: child.x, y: child.y });
    }
  }

  return positions;
}
