"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Edge } from "@xyflow/react";

export type NodeVisualState = "focused" | "connected" | "dimmed" | "search" | "normal";

export type EdgeVisualState = "focused" | "dimmed" | "hovered" | "normal";

type DiagramFocusContextValue = {
  focusedNodeId: string | null;
  hoveredEdgeId: string | null;
  searchHighlightId: string | null;
  setHoveredEdgeId: (edgeId: string | null) => void;
  getNodeVisualState: (nodeId: string) => NodeVisualState;
  getEdgeVisualState: (edge: Pick<Edge, "id" | "source" | "target">) => EdgeVisualState;
};

const DiagramFocusContext = createContext<DiagramFocusContextValue>({
  focusedNodeId: null,
  hoveredEdgeId: null,
  searchHighlightId: null,
  setHoveredEdgeId: () => {},
  getNodeVisualState: () => "normal",
  getEdgeVisualState: () => "normal",
});

function getConnectedNodeIds(focusedId: string, edges: Edge[]): Set<string> {
  const connected = new Set<string>([focusedId]);
  for (const edge of edges) {
    if (edge.source === focusedId) connected.add(edge.target);
    if (edge.target === focusedId) connected.add(edge.source);
  }
  return connected;
}

export function DiagramFocusProvider({
  focusedNodeId,
  searchHighlightId,
  edges,
  children,
}: {
  focusedNodeId: string | null;
  searchHighlightId: string | null;
  edges: Edge[];
  children: ReactNode;
}) {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  const connectedNodeIds = useMemo(
    () => (focusedNodeId ? getConnectedNodeIds(focusedNodeId, edges) : null),
    [edges, focusedNodeId],
  );

  const value = useMemo<DiagramFocusContextValue>(() => {
    function getNodeVisualState(nodeId: string): NodeVisualState {
      if (searchHighlightId === nodeId) return "search";
      if (!focusedNodeId) return "normal";
      if (nodeId === focusedNodeId) return "focused";
      if (connectedNodeIds?.has(nodeId)) return "connected";
      return "dimmed";
    }

    function getEdgeVisualState(edge: Pick<Edge, "id" | "source" | "target">): EdgeVisualState {
      if (hoveredEdgeId === edge.id) return "hovered";
      if (!focusedNodeId) return "normal";
      if (edge.source === focusedNodeId || edge.target === focusedNodeId) return "focused";
      return "dimmed";
    }

    return {
      focusedNodeId,
      hoveredEdgeId,
      searchHighlightId,
      setHoveredEdgeId,
      getNodeVisualState,
      getEdgeVisualState,
    };
  }, [connectedNodeIds, focusedNodeId, hoveredEdgeId, searchHighlightId]);

  return (
    <DiagramFocusContext.Provider value={value}>{children}</DiagramFocusContext.Provider>
  );
}

export function useDiagramFocus() {
  return useContext(DiagramFocusContext);
}
