"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { DdlImportEditor } from "@/components/ddl/ddl-import-editor";

type SqlImportPanelProps = {
  sql: string;
  onSqlChange: (value: string) => void;
  onGenerate: (sqlOverride?: string) => void;
  isGenerating: boolean;
  error: string | null;
  sanitizeNotes: string[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

export function SqlImportPanel({
  sql,
  onSqlChange,
  onGenerate,
  isGenerating,
  error,
  sanitizeNotes,
  collapsed,
  onToggleCollapsed,
}: SqlImportPanelProps) {
  if (collapsed) {
    return (
      <div className="flex h-full w-10 shrink-0 flex-col items-center border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="mt-3 rounded-md p-1.5 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Expand SQL panel"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">SQL DDL</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Paste, drop, or upload to regenerate
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Collapse SQL panel"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        <DdlImportEditor
          sql={sql}
          onSqlChange={onSqlChange}
          onGenerate={onGenerate}
          isGenerating={isGenerating}
          error={error}
          sanitizeNotes={sanitizeNotes}
          generateLabel="Regenerate"
          compact
        />
      </div>
    </aside>
  );
}
