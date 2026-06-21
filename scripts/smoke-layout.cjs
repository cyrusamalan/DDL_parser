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

async function smokeElkLayout() {
  const ELK = require("elkjs/lib/elk.bundled.js");
  const elk = new ELK.default();

  const nodes = [
    { id: "users", width: TABLE_WIDTH, height: 120 },
    { id: "posts", width: TABLE_WIDTH, height: 100 },
    { id: "comments", width: TABLE_WIDTH, height: 90 },
  ];

  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.edgeRouting": "ORTHOGONAL",
    },
    children: nodes,
    edges: [
      { id: "e1", sources: ["posts"], targets: ["users"] },
      { id: "e2", sources: ["comments"], targets: ["posts"] },
    ],
  };

  const layouted = await elk.layout(graph);
  assert.ok(Array.isArray(layouted.children), "ELK should return positioned children");
  assert.equal(layouted.children.length, 3, "ELK should position all nodes");

  for (const child of layouted.children) {
    assert.ok(Number.isFinite(child.x), `node ${child.id} should have finite x`);
    assert.ok(Number.isFinite(child.y), `node ${child.id} should have finite y`);
  }
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

smokeElkLayout()
  .then(() => {
    console.log(JSON.stringify({ vertical, landscape }));
    console.log("Layout smoke test passed.");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
