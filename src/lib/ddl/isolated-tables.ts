import type { Edge } from "@xyflow/react";

export function getConnectedTableIds(edges: Edge[]): Set<string> {
  const connected = new Set<string>();
  for (const edge of edges) {
    connected.add(edge.source);
    connected.add(edge.target);
  }
  return connected;
}

export function getIsolatedTableIds(nodeIds: string[], edges: Edge[]): Set<string> {
  const connected = getConnectedTableIds(edges);
  return new Set(nodeIds.filter((id) => !connected.has(id)));
}
