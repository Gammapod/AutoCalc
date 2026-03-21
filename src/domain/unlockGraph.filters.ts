import type { GameState, Key } from "./types.js";
import { compareKeys } from "./unlockGraph.rules.js";
import type { UnlockGraph } from "./unlockGraph.types.js";

export const filterUnlockGraphToIncomingUnlockKeys = (
  graph: UnlockGraph,
  alwaysIncludeKeys: Key[] = [],
): UnlockGraph => {
  const alwaysInclude = new Set(alwaysIncludeKeys);
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const outgoingEdges = new Map<string, typeof graph.edges>();
  for (const edge of graph.edges) {
    const list = outgoingEdges.get(edge.from);
    if (list) {
      list.push(edge);
    } else {
      outgoingEdges.set(edge.from, [edge]);
    }
  }

  const incomingUnlockKeyNodeIds = new Set(
    graph.edges
      .filter((edge) => edge.type === "unlocks")
      .map((edge) => edge.to)
      .filter((nodeId) => nodesById.get(nodeId)?.type === "key"),
  );

  const seedNodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (node.type !== "key") {
      continue;
    }
    if (alwaysInclude.has(node.label as Key) || incomingUnlockKeyNodeIds.has(node.id)) {
      seedNodeIds.add(node.id);
    }
  }

  for (const edge of graph.edges) {
    if (edge.type === "unlocks" && seedNodeIds.has(edge.to)) {
      seedNodeIds.add(edge.from);
    }
  }

  const includedNodeIds = new Set<string>();
  const queue = [...seedNodeIds];
  while (queue.length > 0) {
    const nodeId = queue.shift() as string;
    if (includedNodeIds.has(nodeId) || !nodesById.has(nodeId)) {
      continue;
    }
    includedNodeIds.add(nodeId);
    for (const edge of outgoingEdges.get(nodeId) ?? []) {
      if (!includedNodeIds.has(edge.to)) {
        queue.push(edge.to);
      }
    }
  }

  return {
    nodes: graph.nodes.filter((node) => includedNodeIds.has(node.id)),
    edges: graph.edges.filter((edge) => includedNodeIds.has(edge.from) && includedNodeIds.has(edge.to)),
  };
};

export const deriveUnlockedKeysFromState = (state: GameState): Key[] => {
  const keys: Key[] = [];
  for (const [key, unlocked] of Object.entries(state.unlocks.valueAtoms)) {
    if (unlocked) {
      keys.push(key as Key);
    }
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.valueCompose)) {
    if (unlocked) {
      keys.push(key as Key);
    }
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.valueExpression)) {
    if (unlocked) {
      keys.push(key as Key);
    }
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.slotOperators)) {
    if (unlocked) {
      keys.push(key as Key);
    }
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.unaryOperators)) {
    if (unlocked) {
      keys.push(key as Key);
    }
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.utilities)) {
    if (unlocked) {
      keys.push(key as Key);
    }
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.memory)) {
    if (unlocked) {
      keys.push(key as Key);
    }
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.steps)) {
    if (unlocked) {
      keys.push(key as Key);
    }
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.visualizers)) {
    if (unlocked) {
      keys.push(key as Key);
    }
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.execution)) {
    if (unlocked) {
      keys.push(key as Key);
    }
  }
  return keys.sort(compareKeys);
};
