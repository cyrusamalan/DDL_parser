import type { Edge } from "@xyflow/react";

export type AdjacencyMap = Map<string, string[]>;

export function buildDirectedAdjacency(
  nodeIds: string[],
  edges: Edge[],
): AdjacencyMap {
  const adj = new Map<string, string[]>();
  for (const id of nodeIds) {
    adj.set(id, []);
  }
  for (const edge of edges) {
    const neighbors = adj.get(edge.source);
    if (neighbors && !neighbors.includes(edge.target)) {
      neighbors.push(edge.target);
    }
  }
  return adj;
}

export function buildReverseAdjacency(
  nodeIds: string[],
  edges: Edge[],
): AdjacencyMap {
  const adj = new Map<string, string[]>();
  for (const id of nodeIds) {
    adj.set(id, []);
  }
  for (const edge of edges) {
    const dependents = adj.get(edge.target);
    if (dependents && !dependents.includes(edge.source)) {
      dependents.push(edge.source);
    }
  }
  return adj;
}

export function buildUndirectedAdjacency(
  nodeIds: string[],
  edges: Edge[],
): AdjacencyMap {
  const adj = new Map<string, string[]>();
  for (const id of nodeIds) {
    adj.set(id, []);
  }
  for (const edge of edges) {
    const sourceNeighbors = adj.get(edge.source);
    if (sourceNeighbors && !sourceNeighbors.includes(edge.target)) {
      sourceNeighbors.push(edge.target);
    }
    const targetNeighbors = adj.get(edge.target);
    if (targetNeighbors && !targetNeighbors.includes(edge.source)) {
      targetNeighbors.push(edge.source);
    }
  }
  return adj;
}

export function computeInOutDegrees(
  nodeIds: string[],
  edges: Edge[],
): { inDegree: Map<string, number>; outDegree: Map<string, number> } {
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();
  for (const id of nodeIds) {
    inDegree.set(id, 0);
    outDegree.set(id, 0);
  }
  for (const edge of edges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    outDegree.set(edge.source, (outDegree.get(edge.source) ?? 0) + 1);
  }
  return { inDegree, outDegree };
}

export function findStronglyConnectedComponents(
  nodeIds: string[],
  adjacency: AdjacencyMap,
): string[][] {
  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const components: string[][] = [];
  let counter = 0;

  function strongConnect(node: string): void {
    index.set(node, counter);
    lowlink.set(node, counter);
    counter++;
    stack.push(node);
    onStack.add(node);

    for (const neighbor of adjacency.get(node) ?? []) {
      if (!index.has(neighbor)) {
        strongConnect(neighbor);
        lowlink.set(node, Math.min(lowlink.get(node)!, lowlink.get(neighbor)!));
      } else if (onStack.has(neighbor)) {
        lowlink.set(node, Math.min(lowlink.get(node)!, index.get(neighbor)!));
      }
    }

    if (lowlink.get(node) === index.get(node)) {
      const component: string[] = [];
      let popped: string | undefined;
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
    if (!index.has(node)) {
      strongConnect(node);
    }
  }

  return components;
}

export function maxDirectedDepthFromRoots(
  nodeIds: string[],
  adjacency: AdjacencyMap,
): { maxDepth: number; deepestNode: string | null } {
  // Kahn's algorithm: processes each node exactly once, so cycles (including
  // self-referential FKs) are naturally skipped — nodes in cycles never reach
  // in-degree zero and are never enqueued.
  const remaining = new Map<string, number>();
  for (const id of nodeIds) {
    remaining.set(id, 0);
  }
  for (const id of nodeIds) {
    for (const neighbor of adjacency.get(id) ?? []) {
      if (neighbor !== id) {
        remaining.set(neighbor, (remaining.get(neighbor) ?? 0) + 1);
      }
    }
  }

  const dp = new Map<string, number>();
  const queue: string[] = [];
  for (const id of nodeIds) {
    if ((remaining.get(id) ?? 0) === 0) {
      dp.set(id, 0);
      queue.push(id);
    }
  }

  let maxDepth = 0;
  let deepestNode: string | null = null;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = dp.get(current) ?? 0;

    for (const neighbor of adjacency.get(current) ?? []) {
      if (neighbor === current) continue;
      const next = Math.max(dp.get(neighbor) ?? 0, currentDepth + 1);
      dp.set(neighbor, next);
      if (next > maxDepth) {
        maxDepth = next;
        deepestNode = neighbor;
      }
      const rem = (remaining.get(neighbor) ?? 1) - 1;
      remaining.set(neighbor, rem);
      if (rem === 0) queue.push(neighbor);
    }
  }

  return { maxDepth, deepestNode };
}

export function countReverseDependents(
  nodeId: string,
  reverseAdjacency: AdjacencyMap,
): number {
  const visited = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const dependent of reverseAdjacency.get(current) ?? []) {
      if (!visited.has(dependent)) {
        visited.add(dependent);
        queue.push(dependent);
      }
    }
  }

  return visited.size;
}

export function findUndirectedComponents(
  nodeIds: string[],
  undirectedAdjacency: AdjacencyMap,
): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const start of nodeIds) {
    if (visited.has(start)) continue;

    const component: string[] = [];
    const queue = [start];
    visited.add(start);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);
      for (const neighbor of undirectedAdjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    components.push(component);
  }

  return components;
}

export function findArticulationPoints(
  nodeIds: string[],
  undirectedAdjacency: AdjacencyMap,
): Set<string> {
  const articulationPoints = new Set<string>();
  const visited = new Set<string>();
  const discovery = new Map<string, number>();
  const low = new Map<string, number>();
  const parent = new Map<string, string | null>();
  let time = 0;

  function dfs(node: string): void {
    visited.add(node);
    discovery.set(node, time);
    low.set(node, time);
    time++;

    let childCount = 0;
    const neighbors = undirectedAdjacency.get(node) ?? [];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        parent.set(neighbor, node);
        childCount++;
        dfs(neighbor);

        low.set(node, Math.min(low.get(node)!, low.get(neighbor)!));

        if (parent.get(node) === null && childCount > 1) {
          articulationPoints.add(node);
        }
        if (parent.get(node) !== null && low.get(neighbor)! >= discovery.get(node)!) {
          articulationPoints.add(node);
        }
      } else if (neighbor !== parent.get(node)) {
        low.set(node, Math.min(low.get(node)!, discovery.get(neighbor)!));
      }
    }
  }

  for (const node of nodeIds) {
    if (!visited.has(node)) {
      parent.set(node, null);
      dfs(node);
    }
  }

  return articulationPoints;
}

export function reachableWithinHops(
  startId: string,
  undirectedAdjacency: AdjacencyMap,
  maxHops: number,
): Set<string> {
  const visited = new Set<string>([startId]);
  const queue: Array<{ id: string; depth: number }> = [{ id: startId, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (depth >= maxHops) continue;

    for (const neighbor of undirectedAdjacency.get(id) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ id: neighbor, depth: depth + 1 });
      }
    }
  }

  return visited;
}
