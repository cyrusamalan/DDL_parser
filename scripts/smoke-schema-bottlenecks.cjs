const assert = require("node:assert/strict");

const JOIN_HOTSPOT_IN_DEGREE = 8;
const DEEP_JOIN_CHAIN_DEPTH = 6;
const PAYLOAD_TYPE_PATTERN = /\b(jsonb?|text|bytea)\b/i;

function buildDirectedAdjacency(nodeIds, edges) {
  const adj = new Map();
  for (const id of nodeIds) adj.set(id, []);
  for (const edge of edges) {
    const neighbors = adj.get(edge.source);
    if (neighbors && !neighbors.includes(edge.target)) {
      neighbors.push(edge.target);
    }
  }
  return adj;
}

function computeInDegree(nodeIds, edges) {
  const inDegree = new Map();
  for (const id of nodeIds) inDegree.set(id, 0);
  for (const edge of edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }
  return inDegree;
}

function maxDirectedDepthFromRoots(nodeIds, adjacency) {
  const inDegree = new Map();
  for (const id of nodeIds) inDegree.set(id, 0);
  for (const id of nodeIds) {
    for (const neighbor of adjacency.get(id) ?? []) {
      inDegree.set(neighbor, (inDegree.get(neighbor) ?? 0) + 1);
    }
  }

  const roots = nodeIds.filter((id) => (inDegree.get(id) ?? 0) === 0);
  const startNodes = roots.length > 0 ? roots : nodeIds;

  let maxDepth = 0;

  for (const start of startNodes) {
    const depth = new Map([[start, 0]]);
    const queue = [start];

    while (queue.length > 0) {
      const current = queue.shift();
      const currentDepth = depth.get(current) ?? 0;

      for (const neighbor of adjacency.get(current) ?? []) {
        const nextDepth = currentDepth + 1;
        const existing = depth.get(neighbor);
        if (existing === undefined || nextDepth > existing) {
          depth.set(neighbor, nextDepth);
          queue.push(neighbor);
          if (nextDepth > maxDepth) maxDepth = nextDepth;
        }
      }
    }
  }

  return maxDepth;
}

function detectJoinHotspots(nodeIds, edges) {
  const inDegree = computeInDegree(nodeIds, edges);
  return nodeIds.filter((id) => (inDegree.get(id) ?? 0) >= JOIN_HOTSPOT_IN_DEGREE);
}

function detectDeepJoinChain(nodeIds, edges) {
  const adj = buildDirectedAdjacency(nodeIds, edges);
  return maxDirectedDepthFromRoots(nodeIds, adj) >= DEEP_JOIN_CHAIN_DEPTH;
}

function detectLargePayloadColumns(columns) {
  return columns.some((col) => PAYLOAD_TYPE_PATTERN.test(col.dataType));
}

const hubNodes = ["hub", "t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"];
const hubEdges = hubNodes
  .filter((id) => id !== "hub")
  .map((id) => ({ source: id, target: "hub" }));

assert.deepEqual(detectJoinHotspots(hubNodes, hubEdges), ["hub"], "should detect join hotspot");

const chainNodes = ["t0", "t1", "t2", "t3", "t4", "t5", "t6"];
const chainEdges = [
  { source: "t1", target: "t0" },
  { source: "t2", target: "t1" },
  { source: "t3", target: "t2" },
  { source: "t4", target: "t3" },
  { source: "t5", target: "t4" },
  { source: "t6", target: "t5" },
];

assert.ok(detectDeepJoinChain(chainNodes, chainEdges), "should detect deep join chain");

const jsonColumns = [
  { name: "id", dataType: "uuid", isPrimaryKey: true, isForeignKey: false },
  { name: "payload", dataType: "jsonb", isPrimaryKey: false, isForeignKey: false },
];

assert.ok(
  detectLargePayloadColumns(jsonColumns),
  "should detect jsonb payload columns",
);

console.log("Schema bottlenecks smoke test passed.");
