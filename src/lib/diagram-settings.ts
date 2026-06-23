import type { DiagramSettings } from "@/lib/types/diagram";

export const DEFAULT_DIAGRAM_SETTINGS: DiagramSettings = {
  layoutDirection: "web",
  layoutEngine: "elk",
  gridSize: 5,
  spacing: "normal",
  columnView: "keysOnly",
  hideIsolatedTables: false,
  showMinimap: true,
  autoFitOnLayout: true,
};

export const GRID_SIZE_OPTIONS = [3, 4, 5, 6] as const;

export function spacingMultiplier(spacing: DiagramSettings["spacing"]): number {
  switch (spacing) {
    case "compact":
      return 0.5;
    case "roomy":
      return 2;
    default:
      return 1;
  }
}

export function fitViewPaddingForSpacing(spacing: DiagramSettings["spacing"]): number {
  switch (spacing) {
    case "compact":
      return 0.06;
    case "roomy":
      return 0.28;
    default:
      return 0.12;
  }
}

export function mergeDiagramSettings(saved?: Partial<DiagramSettings> | null): DiagramSettings {
  if (!saved) return { ...DEFAULT_DIAGRAM_SETTINGS };

  const gridSize = saved.gridSize;
  const validGridSize =
    gridSize === 3 || gridSize === 4 || gridSize === 5 || gridSize === 6
      ? gridSize
      : DEFAULT_DIAGRAM_SETTINGS.gridSize;

  return {
    layoutDirection:
      saved.layoutDirection === "vertical"
        ? "vertical"
        : saved.layoutDirection === "landscape"
          ? "landscape"
          : saved.layoutDirection === "web"
            ? "web"
            : DEFAULT_DIAGRAM_SETTINGS.layoutDirection,
    layoutEngine: saved.layoutEngine === "grid" ? "grid" : "elk",
    gridSize: validGridSize,
    spacing:
      saved.spacing === "compact" || saved.spacing === "roomy"
        ? saved.spacing
        : "normal",
    columnView: saved.columnView === "full" ? "full" : "keysOnly",
    hideIsolatedTables: saved.hideIsolatedTables ?? DEFAULT_DIAGRAM_SETTINGS.hideIsolatedTables,
    showMinimap: saved.showMinimap ?? DEFAULT_DIAGRAM_SETTINGS.showMinimap,
    autoFitOnLayout:
      saved.autoFitOnLayout ?? DEFAULT_DIAGRAM_SETTINGS.autoFitOnLayout,
  };
}
