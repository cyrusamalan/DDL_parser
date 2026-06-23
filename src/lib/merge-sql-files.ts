import type { SqlFileEntry, SqlFileScope, TableFlowNode } from "@/lib/types/diagram";

export function mergeSqlFiles(files: SqlFileEntry[]): string {
  return files
    .map((file) => file.sql.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function defaultSqlFileSelection(files: SqlFileEntry[]): string[] {
  return files.map((file) => file.id);
}

export function migrateSqlFileScopeToSelection(
  files: SqlFileEntry[],
  scope: SqlFileScope | undefined,
): string[] {
  if (!scope || scope === "all") {
    return defaultSqlFileSelection(files);
  }
  if (files.some((file) => file.id === scope.fileId)) {
    return [scope.fileId];
  }
  return defaultSqlFileSelection(files);
}

export function resolveInitialSqlFileSelection(
  files: SqlFileEntry[],
  canvasState: {
    sqlFileSelection?: string[];
    sqlFileScope?: SqlFileScope;
  },
): string[] {
  if (canvasState.sqlFileSelection !== undefined) {
    return normalizeSqlFileSelection(files, canvasState.sqlFileSelection);
  }
  return migrateSqlFileScopeToSelection(files, canvasState.sqlFileScope);
}

export function normalizeSqlFileSelection(
  files: SqlFileEntry[],
  selection: string[] | undefined,
): string[] {
  const validIds = new Set(files.map((file) => file.id));
  if (!selection || selection.length === 0) {
    return defaultSqlFileSelection(files);
  }

  const filtered = selection.filter((id) => validIds.has(id));
  if (filtered.length === 0) {
    return defaultSqlFileSelection(files);
  }
  return filtered;
}

export function isTableVisibleForSelection(
  node: TableFlowNode,
  selection: string[],
  allFileIds: string[],
): boolean {
  if (allFileIds.length <= 1) return true;
  const sourceFileId = node.data.sourceFileId;
  if (!sourceFileId) return true;
  return selection.includes(sourceFileId);
}

export function sqlFileSelectionLabel(
  files: SqlFileEntry[],
  selection: string[],
): string {
  if (files.length === 0) return "";
  if (selection.length === files.length) {
    return `All files (${files.length})`;
  }
  if (selection.length === 0) {
    return "No files selected";
  }
  return `${selection.length} of ${files.length} files`;
}

/** @deprecated Use mergeSqlFiles + sqlFileSelection filter instead. */
export function normalizeSqlFileScope(
  files: SqlFileEntry[],
  scope: SqlFileScope = "all",
): SqlFileScope {
  if (scope === "all") return "all";
  if (files.some((file) => file.id === scope.fileId)) return scope;
  return "all";
}

/** @deprecated Use mergeSqlFiles for generate; filter via sqlFileSelection. */
export function resolveSqlForDiagram(
  files: SqlFileEntry[],
  scope: SqlFileScope = "all",
): string {
  const normalizedScope = normalizeSqlFileScope(files, scope);
  if (normalizedScope === "all") {
    return mergeSqlFiles(files);
  }

  const match = files.find((file) => file.id === normalizedScope.fileId);
  return match?.sql.trim() ?? "";
}

/** @deprecated */
export function scopedFileName(
  files: SqlFileEntry[],
  scope: SqlFileScope = "all",
): string | null {
  const normalizedScope = normalizeSqlFileScope(files, scope);
  if (normalizedScope === "all") return null;
  return files.find((file) => file.id === normalizedScope.fileId)?.name ?? null;
}
