import type { Key, UnlockDefinition } from "./types.js";
import type { GraphNode, UnlockGraph, UnlockGraphReport } from "./unlockGraph.types.js";
import { analyzeUnlockGraph } from "./unlockGraph.analysis.js";
import { buildUnlockGraph } from "./unlockGraph.rules.js";

export const buildUnlockGraphReport = (
  catalog: UnlockDefinition[],
  startingKeys: Key[],
  generatedAt: Date = new Date(),
): UnlockGraphReport => ({
  generatedAtIso: generatedAt.toISOString(),
  graph: buildUnlockGraph(catalog, startingKeys),
  analysis: analyzeUnlockGraph(catalog, startingKeys),
});

export const formatUnlockGraphReport = (report: UnlockGraphReport): string => {
  const nodeCounts = report.graph.nodes.reduce(
    (acc, node) => {
      acc[node.type] += 1;
      return acc;
    },
    { key: 0, function: 0, condition: 0, sufficient_set: 0, effect_target: 0 },
  );
  const edgeCounts = report.graph.edges.reduce(
    (acc, edge) => {
      acc[edge.type] += 1;
      return acc;
    },
    { necessary: 0, sufficient: 0, requires: 0, unlocks: 0 },
  );
  const reachable = report.analysis.conditionStatuses.filter((status) => status.reachable);
  const blocked = report.analysis.conditionStatuses.filter((status) => !status.reachable);
  const blockedLines = blocked.map((status) => {
    const missing = status.missingFunctions.length > 0 ? status.missingFunctions.join(", ") : "none";
    return `- ${status.unlockId}: missing ${missing}`;
  });

  const lines = [
    "Unlock Graph Report",
    `Generated: ${report.generatedAtIso}`,
    "",
    "Graph Summary",
    `- Nodes: key=${nodeCounts.key}, function=${nodeCounts.function}, condition=${nodeCounts.condition}, sufficient_set=${nodeCounts.sufficient_set}, effect_target=${nodeCounts.effect_target}`,
    `- Edges: necessary=${edgeCounts.necessary}, sufficient=${edgeCounts.sufficient}, requires=${edgeCounts.requires}, unlocks=${edgeCounts.unlocks}`,
    "",
    "Progression Summary",
    `- Starting keys: ${report.analysis.startingKeys.join(", ") || "(none)"}`,
    `- Reachable conditions: ${reachable.length}`,
    `- Blocked conditions: ${blocked.length}`,
    `- Keys reachable from simulation: ${report.analysis.unlockedKeysReached.join(", ") || "(none)"}`,
    `- Unreachable keys: ${report.analysis.unreachableKeys.join(", ") || "(none)"}`,
    `- Effect targets reached: ${report.analysis.reachedEffectTargets.join(", ") || "(none)"}`,
    `- Effect targets unreachable: ${report.analysis.unreachableEffectTargets.join(", ") || "(none)"}`,
    "",
    "Blocked Conditions",
    ...(blockedLines.length > 0 ? blockedLines : ["- (none)"]),
    "",
    "Detected Key Cycles",
    ...(report.analysis.keyCycles.length > 0
      ? report.analysis.keyCycles.map((cycle) => `- ${cycle.join(" -> ")}`)
      : ["- (none)"]),
  ];

  return lines.join("\n");
};

