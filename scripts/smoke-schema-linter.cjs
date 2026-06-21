const assert = require("node:assert/strict");

const HUB_IN_DEGREE = 8;

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

function findStronglyConnectedComponents(nodeIds, adjacency) {
  const index = new Map();
  const lowlink = new Map();
  const onStack = new Set();
  const stack = [];
  const components = [];
  let counter = 0;

  function strongConnect(node) {
    index.set(node, counter);
    lowlink.set(node, counter);
    counter++;
    stack.push(node);
    onStack.add(node);

    for (const neighbor of adjacency.get(node) ?? []) {
      if (!index.has(neighbor)) {
        strongConnect(neighbor);
        lowlink.set(node, Math.min(lowlink.get(node), lowlink.get(neighbor)));
      } else if (onStack.has(neighbor)) {
        lowlink.set(node, Math.min(lowlink.get(node), index.get(neighbor)));
      }
    }

    if (lowlink.get(node) === index.get(node)) {
      const component = [];
      let popped;
      do {
        popped = stack.pop();
        if (popped) {
          onStack.delete(popped);
          component.push(popped);
        }
      } while (popped !== node);
      components.push(component);
    }
  }

  for (const node of nodeIds) {
    if (!index.has(node)) strongConnect(node);
  }

  return components;
}

function computeInDegree(nodeIds, edges) {
  const inDegree = new Map();
  for (const id of nodeIds) inDegree.set(id, 0);
  for (const edge of edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }
  return inDegree;
}

function makeNode(id, columns) {
  return {
    id,
    data: {
      tableName: id,
      columns,
    },
  };
}

function col(name, flags = {}) {
  return {
    name,
    dataType: "integer",
    isPrimaryKey: Boolean(flags.pk),
    isForeignKey: Boolean(flags.fk),
  };
}

function detectNoPrimaryKey(nodes) {
  return nodes
    .filter((node) => !node.data.columns.some((column) => column.isPrimaryKey))
    .map((node) => node.id);
}

function detectFkCycles(nodeIds, edges) {
  const adj = buildDirectedAdjacency(nodeIds, edges);
  return findStronglyConnectedComponents(nodeIds, adj).filter((component) => component.length > 1);
}

function detectHubLookups(nodeIds, edges) {
  const inDegree = computeInDegree(nodeIds, edges);
  return nodeIds.filter((id) => (inDegree.get(id) ?? 0) >= HUB_IN_DEGREE);
}

const noPkNodes = [
  makeNode("orphan", [col("name")]),
  makeNode("valid", [col("id", { pk: true })]),
];

assert.deepEqual(detectNoPrimaryKey(noPkNodes), ["orphan"], "should detect missing primary key");

const cycleNodes = ["a", "b", "c"];
const cycleEdges = [
  { source: "a", target: "b" },
  { source: "b", target: "c" },
  { source: "c", target: "a" },
];

const cycles = detectFkCycles(cycleNodes, cycleEdges);
assert.equal(cycles.length, 1, "should find one SCC cycle");
assert.equal(cycles[0].length, 3, "cycle should include all three tables");

const hubNodes = ["hub", "t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"];
const hubEdges = [
  { source: "t1", target: "hub" },
  { source: "t2", target: "hub" },
  { source: "t3", target: "hub" },
  { source: "t4", target: "hub" },
  { source: "t5", target: "hub" },
  { source: "t6", target: "hub" },
  { source: "t7", target: "hub" },
  { source: "t8", target: "hub" },
];

assert.deepEqual(detectHubLookups(hubNodes, hubEdges), ["hub"], "should detect hub lookup table");

console.log("Schema linter smoke test passed.");
