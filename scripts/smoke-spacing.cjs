const assert = require("node:assert/strict");

const BASE_NODE_SPACING = 56;
const BASE_LAYER_SPACING = 120;
const BASE_HORIZONTAL_GAP = 56;
const BASE_LEVEL_GAP = 120;

function spacingMultiplier(spacing) {
  switch (spacing) {
    case "compact":
      return 0.5;
    case "roomy":
      return 2;
    default:
      return 1;
  }
}

function fitViewPaddingForSpacing(spacing) {
  switch (spacing) {
    case "compact":
      return 0.06;
    case "roomy":
      return 0.28;
    default:
      return 0.12;
  }
}

function elkSpacing(spacing) {
  const scale = spacingMultiplier(spacing);
  return {
    nodeNode: Math.round(BASE_NODE_SPACING * scale),
    layer: Math.round(BASE_LAYER_SPACING * scale),
  };
}

function gridLevelGap(spacing) {
  return Math.round(BASE_LEVEL_GAP * spacingMultiplier(spacing));
}

const compact = elkSpacing("compact");
const normal = elkSpacing("normal");
const roomy = elkSpacing("roomy");

assert.ok(compact.nodeNode < normal.nodeNode, "compact node spacing should be tighter than normal");
assert.ok(normal.nodeNode < roomy.nodeNode, "roomy node spacing should be looser than normal");
assert.ok(roomy.nodeNode >= compact.nodeNode * 2, "roomy node spacing should be at least 2x compact");

assert.ok(compact.layer < roomy.layer, "layer spacing should increase from compact to roomy");
assert.ok(gridLevelGap("roomy") >= gridLevelGap("compact") * 2, "grid level gap roomy should be 2x compact");

assert.ok(fitViewPaddingForSpacing("compact") < fitViewPaddingForSpacing("normal"));
assert.ok(fitViewPaddingForSpacing("roomy") > fitViewPaddingForSpacing("normal"));

console.log(
  JSON.stringify({
    elk: { compact, normal, roomy },
    fitPadding: {
      compact: fitViewPaddingForSpacing("compact"),
      normal: fitViewPaddingForSpacing("normal"),
      roomy: fitViewPaddingForSpacing("roomy"),
    },
  }),
);
console.log("Spacing smoke test passed.");
