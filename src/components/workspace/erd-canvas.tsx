"use client";

import { useCallback, useEffect } from "react";
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type OnMove,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Settings2 } from "lucide-react";
import { TableNode } from "@/components/workspace/table-node";
import type { TableFlowNode } from "@/lib/types/diagram";

const nodeTypes = { tableNode: TableNode };

type ErdCanvasProps = {
  nodes: TableFlowNode[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange<TableFlowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onNodeDragStop: () => void;
  onViewportChange: (viewport: Viewport) => void;
  fitViewOnGenerate: boolean;
  onFitViewComplete: () => void;
  showMinimap: boolean;
  onOpenSettings: () => void;
};

function ErdCanvasInner({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeDragStop,
  onViewportChange,
  fitViewOnGenerate,
  onFitViewComplete,
  showMinimap,
  onOpenSettings,
}: ErdCanvasProps) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (!fitViewOnGenerate || nodes.length === 0) return;

    fitView({ padding: 0.12, minZoom: 0.02, maxZoom: 1, duration: 300 });
    onFitViewComplete();
  }, [fitView, fitViewOnGenerate, nodes.length, onFitViewComplete]);

  const handleMoveEnd: OnMove = useCallback(
    (_event, viewport) => {
      onViewportChange(viewport);
    },
    [onViewportChange],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={onNodeDragStop}
      onMoveEnd={handleMoveEnd}
      fitView={false}
      panOnScroll
      zoomOnScroll
      nodesDraggable
      nodesConnectable={false}
      edgesReconnectable={false}
      minZoom={0.02}
      maxZoom={2.5}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{
        type: "smoothstep",
        style: { stroke: "#71717a", strokeWidth: 1.5 },
        markerEnd: { type: "arrowclosed", color: "#71717a" },
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

      <Background gap={20} size={1} color="#d4d4d8" />
      <Controls className="!rounded-lg !border-zinc-200 !shadow-md dark:!border-zinc-700" />
      {showMinimap && (
        <MiniMap
          pannable
          zoomable
          className="!rounded-lg !border-zinc-200 !shadow-md dark:!border-zinc-700"
          maskColor="rgb(24 24 27 / 0.08)"
        />
      )}
    </ReactFlow>
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
