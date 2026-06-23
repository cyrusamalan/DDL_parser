"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
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

type SettingsTab = "layout" | "filters" | "canvas";

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
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-3 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/70">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {description}
          </span>
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
  if (direction === "web") {
    return (
      <div
        className="flex h-14 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
        aria-hidden
      >
        <div className="relative h-10 w-10">
          <div className="absolute top-1/2 left-1/2 h-2.5 w-4 -translate-x-1/2 -translate-y-1/2 rounded bg-zinc-800 dark:bg-zinc-200" />
          <div className="absolute top-0.5 left-1/2 h-1.5 w-3 -translate-x-1/2 rounded bg-zinc-400 dark:bg-zinc-500" />
          <div className="absolute right-0.5 top-1/2 h-1.5 w-3 -translate-y-1/2 rounded bg-zinc-400 dark:bg-zinc-500" />
          <div className="absolute bottom-0.5 left-1/2 h-1.5 w-3 -translate-x-1/2 rounded bg-zinc-400 dark:bg-zinc-500" />
          <div className="absolute top-1/2 left-0.5 h-1.5 w-3 -translate-y-1/2 rounded bg-zinc-400 dark:bg-zinc-500" />
        </div>
      </div>
    );
  }

  const isVertical = direction === "vertical";
  return (
    <div
      className="flex h-14 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
      aria-hidden
    >
      <div className={`flex gap-1 ${isVertical ? "flex-col items-center" : "flex-row items-center"}`}>
        <div className="h-3.5 w-7 rounded bg-zinc-800 dark:bg-zinc-200" />
        <div className={`flex gap-0.5 ${isVertical ? "flex-row" : "flex-col"}`}>
          <div className="h-2.5 w-5 rounded bg-zinc-400 dark:bg-zinc-500" />
          <div className="h-2.5 w-5 rounded bg-zinc-400 dark:bg-zinc-500" />
          <div className="h-2.5 w-5 rounded bg-zinc-400 dark:bg-zinc-500" />
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium transition sm:text-sm ${
        active
          ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

const TAB_LABELS: Record<SettingsTab, string> = {
  layout: "Layout",
  filters: "Filters",
  canvas: "Canvas",
};

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
  const [activeTab, setActiveTab] = useState<SettingsTab>("layout");

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) setActiveTab("layout");
  }, [open]);

  if (!open) return null;

  const gridLabel =
    settings.layoutDirection === "vertical"
      ? "Tables per row"
      : settings.layoutDirection === "landscape"
        ? "Tables per column"
        : "Tables per ring";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
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
        className="relative z-10 flex max-h-[min(92dvh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-xl sm:rounded-2xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="shrink-0 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 id={titleId} className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Diagram settings
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Changes apply after you click Apply layout.
          </p>
          <div
            className="mt-3 flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800"
            role="tablist"
            aria-label="Settings sections"
          >
            {(["layout", "filters", "canvas"] as const).map((tab) => (
              <TabButton
                key={tab}
                active={activeTab === tab}
                onClick={() => setActiveTab(tab)}
              >
                {TAB_LABELS[tab]}
              </TabButton>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {activeTab === "layout" && (
            <div className="space-y-4">
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
                      <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                        {hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Layout direction
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: "vertical" as const, label: "Vertical", hint: "Top-down" },
                      { value: "landscape" as const, label: "Landscape", hint: "Left-right" },
                      { value: "web" as const, label: "Web", hint: "Radial" },
                    ] as const
                  ).map(({ value, label, hint }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onSettingsChange({ ...settings, layoutDirection: value })}
                      className={`rounded-lg border px-2 py-2 text-left transition ${
                        settings.layoutDirection === value
                          ? "border-zinc-900 bg-zinc-50 ring-2 ring-zinc-900/10 dark:border-zinc-100 dark:bg-zinc-800 dark:ring-zinc-100/10"
                          : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                      }`}
                    >
                      <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-zinc-500 dark:text-zinc-400">
                        {hint}
                      </span>
                    </button>
                  ))}
                </div>
                {settings.layoutDirection === "web" && (
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Spreads tables outward to reduce overlapping lines in dense schemas.
                  </p>
                )}
                <div className="mt-3">
                  <LayoutPreview direction={settings.layoutDirection} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
              </div>
            </div>
          )}

          {activeTab === "filters" && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Control which tables and columns appear on the canvas.
              </p>
              <Toggle
                label="Keys only"
                description="Show primary and foreign key columns only"
                checked={settings.columnView === "keysOnly"}
                onChange={(keysOnly) =>
                  onSettingsChange({ ...settings, columnView: keysOnly ? "keysOnly" : "full" })
                }
              />
              <Toggle
                label="Hide isolated tables"
                description="Hide tables with no foreign key relationships"
                checked={settings.hideIsolatedTables}
                onChange={(hideIsolatedTables) =>
                  onSettingsChange({ ...settings, hideIsolatedTables })
                }
              />
            </div>
          )}

          {activeTab === "canvas" && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Canvas navigation and display options.
              </p>
              <Toggle
                label="Show minimap"
                description="Overview map in the bottom corner"
                checked={settings.showMinimap}
                onChange={(showMinimap) => onSettingsChange({ ...settings, showMinimap })}
              />
              <Toggle
                label="Auto-fit on layout"
                description="Zoom to fit all tables after applying layout"
                checked={settings.autoFitOnLayout}
                onChange={(autoFitOnLayout) =>
                  onSettingsChange({ ...settings, autoFitOnLayout })
                }
              />
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-200 bg-white px-5 py-3 shadow-[0_-4px_24px_-8px_rgb(0_0_0/0.12)] dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-[0_-4px_24px_-8px_rgb(0_0_0/0.45)]">
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
