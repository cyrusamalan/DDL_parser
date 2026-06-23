"use client";

import { Sparkles } from "lucide-react";
import { DIALECT_GROUPS, DIALECT_LABELS, type DialectSource } from "@/lib/ddl/detect-dialect";
import type { SqlDialect } from "@/lib/types/diagram";

type DialectSelectorProps = {
  dialect: SqlDialect;
  dialectSource: DialectSource;
  hasSqlInput: boolean;
  onDialectChange: (dialect: SqlDialect) => void;
  onResetToAuto: () => void;
  disabled?: boolean;
  compact?: boolean;
};

export function DialectSelector({
  dialect,
  dialectSource,
  hasSqlInput,
  onDialectChange,
  onResetToAuto,
  disabled = false,
  compact = false,
}: DialectSelectorProps) {
  const isAuto = dialectSource === "auto";
  const showAutoDetected = isAuto && hasSqlInput;

  return (
    <div
      className={`rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">SQL dialect</p>

      <div className={`mt-2 flex items-center gap-2 ${compact ? "flex-wrap" : ""}`}>
        {showAutoDetected && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-300">
            <Sparkles className="h-3 w-3" />
            Auto-detected
          </span>
        )}
        {!isAuto && (
          <span className="inline-flex shrink-0 items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            Custom
          </span>
        )}

        <select
          id="ddl-dialect"
          value={dialect}
          onChange={(event) => onDialectChange(event.target.value as SqlDialect)}
          disabled={disabled}
          className={`min-w-0 flex-1 rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 outline-none ring-sky-500 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 ${
            compact ? "text-xs" : ""
          }`}
        >
          {DIALECT_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.dialects.map((value) => (
                <option key={value} value={value}>
                  {DIALECT_LABELS[value]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {showAutoDetected
            ? "We detected this from your SQL. Pick another if parsing fails."
            : isAuto
              ? "Upload or paste SQL to auto-detect, or choose a dialect below."
              : "You chose this dialect manually."}
        </p>
        {!isAuto && hasSqlInput && (
          <button
            type="button"
            onClick={onResetToAuto}
            disabled={disabled}
            className="shrink-0 text-xs font-medium text-sky-700 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-sky-400"
          >
            Detect automatically
          </button>
        )}
      </div>
    </div>
  );
}
