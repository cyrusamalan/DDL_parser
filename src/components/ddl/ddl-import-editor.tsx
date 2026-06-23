"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ClipboardPaste, FileUp, Pencil, Sparkles, Upload, X } from "lucide-react";
import { readSqlFile } from "@/lib/read-sql-file";

const SAMPLE_DDL = `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  body TEXT
);`;

type SqlSource = "none" | "file" | "paste";

type DdlImportEditorProps = {
  sql: string;
  onSqlChange: (value: string) => void;
  onGenerate: (sqlOverride?: string) => void;
  isGenerating: boolean;
  error: string | null;
  sanitizeNotes: string[];
  generateLabel?: string;
  compact?: boolean;
  readOnly?: boolean;
};

function PasteDdlDialog({
  open,
  draft,
  onDraftChange,
  onApply,
  onClose,
  readOnly,
}: {
  open: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onApply: () => void;
  onClose: () => void;
  readOnly: boolean;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
        aria-label="Close paste DDL dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex w-full max-w-2xl flex-col rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 id={titleId} className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Paste DDL
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Paste PostgreSQL DDL below, then click Use pasted SQL.
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-5">
          <textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            readOnly={readOnly}
            placeholder={SAMPLE_DDL}
            className="min-h-[280px] w-full resize-y rounded-xl border border-zinc-300 bg-white p-4 font-mono text-xs leading-6 text-zinc-900 outline-none ring-sky-500 focus:ring-2 read-only:cursor-default read-only:opacity-80 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            spellCheck={false}
            autoFocus
          />

          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Need an example?</span>
            <button
              type="button"
              onClick={() => onDraftChange(SAMPLE_DDL)}
              disabled={readOnly}
              className="font-medium text-sky-700 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-sky-400"
            >
              Load sample schema
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={readOnly || !draft.trim()}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Use pasted SQL
          </button>
        </div>
      </div>
    </div>
  );
}

export function DdlImportEditor({
  sql,
  onSqlChange,
  onGenerate,
  isGenerating,
  error,
  sanitizeNotes,
  generateLabel = "Generate diagram",
  compact = false,
  readOnly = false,
}: DdlImportEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [sqlSource, setSqlSource] = useState<SqlSource>("none");
  const [isDragging, setIsDragging] = useState(false);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteDraft, setPasteDraft] = useState("");

  const displayError = uploadError ?? error;

  const openPasteModal = () => {
    if (readOnly) return;
    setPasteDraft(sql);
    setPasteModalOpen(true);
  };

  const applyPastedSql = () => {
    if (readOnly) return;
    setUploadError(null);
    setUploadedFileName(null);
    setSqlSource("paste");
    onSqlChange(pasteDraft);
    setPasteModalOpen(false);
  };

  const clearPastedSql = () => {
    if (readOnly) return;
    setSqlSource("none");
    onSqlChange("");
  };

  const loadFile = useCallback(
    async (file: File) => {
      if (readOnly) return;
      setUploadError(null);
      const result = await readSqlFile(file);
      if (!result.ok) {
        setUploadError(result.error);
        return;
      }

      setUploadedFileName(result.fileName);
      setSqlSource("file");
      onSqlChange(result.sql);
    },
    [onSqlChange, readOnly],
  );

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await loadFile(file);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    if (readOnly) return;
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) await loadFile(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (readOnly) return;
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  return (
    <div className={compact ? "flex flex-1 flex-col gap-3" : "space-y-4"}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".sql"
        className="hidden"
        onChange={handleFileChange}
      />

      <div
        onDrop={readOnly ? undefined : handleDrop}
        onDragOver={readOnly ? undefined : handleDragOver}
        onDragLeave={readOnly ? undefined : handleDragLeave}
        className={`relative rounded-2xl border-2 border-dashed transition ${
          readOnly ? "opacity-60" : ""
        } ${
          isDragging
            ? "border-sky-400 bg-sky-50/80 dark:border-sky-500 dark:bg-sky-950/40"
            : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
        } ${compact ? "p-4" : "p-6"}`}
      >
        <div className="flex flex-col items-center text-center">
          <span
            className={`flex items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 ${
              compact ? "h-10 w-10" : "h-12 w-12"
            }`}
          >
            <FileUp className={compact ? "h-5 w-5" : "h-6 w-6"} />
          </span>
          <p className={`mt-3 font-medium text-zinc-900 dark:text-zinc-100 ${compact ? "text-sm" : "text-base"}`}>
            Drop your <span className="font-mono text-sky-700 dark:text-sky-400">.sql</span> file here
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Migration files are auto-sanitized for ERD parsing
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating || readOnly}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            <Upload className="h-4 w-4" />
            Browse files
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-x-0 top-0 flex items-center justify-center">
          <span className="bg-zinc-50 px-3 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:bg-zinc-950 dark:text-zinc-500">
            or
          </span>
        </div>
        <div className="border-t border-zinc-200 pt-5 dark:border-zinc-800" />
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={openPasteModal}
          disabled={isGenerating || readOnly}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          <ClipboardPaste className="h-4 w-4" />
          Paste DDL
        </button>
      </div>

      {sqlSource === "paste" && sql.trim() && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs dark:border-sky-900 dark:bg-sky-950/50">
          <span className="font-medium text-sky-900 dark:text-sky-200">Pasted SQL ready</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={openPasteModal}
              disabled={readOnly}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-sky-800 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-sky-300 dark:hover:bg-sky-900/60"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
            <button
              type="button"
              onClick={clearPastedSql}
              disabled={readOnly}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-zinc-600 transition hover:bg-zinc-200/80 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          </div>
        </div>
      )}

      {uploadedFileName && !displayError && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Loaded {uploadedFileName}</p>
      )}

      {sanitizeNotes.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">Sanitized for ERD</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {sanitizeNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {displayError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {displayError}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          setUploadError(null);
          onGenerate();
        }}
        disabled={isGenerating || !sql.trim() || readOnly}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 font-medium text-white shadow-sm transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 ${
          compact ? "px-4 py-2.5 text-sm" : "px-5 py-3 text-sm"
        }`}
      >
        <Sparkles className="h-4 w-4" />
        {isGenerating ? "Generating..." : generateLabel}
      </button>

      <PasteDdlDialog
        open={pasteModalOpen}
        draft={pasteDraft}
        onDraftChange={setPasteDraft}
        onApply={applyPastedSql}
        onClose={() => setPasteModalOpen(false)}
        readOnly={readOnly}
      />
    </div>
  );
}
