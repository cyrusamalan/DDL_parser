"use client";

import { useCallback, useRef, useState } from "react";
import { FileUp, Sparkles, Upload } from "lucide-react";
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

type DdlImportEditorProps = {
  sql: string;
  onSqlChange: (value: string) => void;
  onGenerate: (sqlOverride?: string) => void;
  isGenerating: boolean;
  error: string | null;
  sanitizeNotes: string[];
  generateLabel?: string;
  compact?: boolean;
};

export function DdlImportEditor({
  sql,
  onSqlChange,
  onGenerate,
  isGenerating,
  error,
  sanitizeNotes,
  generateLabel = "Generate diagram",
  compact = false,
}: DdlImportEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const displayError = uploadError ?? error;

  const handleSqlChange = (value: string) => {
    setUploadError(null);
    setUploadedFileName(null);
    onSqlChange(value);
  };

  const loadFile = useCallback(
    async (file: File) => {
      setUploadError(null);
      const result = await readSqlFile(file);
      if (!result.ok) {
        setUploadError(result.error);
        return;
      }

      setUploadedFileName(result.fileName);
      onSqlChange(result.sql);
    },
    [onSqlChange],
  );

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await loadFile(file);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) await loadFile(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const textareaMinHeight = compact ? "min-h-[220px]" : "min-h-[320px]";

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
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative rounded-2xl border-2 border-dashed transition ${
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
            disabled={isGenerating}
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
            or paste DDL
          </span>
        </div>
        <div className="border-t border-zinc-200 pt-5 dark:border-zinc-800" />
      </div>

      <textarea
        value={sql}
        onChange={(event) => handleSqlChange(event.target.value)}
        placeholder={SAMPLE_DDL}
        className={`${textareaMinHeight} w-full resize-none rounded-2xl border border-zinc-300 bg-white p-4 font-mono text-xs leading-6 text-zinc-900 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100`}
        spellCheck={false}
      />

      {!compact && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>Need an example?</span>
          <button
            type="button"
            onClick={() => handleSqlChange(SAMPLE_DDL)}
            className="font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-400"
          >
            Load sample schema
          </button>
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
        disabled={isGenerating || !sql.trim()}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 font-medium text-white shadow-sm transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 ${
          compact ? "px-4 py-2.5 text-sm" : "px-5 py-3 text-sm"
        }`}
      >
        <Sparkles className="h-4 w-4" />
        {isGenerating ? "Generating..." : generateLabel}
      </button>
    </div>
  );
}
