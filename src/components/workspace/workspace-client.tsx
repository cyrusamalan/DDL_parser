"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
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
} from "@/components/workspace/workspace-header-context";
import { useDialectSelection } from "@/hooks/use-dialect-selection";
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
import { APP_MAIN_HEIGHT } from "@/lib/layout-constants";
import {
  defaultSqlFileSelection,
  isTableVisibleForSelection,
  resolveInitialSqlFileSelection,
} from "@/lib/merge-sql-files";
import { compactCanvasStateForSave } from "@/lib/canvas-state-size";
import type { AiGroupingPreview } from "@/lib/ai/gemini-grouping";
import type {
  CanvasState,
  Diagram,
  DiagramGrouping,
  DiagramSettings,
  SqlDialect,
  SqlFileEntry,
  TableFlowNode,
  TableGroupColor,
} from "@/lib/types/diagram";

type WorkspaceClientProps = {
  diagram: Diagram;
};

export function WorkspaceClient({ diagram }: WorkspaceClientProps) {
  const canvasState = diagram.canvas_state;

  const initialSqlFiles: SqlFileEntry[] = canvasState.sqlFiles ??
    (canvasState.sql?.trim()
      ? [{ id: "legacy-sql", name: "SQL", sql: canvasState.sql }]
      : []);

  const initialNodes = canvasState.nodes ?? [];
  const initialEdges = optimizeEdgeHandles(
    initialNodes,
    canvasState.edges ?? [],
    mergeDiagramSettings(canvasState.diagramSettings).columnView,
  );
  const initialGrouping = mergeGrouping(canvasState.grouping);
  const hasInitialTableGroups =
    initialGrouping.groups.length > 0 ||
    Object.keys(initialGrouping.assignments).length > 0;

  const [projectName, setProjectName] = useState(diagram.project_name);
  const [sqlFiles, setSqlFiles] = useState<SqlFileEntry[]>(initialSqlFiles);
  const [sqlFileSelection, setSqlFileSelection] = useState<string[]>(() =>
    resolveInitialSqlFileSelection(initialSqlFiles, canvasState),
  );
  const [nodes, setNodes] = useState<TableFlowNode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [viewport, setViewport] = useState<Viewport | undefined>(canvasState.viewport);
  const [diagramSettings, setDiagramSettings] = useState<DiagramSettings>(() =>
    mergeDiagramSettings(canvasState.diagramSettings),
  );
  const [grouping, setGrouping] = useState<DiagramGrouping>(() => initialGrouping);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [isLayouting, setIsLayouting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [sanitizeNotes, setSanitizeNotes] = useState<string[]>([]);
  const [isGenerating, startGenerateTransition] = useTransition();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialNodes.length > 0);
  const [groupsPanelCollapsed, setGroupsPanelCollapsed] = useState(hasInitialTableGroups);
  const [fitViewOnGenerate, setFitViewOnGenerate] = useState(false);
  const [isAutoGrouping, setIsAutoGrouping] = useState(false);
  const [autoGroupError, setAutoGroupError] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<AiGroupingPreview | null>(null);
  const [aiPreviewOpen, setAiPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [canvasRevision, setCanvasRevision] = useState(0);
  const [savedCanvasRevision, setSavedCanvasRevision] = useState(0);
  const [savedProjectName, setSavedProjectName] = useState(diagram.project_name);
  const [isLocked, setIsLocked] = useState(false);

  const { dialect, dialectSource, syncFromInput, setManualDialect, resetToAuto } =
    useDialectSelection({
      initialDialect: (canvasState.dialect as SqlDialect | undefined) ?? "postgresql",
    });

  const bumpCanvasRevision = useCallback(() => {
    setCanvasRevision((revision) => revision + 1);
  }, []);

  const projectNameDirty = projectName !== savedProjectName;
  const canvasDirty = canvasRevision !== savedCanvasRevision;

  const allFileIds = useMemo(() => sqlFiles.map((f) => f.id), [sqlFiles]);

  const visibleNodes = useMemo(
    () => nodes.filter((n) => isTableVisibleForSelection(n, sqlFileSelection, allFileIds)),
    [nodes, sqlFileSelection, allFileIds],
  );

  const visibleEdges = useMemo(() => {
    const visibleIds = new Set(visibleNodes.map((n) => n.id));
    return edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target));
  }, [edges, visibleNodes]);

  const buildCanvasState = useCallback((): CanvasState => {
    return compactCanvasStateForSave({
      nodes,
      edges,
      viewport,
      sql: sqlFiles.length === 0 ? "" : undefined,
      sqlFiles: sqlFiles.length > 0 ? sqlFiles : undefined,
      sqlFileSelection,
      diagramSettings,
      grouping,
      dialect,
    });
  }, [dialect, diagramSettings, edges, grouping, nodes, sqlFiles, sqlFileSelection, viewport]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(false);
    try {
      await updateDiagram(diagram.id, buildCanvasState(), projectName);
      setSavedProjectName(projectName);
      setSavedCanvasRevision(canvasRevision);
    } catch {
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  }, [buildCanvasState, canvasRevision, diagram.id, projectName]);

  const onSave = useCallback(() => {
    void handleSave();
  }, [handleSave]);

  useRegisterWorkspaceHeader({
    projectName,
    onProjectNameChange: setProjectName,
    projectNameDirty,
    canvasDirty,
    isSaving,
    saveError,
    onSave,
  });

  const onNodesChange = useCallback(
    (changes: NodeChange<TableFlowNode>[]) => {
      if (isLocked) {
        const allowed = changes.filter(
          (change) => change.type === "select" || change.type === "dimensions",
        );
        if (allowed.length === 0) return;
        setNodes((current) => applyNodeChanges(allowed, current));
        return;
      }

      setNodes((current) => applyNodeChanges(changes, current));
      if (changes.some((change) => change.type !== "select" && change.type !== "position")) {
        bumpCanvasRevision();
      }
    },
    [bumpCanvasRevision, isLocked],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((current) => applyEdgeChanges(changes, current));
      bumpCanvasRevision();
    },
    [bumpCanvasRevision],
  );

  const onNodeDragStop = useCallback(() => {
    if (isLocked) return;
    setNodes((currentNodes) => {
      setEdges((currentEdges) =>
        optimizeEdgeHandles(currentNodes, currentEdges, diagramSettings.columnView),
      );
      return currentNodes;
    });
    bumpCanvasRevision();
  }, [bumpCanvasRevision, diagramSettings.columnView, isLocked]);

  const onViewportChange = useCallback((nextViewport: Viewport) => {
    setViewport(nextViewport);
  }, []);

  const handleCreateGroup = useCallback(() => {
    setGrouping((current) => createGroup(current));
    bumpCanvasRevision();
  }, [bumpCanvasRevision]);

  const handleRenameGroup = useCallback(
    (groupId: string, name: string) => {
      setGrouping((current) => renameGroup(current, groupId, name));
      bumpCanvasRevision();
    },
    [bumpCanvasRevision],
  );

  const handleSetGroupColor = useCallback(
    (groupId: string, color: TableGroupColor) => {
      setGrouping((current) => setGroupColor(current, groupId, color));
      bumpCanvasRevision();
    },
    [bumpCanvasRevision],
  );

  const handleDeleteGroup = useCallback(
    (groupId: string) => {
      setGrouping((current) => deleteGroup(current, groupId));
      bumpCanvasRevision();
    },
    [bumpCanvasRevision],
  );

  const handleAssignTable = useCallback(
    (nodeId: string, groupId: string) => {
      setGrouping((current) => assignTable(current, nodeId, groupId));
      bumpCanvasRevision();
    },
    [bumpCanvasRevision],
  );

  const handleUnassignTable = useCallback(
    (nodeId: string) => {
      setGrouping((current) => unassignTable(current, nodeId));
      bumpCanvasRevision();
    },
    [bumpCanvasRevision],
  );

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

  const handleApplyAiGrouping = useCallback(async () => {
    if (!aiPreview) return;
    const nextGrouping = aiPreview.grouping;
    setGrouping(nextGrouping);
    bumpCanvasRevision();
    setAiPreviewOpen(false);
    setAiPreview(null);
    setAutoGroupError(null);
    setGroupsPanelCollapsed(true);
    setIsLayouting(true);
    try {
      const { nodes: nextNodes, edges: nextEdges } = await relayoutNodes(
        nodes,
        edges,
        diagramSettings,
        nextGrouping,
      );
      setNodes(nextNodes);
      setEdges(nextEdges);
      setFocusedNodeId(null);
      setFitViewOnGenerate(true);
      bumpCanvasRevision();
    } finally {
      setIsLayouting(false);
    }
  }, [aiPreview, bumpCanvasRevision, diagramSettings, edges, nodes]);

  const handleCloseAiPreview = useCallback(() => {
    setAiPreviewOpen(false);
    setAiPreview(null);
  }, []);

  const handleGenerate = useCallback(() => {
    startGenerateTransition(async () => {
      setParseError(null);
      setSanitizeNotes([]);
      setFocusedNodeId(null);
      const { parseDiagramSql } = await import("@/lib/ddl/parse-sql-files");
      const result = await parseDiagramSql({
        sql: "",
        sqlFiles,
        existingNodes: [],
        settings: diagramSettings,
        dialect,
      });

      if (!result.ok) {
        setParseError(result.error);
        return;
      }

      setSanitizeNotes(result.sanitizeNotes);
      setNodes(result.graph.nodes);
      setEdges(result.graph.edges);
      setSqlFileSelection(defaultSqlFileSelection(sqlFiles));
      setGrouping((current) =>
        pruneAssignments(current, result.graph.nodes.map((node) => node.id)),
      );
      bumpCanvasRevision();
      setSidebarCollapsed(true);
      if (diagramSettings.autoFitOnLayout) {
        setFitViewOnGenerate(true);
      }
    });
  }, [bumpCanvasRevision, dialect, diagramSettings, sqlFiles]);

  const handleApplyLayout = useCallback(async () => {
    setIsLayouting(true);
    try {
      const { nodes: nextNodes, edges: nextEdges } = await relayoutNodes(
        nodes,
        edges,
        diagramSettings,
        grouping,
      );
      setNodes(nextNodes);
      setEdges(nextEdges);
      setFocusedNodeId(null);
      if (diagramSettings.autoFitOnLayout) {
        setFitViewOnGenerate(true);
      }
      bumpCanvasRevision();
      setSettingsOpen(false);
    } finally {
      setIsLayouting(false);
    }
  }, [bumpCanvasRevision, diagramSettings, edges, grouping, nodes]);

  const handleSettingsChange = useCallback(
    (nextSettings: DiagramSettings) => {
      setDiagramSettings(nextSettings);
      bumpCanvasRevision();
    },
    [bumpCanvasRevision],
  );

  const handleSqlFilesChange = useCallback(
    (files: SqlFileEntry[]) => {
      setSqlFiles(files);
      setSqlFileSelection(defaultSqlFileSelection(files));
      syncFromInput("", files);
      bumpCanvasRevision();
    },
    [bumpCanvasRevision, syncFromInput],
  );

  return (
    <div className="flex flex-col" style={{ height: APP_MAIN_HEIGHT }}>
      <div className="flex min-h-0 flex-1">
        <SqlImportPanel
          sqlFiles={sqlFiles}
          onSqlFilesChange={handleSqlFilesChange}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          error={parseError}
          sanitizeNotes={sanitizeNotes}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
          dialect={dialect}
          dialectSource={dialectSource}
          onDialectChange={setManualDialect}
          onResetToAuto={() => resetToAuto("", sqlFiles)}
        />
        <main className="relative min-w-0 flex-1 bg-zinc-100 dark:bg-zinc-950">
          <ErdCanvas
            nodes={visibleNodes}
            edges={visibleEdges}
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
            readOnly={isLocked}
            onReadOnlyChange={setIsLocked}
            sqlFiles={sqlFiles}
            sqlFileSelection={sqlFileSelection}
            onSqlFileSelectionChange={setSqlFileSelection}
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
        onApply={() => void handleApplyAiGrouping()}
        onClose={handleCloseAiPreview}
      />

      <DiagramSettingsDialog
        open={settingsOpen}
        settings={diagramSettings}
        isApplying={isLayouting}
        onSettingsChange={handleSettingsChange}
        onApply={() => void handleApplyLayout()}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
