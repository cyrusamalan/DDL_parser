"use client";

import { useEffect, useId, useRef } from "react";
import { GRID_SIZE_OPTIONS } from "@/lib/diagram-settings";
import type { DiagramSettings } from "@/lib/types/diagram";

type DiagramSettingsDialogProps = {
  open: boolean;
  settings: DiagramSettings;
  isApplying?: boolean;
  onSettingsChange: (settings: DiagramSettings) => void;
  onApply: () => void;
  onClose: () => void;
};

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">{description}</span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-300 dark:bg-zinc-600"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

function LayoutPreview({ direction }: { direction: DiagramSettings["layoutDirection"] }) {
  const isVertical = direction === "vertical";
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900"
      aria-hidden
    >
      <div className={`flex gap-1 ${isVertical ? "flex-col items-center" : "flex-row items-center"}`}>
        <div className="h-4 w-8 rounded bg-zinc-800 dark:bg-zinc-200" title="Parent" />
        <div className={`flex gap-0.5 ${isVertical ? "flex-row" : "flex-col"}`}>
          <div className="h-3 w-6 rounded bg-zinc-400 dark:bg-zinc-500" />
          <div className="h-3 w-6 rounded bg-zinc-400 dark:bg-zinc-500" />
          <div className="h-3 w-6 rounded bg-zinc-400 dark:bg-zinc-500" />
        </div>
      </div>
    </div>
  );
}

export function DiagramSettingsDialog({
  open,
  settings,
  isApplying = false,
  onSettingsChange,
  onApply,
  onClose,
}: DiagramSettingsDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const gridLabel =
    settings.layoutDirection === "vertical" ? "Tables per row" : "Tables per column";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
        aria-label="Close diagram settings"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 id={titleId} className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Diagram settings
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Adjust layout, filters, and canvas display. Click Apply layout to reposition tables
            after changing layout or keys-only view.
          </p>
        </div>

        <div className="space-y-5 px-5 py-4">
          <div>
            <span className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Layout engine
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "elk" as const, label: "Structured", hint: "Fewer crossings" },
                  { value: "grid" as const, label: "Grid", hint: "Simple rows" },
                ] as const
              ).map(({ value, label, hint }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onSettingsChange({ ...settings, layoutEngine: value })}
                  className={`rounded-lg border px-3 py-2 text-left transition ${
                    settings.layoutEngine === value
                      ? "border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900/10 dark:border-zinc-100 dark:bg-zinc-800 dark:ring-zinc-100/10"
                      : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                  }`}
                >
                  <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Structured reduces line crossings for large schemas.
            </p>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Layout direction
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(["vertical", "landscape"] as const).map((direction) => (
                <button
                  key={direction}
                  type="button"
                  onClick={() => onSettingsChange({ ...settings, layoutDirection: direction })}
                  className={`rounded-lg border px-3 py-2 text-left transition ${
                    settings.layoutDirection === direction
                      ? "border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900/10 dark:border-zinc-100 dark:bg-zinc-800 dark:ring-zinc-100/10"
                      : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                  }`}
                >
                  <span className="block text-sm font-medium capitalize text-zinc-900 dark:text-zinc-100">
                    {direction}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                    {direction === "vertical" ? "Parents on top" : "Parents on left"}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-3">
              <LayoutPreview direction={settings.layoutDirection} />
            </div>
          </div>

          <div>
            <label
              htmlFor="grid-size"
              className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              {gridLabel}
            </label>
            <select
              id="grid-size"
              value={settings.gridSize}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  gridSize: Number(event.target.value) as DiagramSettings["gridSize"],
                })
              }
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {GRID_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="spacing"
              className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              Spacing
            </label>
            <select
              id="spacing"
              value={settings.spacing}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  spacing: event.target.value as DiagramSettings["spacing"],
                })
              }
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="compact">Compact</option>
              <option value="normal">Normal</option>
              <option value="roomy">Roomy</option>
            </select>
          </div>

          <div className="space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">Filters</span>
            <Toggle
              label="Keys only"
              description="Show only primary and foreign key columns in each table"
              checked={settings.columnView === "keysOnly"}
              onChange={(keysOnly) =>
                onSettingsChange({ ...settings, columnView: keysOnly ? "keysOnly" : "full" })
              }
            />
            <Toggle
              label="Hide isolated"
              description="Hide tables with no foreign key relationships"
              checked={settings.hideIsolatedTables}
              onChange={(hideIsolatedTables) =>
                onSettingsChange({ ...settings, hideIsolatedTables })
              }
            />
          </div>

          <div className="space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">Canvas</span>
            <Toggle
              label="Show minimap"
              description="Small overview map in the corner of the canvas"
              checked={settings.showMinimap}
              onChange={(showMinimap) => onSettingsChange({ ...settings, showMinimap })}
            />
            <Toggle
              label="Auto-fit on layout"
              description="Zoom to fit all tables after applying layout"
              checked={settings.autoFitOnLayout}
              onChange={(autoFitOnLayout) => onSettingsChange({ ...settings, autoFitOnLayout })}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Done
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={isApplying}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {isApplying ? "Applying…" : "Apply layout"}
          </button>
        </div>
      </div>
    </div>
  );
}
