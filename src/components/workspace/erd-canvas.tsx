"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
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
import { DiagramFocusProvider, useDiagramFocus } from "@/components/workspace/diagram-focus-context";
import { DiagramToolbar } from "@/components/workspace/diagram-toolbar";
import { ErdZoomControls } from "@/components/workspace/erd-zoom-controls";
import { FkEdge } from "@/components/workspace/fk-edge";
import { SchemaInfoPanel } from "@/components/workspace/schema-info-panel";
import { TableNode } from "@/components/workspace/table-node";
import { DEFAULT_EDGE_COLOR, DEFAULT_EDGE_STYLE } from "@/lib/ddl/edge-styles";
import { getIsolatedTableIds } from "@/lib/ddl/isolated-tables";
import type { DiagramGrouping, DiagramSettings, FkEdgeData, TableFlowNode } from "@/lib/types/diagram";

const nodeTypes = { tableNode: TableNode };
const edgeTypes = { fkEdge: FkEdge };

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

type ErdCanvasFlowProps = {
  baseNodes: TableFlowNode[];
  baseEdges: Edge[];
  allNodes: TableFlowNode[];
  diagramSettings: DiagramSettings;
  grouping: DiagramGrouping;
  focusedNodeId: string | null;
  onFocusChange: (nodeId: string | null) => void;
  onNodesChange: (changes: NodeChange<TableFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onNodeDragStop: () => void;
  onViewportChange: (viewport: Viewport) => void;
  onOpenSettings: () => void;
  onFocusTable: (nodeId: string) => void;
  modelOverviewCollapsed: boolean;
  onModelOverviewCollapsedChange: (collapsed: boolean) => void;
};

function ErdCanvasFlow({
  baseNodes,
  baseEdges,
  allNodes,
  diagramSettings,
  grouping,
  focusedNodeId,
  onFocusChange,
  onNodesChange,
  onEdgesChange,
  onNodeDragStop,
  onViewportChange,
  onOpenSettings,
  onFocusTable,
  modelOverviewCollapsed,
  onModelOverviewCollapsedChange,
}: ErdCanvasFlowProps) {
  const { hoveredEdgeId, setHoveredEdgeId } = useDiagramFocus();

  const hoveredEdgeLabel = useMemo(() => {
    if (!hoveredEdgeId) return null;
    const edge = baseEdges.find((item) => item.id === hoveredEdgeId);
    return edge ? getFkLabel(edge) : null;
  }, [baseEdges, hoveredEdgeId]);

  const focusedTableName = useMemo(() => {
    if (!focusedNodeId) return null;
    return allNodes.find((node) => node.id === focusedNodeId)?.data.tableName ?? focusedNodeId;
  }, [allNodes, focusedNodeId]);

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
  }, [onFocusChange, setHoveredEdgeId]);

  const handleEdgeMouseEnter: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      setHoveredEdgeId(edge.id);
    },
    [setHoveredEdgeId],
  );

  const handleEdgeMouseLeave: EdgeMouseHandler = useCallback(() => {
    setHoveredEdgeId(null);
  }, [setHoveredEdgeId]);

  return (
    <ReactFlow
      nodes={baseNodes}
      edges={baseEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
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
        type: "fkEdge",
        style: DEFAULT_EDGE_STYLE,
        markerEnd: { type: "arrowclosed", color: DEFAULT_EDGE_COLOR },
      }}
    >
      {allNodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-8">
          <div className="max-w-sm rounded-2xl border border-zinc-200 bg-white/90 px-6 py-5 text-center shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">No tables yet</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Paste or upload DDL in the sidebar, then click Regenerate.
            </p>
          </div>
        </div>
      )}

      {allNodes.length > 0 && (
        <Panel position="top-left" className="!m-3 max-w-md">
          <DiagramToolbar nodes={allNodes} onSearchSelect={onFocusTable} />
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

      {allNodes.length > 0 && (
        <Panel position="bottom-left" className="!m-3">
          <SchemaInfoPanel
            nodes={baseNodes}
            edges={baseEdges}
            focusedNodeId={focusedNodeId}
            grouping={grouping}
            onFocusTable={onFocusTable}
            collapsed={modelOverviewCollapsed}
            onCollapsedChange={onModelOverviewCollapsedChange}
          />
        </Panel>
      )}

      {allNodes.length > 0 && (
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

      {allNodes.length > 0 && (
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
  );
}

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
  const [searchHighlightId, setSearchHighlightId] = useState<string | null>(null);
  const [modelOverviewCollapsed, setModelOverviewCollapsed] = useState(true);

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

  const fitDiagram = useCallback(() => {
    void fitView({ padding: 0.12, minZoom: 0.02, maxZoom: 1, duration: 300 });
  }, [fitView]);

  const hasInitialFitRef = useRef(false);

  useEffect(() => {
    if (hasInitialFitRef.current || baseNodes.length === 0) return;

    hasInitialFitRef.current = true;
    let innerFrame = 0;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        fitDiagram();
      });
    });

    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, [baseNodes.length, fitDiagram]);

  useEffect(() => {
    if (!fitViewOnGenerate || baseNodes.length === 0) return;

    let innerFrame = 0;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        fitDiagram();
        onFitViewComplete();
      });
    });

    return () => {
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
    };
  }, [baseNodes.length, fitDiagram, fitViewOnGenerate, onFitViewComplete]);

  useEffect(() => {
    if (!searchHighlightId) return;
    const timer = window.setTimeout(() => setSearchHighlightId(null), 2500);
    return () => window.clearTimeout(timer);
  }, [searchHighlightId]);

  const focusTable = useCallback(
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
      <DiagramFocusProvider
        focusedNodeId={focusedNodeId}
        searchHighlightId={searchHighlightId}
        edges={baseEdges}
      >
        <ErdCanvasFlow
          baseNodes={baseNodes}
          baseEdges={baseEdges}
          allNodes={nodes}
          diagramSettings={diagramSettings}
          grouping={grouping}
          focusedNodeId={focusedNodeId}
          onFocusChange={onFocusChange}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          onViewportChange={onViewportChange}
          onOpenSettings={onOpenSettings}
          onFocusTable={focusTable}
          modelOverviewCollapsed={modelOverviewCollapsed}
          onModelOverviewCollapsedChange={setModelOverviewCollapsed}
        />
      </DiagramFocusProvider>
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
