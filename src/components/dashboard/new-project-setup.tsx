"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Layers } from "lucide-react";
import { createDiagram } from "@/actions/diagrams";
import { DdlImportEditor } from "@/components/ddl/ddl-import-editor";
import { optimizeEdgeHandles } from "@/lib/ddl/optimize-edge-handles";
import { compactCanvasStateForSave } from "@/lib/canvas-state-size";
import { useDialectSelection } from "@/hooks/use-dialect-selection";
import type { SqlFileEntry } from "@/lib/types/diagram";

export function NewProjectSetup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projectName, setProjectName] = useState(searchParams.get("name") ?? "");
  const [sqlFiles, setSqlFiles] = useState<SqlFileEntry[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [sanitizeNotes, setSanitizeNotes] = useState<string[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { dialect, dialectSource, syncFromInput, setManualDialect, resetToAuto } =
    useDialectSelection();

  const handleGenerate = () => {
    setParseError(null);
    setCreateError(null);
    setSanitizeNotes([]);

    startTransition(async () => {
      const { parseDiagramSql } = await import("@/lib/ddl/parse-sql-files");
      const result = await parseDiagramSql({ sql: "", sqlFiles, dialect });

      if (!result.ok) {
        setParseError(result.error);
        return;
      }

      setSanitizeNotes(result.sanitizeNotes);

      const nodes = result.graph.nodes;
      const edges = optimizeEdgeHandles(nodes, result.graph.edges);
      const name = projectName.trim() || "Untitled Project";

      const canvasState = compactCanvasStateForSave({
        nodes,
        edges,
        sqlFiles: sqlFiles.length > 0 ? sqlFiles : undefined,
        sql: sqlFiles.length === 0 ? "" : undefined,
        sqlFileSelection: sqlFiles.map((f) => f.id),
        dialect,
      });

      try {
        const id = await createDiagram(name, canvasState);
        router.push(`/workspace/${id}`);
      } catch {
        setCreateError("Could not save the project. Check your database connection.");
      }
    });
  };

  const displayError = createError ?? parseError;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <Layers className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Create a new diagram
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Name your project, then paste or upload one or more{" "}
              <span className="font-mono">.sql</span> files to generate your ERD.
            </p>
          </div>
        </div>

        <label htmlFor="project-name" className="mt-8 block text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Project name
        </label>
        <input
          id="project-name"
          value={projectName}
          onChange={(event) => setProjectName(event.target.value)}
          placeholder="My ERD project"
          className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none ring-sky-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />

        <div className="mt-8">
          <DdlImportEditor
            sqlFiles={sqlFiles}
            onSqlFilesChange={(files) => {
              setSqlFiles(files);
              syncFromInput("", files);
            }}
            onGenerate={handleGenerate}
            isGenerating={isPending}
            error={displayError}
            sanitizeNotes={sanitizeNotes}
            generateLabel="Create & generate diagram"
            dialect={dialect}
            dialectSource={dialectSource}
            onDialectChange={setManualDialect}
            onResetToAuto={() => resetToAuto("", sqlFiles)}
          />
        </div>
      </div>
    </div>
  );
}
