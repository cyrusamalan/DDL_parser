export const DEFAULT_EDGE_COLOR = "#ffffff";
export const HOVER_EDGE_COLOR = "#ffffff";
export const FOCUS_EDGE_COLOR = "#0ea5e9";

export const DEFAULT_EDGE_STYLE = {
  stroke: DEFAULT_EDGE_COLOR,
  strokeWidth: 1.5,
  opacity: 1,
} as const;

export const HOVER_EDGE_STYLE = {
  stroke: HOVER_EDGE_COLOR,
  strokeWidth: 2,
  opacity: 1,
} as const;
export const FOCUS_EDGE_STYLE = {
  stroke: FOCUS_EDGE_COLOR,
  strokeWidth: 2.5,
  opacity: 1,
} as const;

export const DIMMED_EDGE_STYLE = {
  stroke: DEFAULT_EDGE_COLOR,
  strokeWidth: 1.5,
  opacity: 0.2,
} as const;

/** High-contrast edges for PNG export on a white background. */
export const EXPORT_EDGE_COLOR = "#171717";
export const EXPORT_EDGE_STYLE = {
  stroke: EXPORT_EDGE_COLOR,
  strokeWidth: 2.5,
  opacity: 1,
} as const;
