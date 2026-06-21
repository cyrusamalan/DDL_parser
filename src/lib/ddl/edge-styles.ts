export const DEFAULT_EDGE_COLOR = "#a1a1aa";
export const HOVER_EDGE_COLOR = "#52525b";
export const FOCUS_EDGE_COLOR = "#0ea5e9";

export const DEFAULT_EDGE_STYLE = {
  stroke: DEFAULT_EDGE_COLOR,
  strokeWidth: 1.2,
  opacity: 0.55,
} as const;

export const HOVER_EDGE_STYLE = {
  stroke: HOVER_EDGE_COLOR,
  strokeWidth: 2,
  opacity: 0.95,
} as const;

export const FOCUS_EDGE_STYLE = {
  stroke: FOCUS_EDGE_COLOR,
  strokeWidth: 2.5,
  opacity: 1,
} as const;

export const DIMMED_EDGE_STYLE = {
  stroke: DEFAULT_EDGE_COLOR,
  strokeWidth: 1.2,
  opacity: 0.12,
} as const;
