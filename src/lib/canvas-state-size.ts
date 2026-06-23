import type { CanvasState } from "@/lib/types/diagram";
import { mergeSqlFiles } from "@/lib/merge-sql-files";

/** Keep under typical server-action / JSON body limits (Vercel ~4 MB). */
export const MAX_CANVAS_STATE_BYTES = 3 * 1024 * 1024;

export const MAX_CANVAS_STATE_MB = MAX_CANVAS_STATE_BYTES / (1024 * 1024);

export function estimateCanvasStateBytes(state: CanvasState): number {
  return new TextEncoder().encode(JSON.stringify(state)).length;
}

/** Avoid storing the same SQL twice when file entries already hold the source text. */
export function compactCanvasStateForSave(state: CanvasState): CanvasState {
  const sqlFiles = state.sqlFiles ?? [];
  if (sqlFiles.length === 0) {
    return state;
  }
  return {
    ...state,
    sql: "",
  };
}

export function resolveCanvasSql(state: CanvasState): string {
  const sqlFiles = state.sqlFiles ?? [];
  if (sqlFiles.length > 0) {
    const merged = mergeSqlFiles(sqlFiles);
    if (merged.trim()) return merged;
  }
  return state.sql ?? "";
}

export function serializeCanvasState(state: CanvasState): CanvasState {
  // Drop non-JSON values (e.g. React Flow internals) before persistence.
  return JSON.parse(JSON.stringify(state)) as CanvasState;
}

export function validateCanvasStateSize(state: CanvasState): string | null {
  const bytes = estimateCanvasStateBytes(compactCanvasStateForSave(state));
  if (bytes <= MAX_CANVAS_STATE_BYTES) {
    return null;
  }
  const mb = (bytes / (1024 * 1024)).toFixed(1);
  return `Diagram data is too large to save (${mb} MB, max ${MAX_CANVAS_STATE_MB} MB). Try fewer or smaller .sql files, or remove unused tables from the source dump.`;
}
