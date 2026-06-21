"use client";

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  Background,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type EdgeChange,
  type EdgeMouseHandler,
  type NodeChange,
  type OnMove,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Settings2, X } from "lucide-react";
import { DiagramDisplayProvider } from "@/components/workspace/diagram-display-context";
import { DiagramToolbar } from "@/components/workspace/diagram-toolbar";
import { ErdZoomControls } from "@/components/workspace/erd-zoom-controls";
import { SchemaInfoPanel } from "@/components/workspace/schema-info-panel";
import { TableNode } from "@/components/workspace/table-node";
import {
  DEFAULT_EDGE_COLOR,
  DEFAULT_EDGE_STYLE,
  DIMMED_EDGE_STYLE,
  FOCUS_EDGE_COLOR,
  FOCUS_EDGE_STYLE,
  HOVER_EDGE_COLOR,
  HOVER_EDGE_STYLE,
} from "@/lib/ddl/edge-styles";
import { getIsolatedTableIds } from "@/lib/ddl/isolated-tables";
import type { DiagramGrouping, DiagramSettings, FkEdgeData, TableFlowNode } from "@/lib/types/diagram";

const nodeTypes = { tableNode: TableNode };

function getConnectedNodeIds(focusedId: string, edges: Edge[]): Set<string> {
  const connected = new Set<string>([focusedId]);
  for (const edge of edges) {
    if (edge.source === focusedId) connected.add(edge.target);
    if (edge.target === focusedId) connected.add(edge.source);
  }
  return connected;
}

function isEdgeConnectedToFocus(edge: Edge, focusedId: string): boolean {
  return edge.source === focusedId || edge.target === focusedId;
}

function getFkLabel(edge: Edge): string | null {
  const data = edge.data as FkEdgeData | undefined;
  return data?.label ?? null;
}

