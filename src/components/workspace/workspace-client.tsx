"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type Viewport,
} from "@xyflow/react";
import { updateDiagram } from "@/actions/diagrams";
import { DiagramSettingsDialog } from "@/components/workspace/diagram-settings-dialog";
import { ErdCanvas } from "@/components/workspace/erd-canvas";
import { SqlImportPanel } from "@/components/workspace/sql-import-panel";
import {
  useRegisterWorkspaceHeader,
  type SaveStatus,
} from "@/components/workspace/workspace-header-context";
import { optimizeEdgeHandles } from "@/lib/ddl/optimize-edge-handles";
import { relayoutNodes } from "@/lib/ddl/layout-graph";
import { mergeDiagramSettings } from "@/lib/diagram-settings";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";
import { APP_MAIN_HEIGHT } from "@/lib/layout-constants";
import type { CanvasState, Diagram, DiagramSettings, TableFlowNode } from "@/lib/types/diagram";

type WorkspaceClientProps = {
  diagram: Diagram;
};

export function WorkspaceClient({ diagram }: WorkspaceClientProps) {
  const initialNodes = diagram.canvas_state.nodes ?? [];
  const [projectName, setProjectName] = useState(diagram.project_name);
  const [sql, setSql] = useState(diagram.canvas_state.sql ?? "");
  const [nodes, setNodes] = useState<TableFlowNode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(() =>
    optimizeEdgeHandles(initialNodes, diagram.canvas_state.edges ?? []),
  );
  const [viewport, setViewport] = useState<Viewport | undefined>(
    diagram.canvas_state.viewport,
  );
  const [diagramSettings, setDiagramSettings] = useState<DiagramSettings>(() =>
    mergeDiagramSettings(diagram.canvas_state.diagramSettings),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [sanitizeNotes, setSanitizeNotes] = useState<string[]>([]);
  const [isGenerating, startGenerateTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [fitViewOnGenerate, setFitViewOnGenerate] = useState(false);
  const skipInitialSaveRef = useRef(true);

  useRegisterWorkspaceHeader({
    projectName,
    onProjectNameChange: setProjectName,
    saveStatus,
  });

  const buildCanvasState = useCallback((): CanvasState => {
    return {
      nodes,
      edges,
      viewport,
      sql,
      diagramSettings,
    };
  }, [diagramSettings, edges, nodes, sql, viewport]);

  const persistCanvas = useCallback(async () => {
    setSaveStatus("saving");
    try {
      await updateDiagram(diagram.id, buildCanvasState(), projectName);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, [buildCanvasState, diagram.id, projectName]);

  const scheduleSave = useDebouncedCallback(() => {
    void persistCanvas();
  }, 2000);

  useEffect(() => {
    if (skipInitialSaveRef.current) {
      skipInitialSaveRef.current = false;
      return;
    }
    scheduleSave();
  }, [nodes, edges, viewport, sql, projectName, diagramSettings, scheduleSave]);

  const onNodesChange = useCallback((changes: NodeChange<TableFlowNode>[]) => {
    setNodes((current) => {
      const next = applyNodeChanges(changes, current);
      const moved = changes.some((change) => change.type === "position");
      if (moved) {
        setEdges((currentEdges) => optimizeEdgeHandles(next, currentEdges));
      }
      return next;
    });
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((current) => applyEdgeChanges(changes, current));
  }, []);

  const onNodeDragStop = useCallback(() => {
    scheduleSave();
  }, [scheduleSave]);

  const onViewportChange = useCallback((nextViewport: Viewport) => {
    setViewport(nextViewport);
  }, []);

  const handleGenerate = useCallback(
    (sqlOverride?: string) => {
      startGenerateTransition(async () => {
        setParseError(null);
        setSanitizeNotes([]);
        const sqlToParse = sqlOverride ?? sql;
        const { parsePostgresDdl } = await import("@/lib/ddl/parse-postgres-ddl");
        const result = await parsePostgresDdl(sqlToParse, [], diagramSettings);

        if (!result.ok) {
          setParseError(result.error);
          return;
        }

        setSanitizeNotes(result.sanitizeNotes);
        setNodes(result.graph.nodes);
        setEdges(result.graph.edges);
        if (diagramSettings.autoFitOnLayout) {
          setFitViewOnGenerate(true);
        }
      });
    },
    [diagramSettings, sql],
  );

  const handleApplyLayout = useCallback(() => {
    const { nodes: nextNodes, edges: nextEdges } = relayoutNodes(nodes, edges, diagramSettings);
    setNodes(nextNodes);
    setEdges(nextEdges);
    if (diagramSettings.autoFitOnLayout) {
      setFitViewOnGenerate(true);
    }
    setSettingsOpen(false);
  }, [diagramSettings, edges, nodes]);

  return (
    <div className="flex flex-col" style={{ height: APP_MAIN_HEIGHT }}>
      <div className="flex min-h-0 flex-1">
        <SqlImportPanel
          sql={sql}
          onSqlChange={setSql}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          error={parseError}
          sanitizeNotes={sanitizeNotes}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        />
        <main className="relative min-w-0 flex-1 bg-zinc-100 dark:bg-zinc-950">
          <ErdCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            onViewportChange={onViewportChange}
            fitViewOnGenerate={fitViewOnGenerate}
            onFitViewComplete={() => setFitViewOnGenerate(false)}
            showMinimap={diagramSettings.showMinimap}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </main>
      </div>

      <DiagramSettingsDialog
        open={settingsOpen}
        settings={diagramSettings}
        onSettingsChange={setDiagramSettings}
        onApply={handleApplyLayout}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