const escapeMermaidLabel = (value: string): string => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const buildMermaidNodeOrder = (graph: UnlockGraph): Map<string, number> => {
  const nodeIds = graph.nodes.map((node) => node.id);
  const adjacency = new Map<string, string[]>();
  for (const nodeId of nodeIds) {
    adjacency.set(nodeId, []);
  }
  for (const edge of graph.edges) {
    if (adjacency.has(edge.from) && adjacency.has(edge.to)) {
      adjacency.get(edge.from)?.push(edge.to);
    }
  }

  let index = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const indices = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const components: string[][] = [];

  const strongConnect = (nodeId: string): void => {
    indices.set(nodeId, index);
    lowlink.set(nodeId, index);
    index += 1;
    stack.push(nodeId);
    onStack.add(nodeId);

    for (const next of adjacency.get(nodeId) ?? []) {
      if (!indices.has(next)) {
        strongConnect(next);
        lowlink.set(nodeId, Math.min(lowlink.get(nodeId) ?? Number.MAX_SAFE_INTEGER, lowlink.get(next) ?? Number.MAX_SAFE_INTEGER));
      } else if (onStack.has(next)) {
        lowlink.set(nodeId, Math.min(lowlink.get(nodeId) ?? Number.MAX_SAFE_INTEGER, indices.get(next) ?? Number.MAX_SAFE_INTEGER));
      }
    }

    if ((lowlink.get(nodeId) ?? -1) !== (indices.get(nodeId) ?? -1)) {
      return;
    }

    const component: string[] = [];
    while (stack.length > 0) {
      const top = stack.pop() as string;
      onStack.delete(top);
      component.push(top);
      if (top === nodeId) {
        break;
      }
    }
    component.sort();
    components.push(component);
  };

  for (const nodeId of [...nodeIds].sort()) {
    if (!indices.has(nodeId)) {
      strongConnect(nodeId);
    }
  }

  const componentIndexByNode = new Map<string, number>();
  components.forEach((component, componentIndex) => {
    component.forEach((nodeId) => componentIndexByNode.set(nodeId, componentIndex));
  });

  const componentEdges = new Map<number, Set<number>>();
  const componentIndegrees = new Map<number, number>();
  components.forEach((_, componentIndex) => {
    componentEdges.set(componentIndex, new Set<number>());
    componentIndegrees.set(componentIndex, 0);
  });
  for (const edge of graph.edges) {
    const fromComponent = componentIndexByNode.get(edge.from);
    const toComponent = componentIndexByNode.get(edge.to);
    if (fromComponent == null || toComponent == null || fromComponent === toComponent) {
      continue;
    }
    const targets = componentEdges.get(fromComponent) as Set<number>;
    if (!targets.has(toComponent)) {
      targets.add(toComponent);
      componentIndegrees.set(toComponent, (componentIndegrees.get(toComponent) ?? 0) + 1);
    }
  }

  const componentQueue = [...components.keys()].filter((componentIndex) => (componentIndegrees.get(componentIndex) ?? 0) === 0).sort((a, b) => a - b);
  const componentOrder: number[] = [];
  while (componentQueue.length > 0) {
    const current = componentQueue.shift() as number;
    componentOrder.push(current);
    const nextComponents = [...(componentEdges.get(current) ?? new Set<number>())].sort((a, b) => a - b);
    for (const next of nextComponents) {
      const nextIndegree = (componentIndegrees.get(next) ?? 0) - 1;
      componentIndegrees.set(next, nextIndegree);
      if (nextIndegree === 0) {
        componentQueue.push(next);
        componentQueue.sort((a, b) => a - b);
      }
    }
  }
  for (const componentIndex of components.keys()) {
    if (!componentOrder.includes(componentIndex)) {
      componentOrder.push(componentIndex);
    }
  }

  const componentRank = new Map<number, number>();
  componentOrder.forEach((componentIndex, orderIndex) => componentRank.set(componentIndex, orderIndex));
  const rankByNode = new Map<string, number>();
  for (const nodeId of nodeIds) {
    const componentIndex = componentIndexByNode.get(nodeId) as number;
    rankByNode.set(nodeId, componentRank.get(componentIndex) ?? 0);
  }

  return rankByNode;
};

