export type TechNode = {
  id: string;
  label: string;
  prereqIds: string[];
};

export type TechTreeRuntime = {
  nodes: TechNode[];
};

const NODE_DEF_REGEX = /([A-Za-z][A-Za-z0-9_]*)\s*\["([^"]*)"\]/g;
const NODE_ID_REGEX = /([A-Za-z][A-Za-z0-9_]*)/;

const parseNodeId = (source: string): string | null => {
  const match = source.match(NODE_ID_REGEX);
  return match ? match[1] : null;
};

export const parseDependencyMap = (source: string): TechNode[] => {
  const labels = new Map<string, string>();
  const prereqMap = new Map<string, Set<string>>();

  const ensureNode = (id: string): void => {
    if (!labels.has(id)) {
      labels.set(id, id);
    }
    if (!prereqMap.has(id)) {
      prereqMap.set(id, new Set<string>());
    }
  };

  const lines = source.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("%%")) {
      continue;
    }

    for (const match of line.matchAll(NODE_DEF_REGEX)) {
      const [, id, label] = match;
      ensureNode(id);
      labels.set(id, label.trim() || id);
    }

    if (!line.includes("-->")) {
      continue;
    }

    const chain = line
      .split("-->")
      .map((segment) => parseNodeId(segment.trim()))
      .filter((id): id is string => id !== null);

    for (let index = 0; index < chain.length - 1; index += 1) {
      const fromId = chain[index];
      const toId = chain[index + 1];
      ensureNode(fromId);
      ensureNode(toId);
      prereqMap.get(toId)?.add(fromId);
    }
  }

  return [...labels.keys()].map((id) => ({
    id,
    label: labels.get(id) ?? id,
    prereqIds: [...(prereqMap.get(id) ?? new Set<string>())],
  }));
};

export const createTechTreeRuntime = (source: string): TechTreeRuntime => ({
  nodes: parseDependencyMap(source),
});

const collectPrerequisites = (
  nodesById: Map<string, TechNode>,
  nodeId: string,
  visited: Set<string>,
): void => {
  if (visited.has(nodeId)) {
    return;
  }
  visited.add(nodeId);
  const node = nodesById.get(nodeId);
  if (!node) {
    return;
  }
  for (const prereqId of node.prereqIds) {
    collectPrerequisites(nodesById, prereqId, visited);
  }
};

export const resolveUnlockedNodes = (nodes: TechNode[], seedNodeIds: readonly string[]): Set<string> => {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const toUnlock = new Set<string>();
  for (const seedNodeId of seedNodeIds) {
    collectPrerequisites(nodesById, seedNodeId, toUnlock);
  }
  return toUnlock;
};
