const assert = require("node:assert/strict");

const TABLE_WIDTH = 260;
const ROW_HEIGHT = 73;

function layoutVerticalStar(childCount, gridSize) {
  const cols = Math.min(gridSize, childCount);
  const rows = Math.ceil(childCount / cols);
  const width = cols * TABLE_WIDTH + (cols - 1) * 48;
  const height = rows * ROW_HEIGHT + (rows - 1) * 72 + 96 + ROW_HEIGHT;
  return { width, height };
}

function layoutLandscapeStar(childCount, gridSize) {
  const cols = Math.ceil(childCount / gridSize);
  const width = cols * (TABLE_WIDTH + 96) + TABLE_WIDTH;
  const rows = Math.min(gridSize, childCount);
  const height = rows * ROW_HEIGHT + (rows - 1) * 72;
  return { width, height };
}

const vertical = layoutVerticalStar(20, 5);
const landscape = layoutLandscapeStar(20, 4);

assert.ok(vertical.width > vertical.height, "vertical star layout should be wider than tall");
assert.ok(landscape.width > 0 && landscape.height > 0, "landscape layout should produce bounds");
assert.notStrictEqual(
  Math.round(vertical.width / vertical.height),
  Math.round(landscape.width / landscape.height),
  "layout directions should produce different aspect ratios",
);

console.log(JSON.stringify({ vertical, landscape }));
console.log("Layout smoke test passed.");
