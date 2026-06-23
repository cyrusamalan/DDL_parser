"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ClipboardPaste, FileUp, Sparkles, Upload, X } from "lucide-react";
import { readSqlFile } from "@/lib/read-sql-file";
import { DialectSelector } from "@/components/ddl/dialect-selector";
import type { DialectSource } from "@/lib/ddl/detect-dialect";
import type { SqlDialect, SqlFileEntry } from "@/lib/types/diagram";

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

const PASTE_FILE_ID = "paste";

type DdlImportEditorProps = {
  sqlFiles: SqlFileEntry[];
  onSqlFilesChange: (files: SqlFileEntry[]) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  error: string | null;
  sanitizeNotes: string[];
  generateLabel?: string;
  compact?: boolean;
  readOnly?: boolean;
  dialect: SqlDialect;
  dialectSource: DialectSource;
  onDialectChange: (d: SqlDialect) => void;
  onResetToAuto: () => void;
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
            Paste SQL DDL below, then click Use pasted SQL.
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
  sqlFiles,
  onSqlFilesChange,
  onGenerate,
  isGenerating,
  error,
  sanitizeNotes,
  generateLabel = "Generate diagram",
  compact = false,
  readOnly = false,
  dialect,
  dialectSource,
  onDialectChange,
  onResetToAuto,
}: DdlImportEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteDraft, setPasteDraft] = useState("");

  const displayError = uploadError ?? error;

  const addFiles = useCallback(
    async (fileList: FileList | null) => {
      if (readOnly || !fileList || fileList.length === 0) return;
      setUploadError(null);

      const newEntries: SqlFileEntry[] = [];
      const errors: string[] = [];

      for (const file of Array.from(fileList)) {
        const result = await readSqlFile(file);
        if (!result.ok) {
          errors.push(result.error);
          continue;
        }
        newEntries.push({ id: crypto.randomUUID(), name: result.fileName, sql: result.sql });
      }

      if (errors.length > 0) {
        setUploadError(errors.join(" "));
      }

      if (newEntries.length > 0) {
        onSqlFilesChange([...sqlFiles, ...newEntries]);
      }
    },
    [readOnly, sqlFiles, onSqlFilesChange],
  );

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    await addFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    if (readOnly) return;
    event.preventDefault();
    setIsDragging(false);
    await addFiles(event.dataTransfer.files);
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

  const removeFile = (id: string) => {
    onSqlFilesChange(sqlFiles.filter((f) => f.id !== id));
  };

  const openPasteModal = () => {
    if (readOnly) return;
    const existing = sqlFiles.find((f) => f.id === PASTE_FILE_ID);
    setPasteDraft(existing?.sql ?? "");
    setPasteModalOpen(true);
  };

  const applyPastedSql = () => {
    if (readOnly) return;
    const trimmed = pasteDraft.trim();
    if (!trimmed) return;
    const entry: SqlFileEntry = { id: PASTE_FILE_ID, name: "Pasted SQL", sql: trimmed };
    const without = sqlFiles.filter((f) => f.id !== PASTE_FILE_ID);
    onSqlFilesChange([...without, entry]);
    setPasteModalOpen(false);
  };

  const hasPastedEntry = sqlFiles.some((f) => f.id === PASTE_FILE_ID);
  const uploadedFiles = sqlFiles.filter((f) => f.id !== PASTE_FILE_ID);

  return (
    <div className={compact ? "flex flex-1 flex-col gap-3" : "space-y-4"}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".sql"
        multiple
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
            Drop <span className="font-mono text-sky-700 dark:text-sky-400">.sql</span> files here
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Multiple files are merged into one diagram
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

      {(uploadedFiles.length > 0 || hasPastedEntry) && (
        <ul className="space-y-1.5">
          {uploadedFiles.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            >
              <span className="min-w-0 truncate font-medium text-zinc-800 dark:text-zinc-200">
                {file.name}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
          {hasPastedEntry && (
            <li className="flex items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs dark:border-sky-900 dark:bg-sky-950/50">
              <span className="font-medium text-sky-900 dark:text-sky-200">Pasted SQL</span>
              <div className="flex items-center gap-1">
                {!readOnly && (
                  <>
                    <button
                      type="button"
                      onClick={openPasteModal}
                      className="rounded px-1.5 py-0.5 font-medium text-sky-800 hover:bg-sky-100 dark:text-sky-300 dark:hover:bg-sky-900/60"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFile(PASTE_FILE_ID)}
                      className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                      aria-label="Remove pasted SQL"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </li>
          )}
        </ul>
      )}

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

      <DialectSelector
        dialect={dialect}
        dialectSource={dialectSource}
        hasSqlInput={sqlFiles.length > 0}
        onDialectChange={onDialectChange}
        onResetToAuto={onResetToAuto}
        disabled={isGenerating || readOnly}
        compact={compact}
      />

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
        disabled={isGenerating || sqlFiles.length === 0 || readOnly}
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