export const formatUnlockGraphMermaid = (graph: UnlockGraph): string => {
  const incomingCounts = new Map<string, number>();
  const outgoingCounts = new Map<string, number>();
  for (const node of graph.nodes) {
    incomingCounts.set(node.id, 0);
    outgoingCounts.set(node.id, 0);
  }
  for (const edge of graph.edges) {
    outgoingCounts.set(edge.from, (outgoingCounts.get(edge.from) ?? 0) + 1);
    incomingCounts.set(edge.to, (incomingCounts.get(edge.to) ?? 0) + 1);
  }

  const includedNodes = graph.nodes.filter((node) => {
    if (node.type === "sufficient_set") {
      return true;
    }
    const fromCount = outgoingCounts.get(node.id) ?? 0;
    const toCount = incomingCounts.get(node.id) ?? 0;
    return !(fromCount === 1 && toCount === 1);
  });
  const includedNodeIds = new Set(includedNodes.map((node) => node.id));
  const nodeOrder = buildMermaidNodeOrder({
    nodes: includedNodes,
    edges: graph.edges.filter((edge) => includedNodeIds.has(edge.from) && includedNodeIds.has(edge.to)),
  });

  const sortNodes = (nodes: GraphNode[]): GraphNode[] =>
    [...nodes].sort((a, b) =>
      (nodeOrder.get(a.id) ?? 0) - (nodeOrder.get(b.id) ?? 0)
      || a.label.localeCompare(b.label)
      || a.id.localeCompare(b.id),
    );

  const orderedNodes = sortNodes(includedNodes);
  const nodeAliasById = new Map(orderedNodes.map((node, index) => [node.id, `n${index}`]));

  const lines: string[] = ["graph TD"];
  const keyNodes = sortNodes(orderedNodes.filter((node) => node.type === "key"));
  const functionNodes = sortNodes(orderedNodes.filter((node) => node.type === "function"));
  const conditionNodes = sortNodes(orderedNodes.filter((node) => node.type === "condition"));
  const effectTargetNodes = sortNodes(orderedNodes.filter((node) => node.type === "effect_target"));
  const sufficientSetNodes = sortNodes(orderedNodes.filter((node) => node.type === "sufficient_set"));

  const appendNodeSubgraph = (title: string, nodes: GraphNode[], indent = "  "): void => {
    lines.push(`${indent}subgraph ${title}`);
    for (const node of nodes) {
      const alias = nodeAliasById.get(node.id) as string;
      const label = escapeMermaidLabel(`${node.type}: ${node.label}`);
      lines.push(`${indent}  ${alias}["${label}"]`);
    }
    lines.push(`${indent}end`);
  };

  lines.push("  subgraph Keys");
  for (const node of keyNodes) {
    const alias = nodeAliasById.get(node.id) as string;
    const label = escapeMermaidLabel(`${node.type}: ${node.label}`);
    lines.push(`    ${alias}["${label}"]`);
  }
  if (sufficientSetNodes.length > 0) {
    appendNodeSubgraph("SufficientSets", sufficientSetNodes, "    ");
  }
  lines.push("  end");

  if (effectTargetNodes.length > 0) {
    appendNodeSubgraph("EffectTargets", effectTargetNodes);
  }
  appendNodeSubgraph("Functions", functionNodes);
  appendNodeSubgraph("Conditions", conditionNodes);

  const orderedEdges = [...graph.edges]
    .filter((edge) => includedNodeIds.has(edge.from) && includedNodeIds.has(edge.to))
    .sort((a, b) =>
      (nodeOrder.get(a.from) ?? 0) - (nodeOrder.get(b.from) ?? 0)
      || (nodeOrder.get(a.to) ?? 0) - (nodeOrder.get(b.to) ?? 0)
      || a.type.localeCompare(b.type)
      || a.from.localeCompare(b.from)
      || a.to.localeCompare(b.to),
    );

  for (const edge of orderedEdges) {
    const fromAlias = nodeAliasById.get(edge.from) as string;
    const toAlias = nodeAliasById.get(edge.to) as string;
    lines.push(`  ${fromAlias} -->|${edge.type}| ${toAlias}`);
  }

  const mirroredRequirementLines = new Set<string>();
  for (const edge of orderedEdges) {
    if (edge.type !== "requires") {
      continue;
    }
    const conditionAlias = nodeAliasById.get(edge.from) as string;
    const functionAlias = nodeAliasById.get(edge.to) as string;
    mirroredRequirementLines.add(`  ${functionAlias} -->|required_for| ${conditionAlias}`);
  }
  for (const line of mirroredRequirementLines) {
    lines.push(line);
  }

  return `${lines.join("\n")}\n`;
};

