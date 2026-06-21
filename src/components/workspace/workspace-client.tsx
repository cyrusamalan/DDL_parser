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
import { autoGroupTables } from "@/actions/auto-group-tables";
import { AiGroupingPreviewDialog } from "@/components/workspace/ai-grouping-preview-dialog";
import { DiagramSettingsDialog } from "@/components/workspace/diagram-settings-dialog";
import { ErdCanvas } from "@/components/workspace/erd-canvas";
import { SqlImportPanel } from "@/components/workspace/sql-import-panel";
import { TableGroupsPanel } from "@/components/workspace/table-groups-panel";
import {
  useRegisterWorkspaceHeader,
  type SaveStatus,
} from "@/components/workspace/workspace-header-context";
import { optimizeEdgeHandles } from "@/lib/ddl/optimize-edge-handles";
import { relayoutNodes } from "@/lib/ddl/layout-graph";
import {
  assignTable,
  createGroup,
  deleteGroup,
  mergeGrouping,
  pruneAssignments,
  renameGroup,
  setGroupColor,
  unassignTable,
} from "@/lib/ddl/table-grouping";
import { mergeDiagramSettings } from "@/lib/diagram-settings";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";
import { APP_MAIN_HEIGHT } from "@/lib/layout-constants";
import type { AiGroupingPreview } from "@/lib/ai/gemini-grouping";
import type {
  CanvasState,
  Diagram,
  DiagramGrouping,
  DiagramSettings,
  TableFlowNode,
  TableGroupColor,
} from "@/lib/types/diagram";

type WorkspaceClientProps = {
  diagram: Diagram;
};