type ErdCanvasProps = {
  nodes: TableFlowNode[];
  edges: Edge[];
  diagramSettings: DiagramSettings;
  grouping: DiagramGrouping;
  focusedNodeId: string | null;
  onFocusChange: (nodeId: string | null) => void;
  onNodesChange: (changes: NodeChange<TableFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onNodeDragStop: () => void;
  onViewportChange: (viewport: Viewport) => void;
  fitViewOnGenerate: boolean;
  onFitViewComplete: () => void;
  onOpenSettings: () => void;
};

function ErdCanvasInner({
  nodes,
  edges,
  diagramSettings,
  grouping,
  focusedNodeId,
  onFocusChange,
  onNodesChange,
  onEdgesChange,
  onNodeDragStop,
  onViewportChange,
  fitViewOnGenerate,
  onFitViewComplete,
  onOpenSettings,
}: ErdCanvasProps) {
  const { fitView } = useReactFlow();
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [searchHighlightId, setSearchHighlightId] = useState<string | null>(null);

  const isolatedIds = useMemo(
    () => getIsolatedTableIds(nodes.map((node) => node.id), edges),
    [nodes, edges],
  );

  const visibleNodeIds = useMemo(() => {
    if (!diagramSettings.hideIsolatedTables) {
      return new Set(nodes.map((node) => node.id));
    }
    return new Set(nodes.filter((node) => !isolatedIds.has(node.id)).map((node) => node.id));
  }, [diagramSettings.hideIsolatedTables, isolatedIds, nodes]);

  const baseNodes = useMemo(
    () => nodes.filter((node) => visibleNodeIds.has(node.id)),
    [nodes, visibleNodeIds],
  );

  const baseEdges = useMemo(
    () => edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)),
    [edges, visibleNodeIds],
  );

  const connectedNodeIds = useMemo(
    () => (focusedNodeId ? getConnectedNodeIds(focusedNodeId, baseEdges) : null),
    [focusedNodeId, baseEdges],
  );

  const styledEdges = useMemo(() => {
    if (!focusedNodeId && !hoveredEdgeId) return baseEdges;

    return baseEdges.map((edge) => {
      const isHovered = hoveredEdgeId === edge.id;
      const isFocused = focusedNodeId && isEdgeConnectedToFocus(edge, focusedNodeId);
      const isDimmedByFocus = focusedNodeId && !isFocused;

      if (isFocused) {
        return {
          ...edge,
          animated: true,
          style: { ...edge.style, ...FOCUS_EDGE_STYLE },
          markerEnd: { type: "arrowclosed" as const, color: FOCUS_EDGE_COLOR },
        };
      }

      if (isDimmedByFocus) {
        return {
          ...edge,
          animated: false,
          style: { ...edge.style, ...DIMMED_EDGE_STYLE },
          markerEnd: { type: "arrowclosed" as const, color: DEFAULT_EDGE_COLOR },
        };
      }

      if (isHovered) {
        return {
          ...edge,
          animated: false,
          style: { ...edge.style, ...HOVER_EDGE_STYLE },
          markerEnd: { type: "arrowclosed" as const, color: HOVER_EDGE_COLOR },
        };
      }

      return {
        ...edge,
        animated: false,
        style: { ...edge.style, ...DEFAULT_EDGE_STYLE },
        markerEnd: { type: "arrowclosed" as const, color: DEFAULT_EDGE_COLOR },
      };
    });
  }, [baseEdges, focusedNodeId, hoveredEdgeId]);

  const displayNodes = useMemo(() => {
    if (!focusedNodeId && !searchHighlightId) return baseNodes;

    return baseNodes.map((node) => {
      let className: string | undefined;
      const style = { ...node.style };

      if (searchHighlightId === node.id) {
        className = "ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-100 dark:ring-offset-zinc-950";
      }

      if (!focusedNodeId || !connectedNodeIds) {
        return className ? { ...node, className, style } : node;
      }

      if (node.id === focusedNodeId) {
        return {
          ...node,
          style: { ...style, opacity: 1, zIndex: 10 },
          className:
            "ring-2 ring-sky-500 ring-offset-2 ring-offset-zinc-100 dark:ring-offset-zinc-950",
        };
      }

      if (connectedNodeIds.has(node.id)) {
        return {
          ...node,
          style: { ...style, opacity: 1, zIndex: 5 },
          className: "ring-1 ring-sky-300/80 dark:ring-sky-600/80",
        };
      }

      return {
        ...node,
        style: { ...style, opacity: 0.35 },
      };
    });
  }, [baseNodes, connectedNodeIds, focusedNodeId, searchHighlightId]);

  const renderEdges = focusedNodeId || hoveredEdgeId ? styledEdges : baseEdges;
  const renderNodes = focusedNodeId || searchHighlightId ? displayNodes : baseNodes;

  const hoveredEdgeLabel = useMemo(() => {
    if (!hoveredEdgeId) return null;
    const edge = baseEdges.find((item) => item.id === hoveredEdgeId);
    return edge ? getFkLabel(edge) : null;
  }, [baseEdges, hoveredEdgeId]);

  const focusedTableName = useMemo(() => {
    if (!focusedNodeId) return null;
    return nodes.find((node) => node.id === focusedNodeId)?.data.tableName ?? focusedNodeId;
  }, [focusedNodeId, nodes]);

  useEffect(() => {
    if (!fitViewOnGenerate || nodes.length === 0) return;
    fitView({ padding: 0.12, minZoom: 0.02, maxZoom: 1, duration: 300 });
    onFitViewComplete();
  }, [fitView, fitViewOnGenerate, nodes.length, onFitViewComplete]);

  useEffect(() => {
    if (!searchHighlightId) return;
    const timer = window.setTimeout(() => setSearchHighlightId(null), 2500);
    return () => window.clearTimeout(timer);
  }, [searchHighlightId]);

  const handleMoveEnd: OnMove = useCallback(
    (_event, viewport) => {
      onViewportChange(viewport);
    },
    [onViewportChange],
  );

  const handleNodeClick = useCallback(
    (_event: MouseEvent, node: TableFlowNode) => {
      onFocusChange(focusedNodeId === node.id ? null : node.id);
    },
    [focusedNodeId, onFocusChange],
  );

  const handlePaneClick = useCallback(() => {
    onFocusChange(null);
    setHoveredEdgeId(null);
  }, [onFocusChange]);

  const handleEdgeMouseEnter: EdgeMouseHandler = useCallback((_event, edge) => {
    setHoveredEdgeId(edge.id);
  }, []);

  const handleEdgeMouseLeave: EdgeMouseHandler = useCallback(() => {
    setHoveredEdgeId(null);
  }, []);

  const handleSearchSelect = useCallback(
    (nodeId: string) => {
      const node = nodes.find((item) => item.id === nodeId);
      if (!node) return;

      onFocusChange(nodeId);
      setSearchHighlightId(nodeId);
      void fitView({
        nodes: [{ id: nodeId }],
        padding: 0.35,
        duration: 400,
        maxZoom: 1.2,
      });
    },
    [fitView, nodes, onFocusChange],
  );

  return (
    <DiagramDisplayProvider columnView={diagramSettings.columnView} grouping={grouping}>
      <ReactFlow
        nodes={renderNodes}
        edges={renderEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onEdgeMouseEnter={handleEdgeMouseEnter}
        onEdgeMouseLeave={handleEdgeMouseLeave}
        onMoveEnd={handleMoveEnd}
        fitView={false}
        panOnScroll
        zoomOnScroll
        nodesDraggable
        nodesConnectable={false}
        edgesReconnectable={false}
        onlyRenderVisibleElements
        selectNodesOnDrag={false}
        autoPanOnNodeDrag={false}
        minZoom={0.02}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: DEFAULT_EDGE_STYLE,
          markerEnd: { type: "arrowclosed", color: DEFAULT_EDGE_COLOR },
        }}
      >
        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-8">
            <div className="max-w-sm rounded-2xl border border-zinc-200 bg-white/90 px-6 py-5 text-center shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">No tables yet</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Paste or upload DDL in the sidebar, then click Regenerate.
              </p>
            </div>
          </div>
        )}

        {nodes.length > 0 && (
          <Panel position="top-left" className="!m-3 max-w-md">
            <DiagramToolbar nodes={nodes} onSearchSelect={handleSearchSelect} />
          </Panel>
        )}

        {focusedTableName && (
          <Panel position="bottom-right" className="!m-3 !mb-[9.5rem]">
            <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50/95 px-3 py-2 text-xs text-sky-900 shadow-md backdrop-blur dark:border-sky-800 dark:bg-sky-950/90 dark:text-sky-100">
              <span>
                Connections for <strong>{focusedTableName}</strong> — click canvas to clear
              </span>
              <button
                type="button"
                onClick={() => onFocusChange(null)}
                className="rounded p-0.5 text-sky-700 transition hover:bg-sky-200/60 dark:text-sky-300 dark:hover:bg-sky-800/60"
                aria-label="Clear focus"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </Panel>
        )}

        {hoveredEdgeLabel && (
          <Panel position="top-center" className="!mt-3">
            <div className="rounded-lg border border-zinc-200 bg-white/95 px-3 py-1.5 font-mono text-xs text-zinc-800 shadow-md backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-100">
              {hoveredEdgeLabel}
            </div>
          </Panel>
        )}

        {nodes.length > 0 && (
          <Panel position="bottom-left" className="!m-3">
            <SchemaInfoPanel
              nodes={baseNodes}
              edges={baseEdges}
              focusedNodeId={focusedNodeId}
              grouping={grouping}
            />
          </Panel>
        )}

        {nodes.length > 0 && (
          <Panel position="top-right" className="!m-3">
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-md transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              aria-label="Diagram settings"
              title="Diagram settings"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </Panel>
        )}

        <Background gap={20} size={1} color="#d4d4d8" className="dark:opacity-40" />

        {nodes.length > 0 && (
          <Panel position="bottom-right" className="!m-3">
            <div className="erd-canvas-chrome flex items-end gap-2">
              {diagramSettings.showMinimap && (
                <MiniMap
                  pannable
                  zoomable
                  className="erd-minimap"
                  bgColor="#ffffff"
                  nodeColor="#e4e4e7"
                  nodeStrokeColor="#000000"
                  nodeStrokeWidth={1.5}
                  nodeBorderRadius={4}
                  maskColor="rgba(240, 240, 240, 0.45)"
                  maskStrokeColor="#000000"
                  maskStrokeWidth={2}
                />
              )}
              <ErdZoomControls />
            </div>
          </Panel>
        )}
      </ReactFlow>
    </DiagramDisplayProvider>
  );
}

export function ErdCanvas(props: ErdCanvasProps) {
  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <ErdCanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
