"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, Circle, Copy, Info, Loader2, TriangleAlert, XCircle } from "lucide-react";
import type { CreateLogEntry, CreateLogLevel } from "@/lib/diagram-create-log";

type CreateActivityLogProps = {
  entries: readonly CreateLogEntry[];
  runId: string | null;
  isActive: boolean;
  toClipboardText: () => string;
};

function LevelIcon({ level, spinning }: { level: CreateLogLevel; spinning?: boolean }) {
  if (spinning) {
    return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-sky-600 dark:text-sky-400" />;
  }
  switch (level) {
    case "ok":
      return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />;
    case "error":
      return <XCircle className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />;
    case "warn":
      return <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />;
    default:
      return <Info className="h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-400" />;
  }
}

export function CreateActivityLog({
  entries,
  runId,
  isActive,
  toClipboardText,
}: CreateActivityLogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = `runId=${runId ?? "unknown"}\n${toClipboardText()}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [runId, toClipboardText]);

  if (entries.length === 0) return null;

  const last = entries[entries.length - 1];
  const showSpinner = isActive && last.level === "info";

  return (
    <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-950/60">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Create activity log</p>
        <div className="flex items-center gap-2">
          {runId && (
            <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400" title="Correlate with server logs">
              run {runId.slice(0, 8)}
            </span>
          )}
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-zinc-600 transition hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <Copy className="h-3 w-3" />
            {copied ? "Copied" : "Copy log"}
          </button>
        </div>
      </div>

      <ol className="mt-2 space-y-1.5">
        {entries.map((entry, index) => {
          const isLast = index === entries.length - 1;
          const spinning = isLast && showSpinner;
          return (
            <li key={entry.id} className="flex items-start gap-2 text-xs">
              <LevelIcon level={entry.level} spinning={spinning} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{entry.phase}</span>
                  {entry.durationMs !== undefined && (
                    <span className="font-mono text-[10px] text-zinc-500">{entry.durationMs}ms</span>
                  )}
                </div>
                <p className="text-zinc-600 dark:text-zinc-400">{entry.message}</p>
                {entry.detail && (
                  <p className="mt-0.5 font-mono text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-500">
                    {entry.detail}
                  </p>
                )}
                {entry.meta && Object.keys(entry.meta).filter((k) => k !== "runId").length > 0 && (
                  <p className="mt-0.5 font-mono text-[10px] text-zinc-500 dark:text-zinc-500">
                    {Object.entries(entry.meta)
                      .filter(([key]) => key !== "runId")
                      .map(([key, value]) => `${key}=${value}`)
                      .join(" · ")}
                  </p>
                )}
              </div>
              {!spinning && entry.level === "info" && isLast && (
                <Circle className="h-2 w-2 shrink-0 text-zinc-400" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