export function WorkspaceClient({ diagram }: WorkspaceClientProps) {
  const initialNodes = diagram.canvas_state.nodes ?? [];
  const [projectName, setProjectName] = useState(diagram.project_name);
  const [sql, setSql] = useState(diagram.canvas_state.sql ?? "");
  const [nodes, setNodes] = useState<TableFlowNode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(() =>
    optimizeEdgeHandles(
      initialNodes,
      diagram.canvas_state.edges ?? [],
      mergeDiagramSettings(diagram.canvas_state.diagramSettings).columnView,
    ),
  );
  const [viewport, setViewport] = useState<Viewport | undefined>(
    diagram.canvas_state.viewport,
  );
  const [diagramSettings, setDiagramSettings] = useState<DiagramSettings>(() =>
    mergeDiagramSettings(diagram.canvas_state.diagramSettings),
  );
  const [grouping, setGrouping] = useState<DiagramGrouping>(() =>
    mergeGrouping(diagram.canvas_state.grouping),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [isLayouting, setIsLayouting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [sanitizeNotes, setSanitizeNotes] = useState<string[]>([]);
  const [isGenerating, startGenerateTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [groupsPanelCollapsed, setGroupsPanelCollapsed] = useState(false);
  const [fitViewOnGenerate, setFitViewOnGenerate] = useState(false);
  const [isAutoGrouping, setIsAutoGrouping] = useState(false);
  const [autoGroupError, setAutoGroupError] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<AiGroupingPreview | null>(null);
  const [aiPreviewOpen, setAiPreviewOpen] = useState(false);
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
      grouping,
    };
  }, [diagramSettings, edges, grouping, nodes, sql, viewport]);

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
  }, [nodes, edges, viewport, sql, projectName, diagramSettings, grouping, scheduleSave]);

  const onNodesChange = useCallback((changes: NodeChange<TableFlowNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((current) => applyEdgeChanges(changes, current));
  }, []);

  const onNodeDragStop = useCallback(() => {
    setNodes((currentNodes) => {
      setEdges((currentEdges) =>
        optimizeEdgeHandles(currentNodes, currentEdges, diagramSettings.columnView),
      );
      return currentNodes;
    });
    scheduleSave();
  }, [diagramSettings.columnView, scheduleSave]);

  const onViewportChange = useCallback((nextViewport: Viewport) => {
    setViewport(nextViewport);
  }, []);

  const handleCreateGroup = useCallback(() => {
    setGrouping((current) => createGroup(current));
  }, []);

  const handleRenameGroup = useCallback((groupId: string, name: string) => {
    setGrouping((current) => renameGroup(current, groupId, name));
  }, []);

  const handleSetGroupColor = useCallback((groupId: string, color: TableGroupColor) => {
    setGrouping((current) => setGroupColor(current, groupId, color));
  }, []);

  const handleDeleteGroup = useCallback((groupId: string) => {
    setGrouping((current) => deleteGroup(current, groupId));
  }, []);

  const handleAssignTable = useCallback((nodeId: string, groupId: string) => {
    setGrouping((current) => assignTable(current, nodeId, groupId));
  }, []);

  const handleUnassignTable = useCallback((nodeId: string) => {
    setGrouping((current) => unassignTable(current, nodeId));
  }, []);

  const handleAutoGroupRequest = useCallback(async () => {
    setAutoGroupError(null);
    setIsAutoGrouping(true);
    try {
      const result = await autoGroupTables(nodes, edges);
      if (!result.ok) {
        setAutoGroupError(result.error);
        return;
      }
      setAiPreview(result.preview);
      setAiPreviewOpen(true);
    } catch {
      setAutoGroupError("Failed to request AI grouping.");
    } finally {
      setIsAutoGrouping(false);
    }
  }, [edges, nodes]);

  const handleApplyAiGrouping = useCallback(() => {
    if (!aiPreview) return;
    setGrouping(aiPreview.grouping);
    setAiPreviewOpen(false);
    setAiPreview(null);
    setAutoGroupError(null);
  }, [aiPreview]);

  const handleCloseAiPreview = useCallback(() => {
    setAiPreviewOpen(false);
    setAiPreview(null);
  }, []);

  const handleGenerate = useCallback(
    (sqlOverride?: string) => {
      startGenerateTransition(async () => {
        setParseError(null);
        setSanitizeNotes([]);
        setFocusedNodeId(null);
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
        setGrouping((current) =>
          pruneAssignments(current, result.graph.nodes.map((node) => node.id)),
        );
        if (diagramSettings.autoFitOnLayout) {
          setFitViewOnGenerate(true);
        }
      });
    },
    [diagramSettings, sql],
  );

  const handleApplyLayout = useCallback(async () => {
    setIsLayouting(true);
    try {
      const { nodes: nextNodes, edges: nextEdges } = await relayoutNodes(
        nodes,
        edges,
        diagramSettings,
      );
      setNodes(nextNodes);
      setEdges(nextEdges);
      setFocusedNodeId(null);
      if (diagramSettings.autoFitOnLayout) {
        setFitViewOnGenerate(true);
      }
      setSettingsOpen(false);
    } finally {
      setIsLayouting(false);
    }
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
            diagramSettings={diagramSettings}
            grouping={grouping}
            focusedNodeId={focusedNodeId}
            onFocusChange={setFocusedNodeId}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            onViewportChange={onViewportChange}
            fitViewOnGenerate={fitViewOnGenerate}
            onFitViewComplete={() => setFitViewOnGenerate(false)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </main>
        <TableGroupsPanel
          nodes={nodes}
          grouping={grouping}
          collapsed={groupsPanelCollapsed}
          onToggleCollapsed={() => setGroupsPanelCollapsed((value) => !value)}
          onCreateGroup={handleCreateGroup}
          onRenameGroup={handleRenameGroup}
          onSetGroupColor={handleSetGroupColor}
          onDeleteGroup={handleDeleteGroup}
          onAssignTable={handleAssignTable}
          onUnassignTable={handleUnassignTable}
          isAutoGrouping={isAutoGrouping}
          autoGroupError={autoGroupError}
          onAutoGroupRequest={() => void handleAutoGroupRequest()}
        />
      </div>

      <AiGroupingPreviewDialog
        open={aiPreviewOpen}
        preview={aiPreview}
        nodes={nodes}
        onApply={handleApplyAiGrouping}
        onClose={handleCloseAiPreview}
      />

      <DiagramSettingsDialog
        open={settingsOpen}
        settings={diagramSettings}
        isApplying={isLayouting}
        onSettingsChange={setDiagramSettings}
        onApply={() => void handleApplyLayout()}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
