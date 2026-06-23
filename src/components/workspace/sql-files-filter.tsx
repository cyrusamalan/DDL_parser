"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  defaultSqlFileSelection,
  sqlFileSelectionLabel,
} from "@/lib/merge-sql-files";
import type { SqlFileEntry } from "@/lib/types/diagram";

type SqlFilesFilterProps = {
  sqlFiles: SqlFileEntry[];
  selection: string[];
  onSelectionChange: (selection: string[]) => void;
  readOnly?: boolean;
};

export function SqlFilesFilter({
  sqlFiles,
  selection,
  onSelectionChange,
  readOnly = false,
}: SqlFilesFilterProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  if (sqlFiles.length < 2) {
    return null;
  }

  const label = sqlFileSelectionLabel(sqlFiles, selection);
  const allSelected = selection.length === sqlFiles.length;

  const toggleFile = (fileId: string) => {
    if (readOnly) return;
    if (selection.includes(fileId)) {
      const next = selection.filter((id) => id !== fileId);
      onSelectionChange(next.length > 0 ? next : []);
      return;
    }
    onSelectionChange([...selection, fileId]);
  };

  const selectAll = () => {
    if (readOnly) return;
    onSelectionChange(defaultSqlFileSelection(sqlFiles));
  };

  const clearAll = () => {
    if (readOnly) return;
    onSelectionChange([]);
  };

  return (
    <div ref={containerRef} className="relative border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <label
        htmlFor={`${listboxId}-trigger`}
        className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
      >
        Visible files
      </label>
      <button
        id={`${listboxId}-trigger`}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={readOnly}
        onClick={() => setOpen((value) => !value)}
        className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-multiselectable
          className="absolute top-full right-4 left-4 z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 pb-2 dark:border-zinc-800">
            <button
              type="button"
              onClick={selectAll}
              disabled={readOnly || allSelected}
              className="text-xs font-medium text-sky-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-sky-400"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={readOnly || selection.length === 0}
              className="text-xs font-medium text-zinc-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400"
            >
              Clear
            </button>
          </div>
          <ul className="space-y-0.5 px-2 pt-2">
            {sqlFiles.map((file) => {
              const checked = selection.includes(file.id);
              return (
                <li key={file.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={readOnly}
                      onChange={() => toggleFile(file.id)}
                      className="h-3.5 w-3.5 rounded border-zinc-300 text-sky-600 focus:ring-sky-500 dark:border-zinc-600"
                    />
                    <span className="min-w-0 truncate">{file.name}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
