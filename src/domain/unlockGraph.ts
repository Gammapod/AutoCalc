import type { GameState, Key, UnlockDefinition } from "./types.js";

export type GraphNodeType = "key" | "function" | "condition" | "sufficient_set";
export type GraphEdgeType = "necessary" | "sufficient" | "requires" | "unlocks";

export type GraphNode = {
  id: string;
  type: GraphNodeType;
  label: string;
};

export type GraphEdge = {
  from: string;
  to: string;
  type: GraphEdgeType;
  label?: string;
};

export type UnlockGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

type FunctionRule = {
  id: string;
  label: string;
  rule: string;
  sufficiency: FunctionSufficiencySpec;
  isSatisfied: (keys: Set<Key>) => boolean;
};

type SufficientClause = readonly Key[];
type FunctionSufficiencySpec = readonly SufficientClause[];

export type ConditionStatus = {
  unlockId: string;
  reachable: boolean;
  unlockedKey: Key | null;
  requiredFunctions: string[];
  missingFunctions: string[];
};

export type UnlockGraphAnalysis = {
  startingKeys: Key[];
  reachableConditionIds: string[];
  blockedConditionIds: string[];
  unlockedKeysReached: Key[];
  unreachableKeys: Key[];
  conditionStatuses: ConditionStatus[];
  keyCycles: Key[][];
};

export type UnlockGraphReport = {
  generatedAtIso: string;
  graph: UnlockGraph;
  analysis: UnlockGraphAnalysis;
};

const DIGIT_KEYS: Key[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const OPERATOR_KEYS: Key[] = ["+", "-", "*", "/", "#", "\u27E1"];

const compareKeys = (a: Key, b: Key): number => a.localeCompare(b);

const normalizeClause = (clause: readonly Key[]): Key[] => [...new Set(clause)].sort(compareKeys);

const normalizeSufficiency = (sufficiency: FunctionSufficiencySpec): Key[][] =>
  [...new Map(
    sufficiency
      .map((clause) => normalizeClause(clause))
      .filter((clause) => clause.length > 0)
      .map((clause) => [clause.join("|"), clause]),
  ).values()];

const evaluateSufficiency = (keys: Set<Key>, sufficiency: FunctionSufficiencySpec): boolean =>
  sufficiency.some((clause) => clause.every((key) => keys.has(key)));

const collectContributorKeys = (sufficiency: FunctionSufficiencySpec): Key[] => {
  const keys = new Set<Key>();
  for (const clause of sufficiency) {
    for (const key of clause) {
      keys.add(key);
    }
  }
  return [...keys].sort(compareKeys);
};

const defineFunctionRule = (input: Omit<FunctionRule, "isSatisfied" | "sufficiency"> & { sufficiency: FunctionSufficiencySpec }): FunctionRule => {
  const normalizedSufficiency = normalizeSufficiency(input.sufficiency);
  if (normalizedSufficiency.length === 0) {
    throw new Error(`Function rule ${input.id} must define at least one non-empty sufficient clause`);
  }
  return {
    ...input,
    sufficiency: normalizedSufficiency,
    isSatisfied: (keys) => evaluateSufficiency(keys, normalizedSufficiency),
  };
};

const operatorClauses = (): Key[][] => OPERATOR_KEYS.map((operator) => [operator]);

const staticFunctionRules: FunctionRule[] = [
  defineFunctionRule({
    id: "fn.execute_activation",
    label: "execute_activation",
    rule: "= or ++ is unlocked",
    sufficiency: [["="], ["++"]],
  }),
  defineFunctionRule({
    id: "fn.step_plus_one",
    label: "step_plus_one",
    rule: "++ is unlocked OR (= and + and 1 are unlocked)",
    sufficiency: [["++"], ["=", "+"]],
  }),
  defineFunctionRule({
    id: "fn.step_minus_one",
    label: "step_minus_one",
    rule: "(= and - and 1) OR (= and + and NEG and 1)",
    sufficiency: [["=", "-"], ["=", "+", "NEG"]],
  }),
  defineFunctionRule({
    id: "fn.reset_to_zero",
    label: "reset_to_zero",
    rule: "C or UNDO is unlocked",
    sufficiency: [["C"], ["UNDO"]],
  }),
  defineFunctionRule({
    id: "fn.form_operator_plus_operand",
    label: "form_operator_plus_operand",
    rule: "at least one operator key and at least one value key are unlocked",
    sufficiency: operatorClauses(),
  }),
  defineFunctionRule({
    id: "fn.roll_growth",
    label: "roll_growth",
    rule: "execute activation and at least one growth-producing operation",
    sufficiency: [
      ["=", "++"],
      ...operatorClauses().map((clause) => ["=", ...clause] as Key[]),
    ],
  }),
  defineFunctionRule({
    id: "fn.roll_equal_run",
    label: "roll_equal_run",
    rule: "= and one of (+ and 0), (- and 0), (* and 1), (/ and 1)",
    sufficiency: [["=", "+"], ["=", "-"], ["=", "*"], ["=", "/"]],
  }),
  defineFunctionRule({
    id: "fn.roll_incrementing_run",
    label: "roll_incrementing_run",
    rule: "= and + and 1 are unlocked",
    sufficiency: [["=", "+"]],
  }),
];

const pressFunctionId = (key: Key): string => `fn.press_target_key.${key}`;

const allKnownKeys = (catalog: UnlockDefinition[], startingKeys: Key[]): Key[] => {
  const keys = new Set<Key>(startingKeys);
  for (const unlock of catalog) {
    if (unlock.effect.type === "unlock_digit" || unlock.effect.type === "unlock_slot_operator" || unlock.effect.type === "unlock_utility" || unlock.effect.type === "unlock_execution") {
      keys.add(unlock.effect.key);
    }
    if (unlock.effect.type === "move_key_to_coord") {
      keys.add(unlock.effect.key);
    }
    if (unlock.predicate.type === "key_press_count_at_least") {
      keys.add(unlock.predicate.key);
    }
  }
  for (const fn of staticFunctionRules) {
    for (const key of collectContributorKeys(fn.sufficiency)) {
      keys.add(key);
    }
  }
  return [...keys].sort();
};

const unlockedKeyFromEffect = (unlock: UnlockDefinition): Key | null => {
  if (unlock.effect.type === "unlock_digit" || unlock.effect.type === "unlock_slot_operator" || unlock.effect.type === "unlock_utility" || unlock.effect.type === "unlock_execution") {
    return unlock.effect.key;
  }
  return null;
};

const requiredFunctionIdsForUnlock = (unlock: UnlockDefinition): string[] => {
  if (unlock.predicate.type === "total_equals" || unlock.predicate.type === "total_at_least") {
    return ["fn.step_plus_one"];
  }
  if (unlock.predicate.type === "roll_contains_value") {
    return ["fn.execute_activation", "fn.form_operator_plus_operand"];
  }
  if (unlock.predicate.type === "roll_ends_with_equal_run") {
    return ["fn.execute_activation", "fn.roll_equal_run"];
  }
  if (unlock.predicate.type === "roll_ends_with_incrementing_run") {
    return ["fn.execute_activation", "fn.roll_incrementing_run"];
  }
  if (unlock.predicate.type === "key_press_count_at_least") {
    return [pressFunctionId(unlock.predicate.key)];
  }
  if (unlock.predicate.type === "overflow_error_seen") {
    return ["fn.step_plus_one"];
  }
  return [];
};

const buildFunctionRules = (catalog: UnlockDefinition[]): Map<string, FunctionRule> => {
  const map = new Map<string, FunctionRule>(staticFunctionRules.map((rule) => [rule.id, rule]));
  for (const unlock of catalog) {
    if (unlock.predicate.type !== "key_press_count_at_least") {
      continue;
    }
    const id = pressFunctionId(unlock.predicate.key);
    if (map.has(id)) {
      continue;
    }
    const key = unlock.predicate.key;
    map.set(id, defineFunctionRule({
      id,
      label: `press_target_key(${key})`,
      rule: `${key} is unlocked`,
      sufficiency: [[key]],
    }));
  }
  return map;
};

export const buildUnlockGraph = (catalog: UnlockDefinition[], startingKeys: Key[]): UnlockGraph => {
  const functionRules = buildFunctionRules(catalog);
  const keys = allKnownKeys(catalog, startingKeys);

  const keyNodes: GraphNode[] = keys.map((key) => ({
    id: `key.${key}`,
    type: "key",
    label: key,
  }));
  const functionNodes: GraphNode[] = [...functionRules.values()].map((rule) => ({
    id: rule.id,
    type: "function",
    label: rule.label,
  }));
  const sufficientSetNodes: GraphNode[] = [];
  const conditionNodes: GraphNode[] = catalog.map((unlock) => ({
    id: `cond.${unlock.id}`,
    type: "condition",
    label: unlock.id,
  }));

  const edges: GraphEdge[] = [];
  for (const rule of functionRules.values()) {
    for (const [index, clause] of rule.sufficiency.entries()) {
      if (clause.length === 1) {
        edges.push({
          from: `key.${clause[0]}`,
          to: rule.id,
          type: "sufficient",
        });
        continue;
      }
      const setNodeId = `set.${rule.id}.${index}`;
      sufficientSetNodes.push({
        id: setNodeId,
        type: "sufficient_set",
        label: clause.join(" & "),
      });
      for (const key of clause) {
        edges.push({
          from: `key.${key}`,
          to: setNodeId,
          type: "necessary",
        });
      }
      edges.push({
        from: setNodeId,
        to: rule.id,
        type: "sufficient",
      });
    }
  }

  for (const unlock of catalog) {
    const conditionNodeId = `cond.${unlock.id}`;
    const requiredFunctions = requiredFunctionIdsForUnlock(unlock);
    for (const functionId of requiredFunctions) {
      const rule = functionRules.get(functionId);
      edges.push({
        from: conditionNodeId,
        to: functionId,
        type: "requires",
        label: rule?.rule,
      });
    }
    const unlockedKey = unlockedKeyFromEffect(unlock);
    if (unlockedKey) {
      edges.push({
        from: conditionNodeId,
        to: `key.${unlockedKey}`,
        type: "unlocks",
      });
    }
  }

  return {
    nodes: [...keyNodes, ...functionNodes, ...sufficientSetNodes, ...conditionNodes],
    edges,
  };
};

const findKeyCycles = (edges: Array<[Key, Key]>, keys: Key[]): Key[][] => {
  const adjacency = new Map<Key, Key[]>();
  for (const key of keys) {
    adjacency.set(key, []);
  }
  for (const [from, to] of edges) {
    adjacency.get(from)?.push(to);
  }

  let index = 0;
  const stack: Key[] = [];
  const onStack = new Set<Key>();
  const indices = new Map<Key, number>();
  const lowlink = new Map<Key, number>();
  const components: Key[][] = [];

  const strongConnect = (node: Key): void => {
    indices.set(node, index);
    lowlink.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);

    for (const next of adjacency.get(node) ?? []) {
      if (!indices.has(next)) {
        strongConnect(next);
        lowlink.set(node, Math.min(lowlink.get(node) ?? Number.MAX_SAFE_INTEGER, lowlink.get(next) ?? Number.MAX_SAFE_INTEGER));
      } else if (onStack.has(next)) {
        lowlink.set(node, Math.min(lowlink.get(node) ?? Number.MAX_SAFE_INTEGER, indices.get(next) ?? Number.MAX_SAFE_INTEGER));
      }
    }

    if ((lowlink.get(node) ?? -1) !== (indices.get(node) ?? -1)) {
      return;
    }

    const component: Key[] = [];
    while (stack.length > 0) {
      const top = stack.pop() as Key;
      onStack.delete(top);
      component.push(top);
      if (top === node) {
        break;
      }
    }
    const hasSelfLoop = (adjacency.get(component[0]) ?? []).includes(component[0]);
    if (component.length > 1 || hasSelfLoop) {
      components.push(component.sort(compareKeys));
    }
  };

  for (const key of keys) {
    if (!indices.has(key)) {
      strongConnect(key);
    }
  }

  return components.sort((a, b) => a[0].localeCompare(b[0]));
};

export const analyzeUnlockGraph = (catalog: UnlockDefinition[], startingKeys: Key[]): UnlockGraphAnalysis => {
  const functionRules = buildFunctionRules(catalog);
  const knownKeys = allKnownKeys(catalog, startingKeys);
  const unlockedKeys = new Set<Key>(startingKeys);
  const reachableConditionIds = new Set<string>();
  const conditionStatuses: ConditionStatus[] = [];

  let changed = true;
  while (changed) {
    changed = false;
    for (const unlock of catalog) {
      if (reachableConditionIds.has(unlock.id)) {
        continue;
      }
      const requiredFunctions = requiredFunctionIdsForUnlock(unlock);
      const missingFunctions = requiredFunctions.filter((functionId) => !functionRules.get(functionId)?.isSatisfied(unlockedKeys));
      if (missingFunctions.length > 0) {
        continue;
      }
      reachableConditionIds.add(unlock.id);
      const unlockedKey = unlockedKeyFromEffect(unlock);
      if (unlockedKey && !unlockedKeys.has(unlockedKey)) {
        unlockedKeys.add(unlockedKey);
      }
      changed = true;
    }
  }

  const blockedConditionIds = catalog
    .map((unlock) => unlock.id)
    .filter((unlockId) => !reachableConditionIds.has(unlockId));

  for (const unlock of catalog) {
    const requiredFunctions = requiredFunctionIdsForUnlock(unlock);
    const missingFunctions = requiredFunctions.filter((functionId) => !functionRules.get(functionId)?.isSatisfied(unlockedKeys));
    conditionStatuses.push({
      unlockId: unlock.id,
      reachable: reachableConditionIds.has(unlock.id),
      unlockedKey: unlockedKeyFromEffect(unlock),
      requiredFunctions,
      missingFunctions,
    });
  }

  const keyDependencyEdges: Array<[Key, Key]> = [];
  for (const unlock of catalog) {
    const targetKey = unlockedKeyFromEffect(unlock);
    if (!targetKey) {
      continue;
    }
    for (const functionId of requiredFunctionIdsForUnlock(unlock)) {
      const providers = collectContributorKeys(functionRules.get(functionId)?.sufficiency ?? []);
      for (const providerKey of providers) {
        keyDependencyEdges.push([providerKey, targetKey]);
      }
    }
  }
  const keyCycles = findKeyCycles(keyDependencyEdges, allKnownKeys(catalog, startingKeys));
  const unreachableKeys = knownKeys.filter((key) => !unlockedKeys.has(key));

  return {
    startingKeys: [...startingKeys].sort(compareKeys),
    reachableConditionIds: [...reachableConditionIds].sort(),
    blockedConditionIds,
    unlockedKeysReached: [...unlockedKeys].sort(compareKeys),
    unreachableKeys,
    conditionStatuses,
    keyCycles,
  };
};

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
    { key: 0, function: 0, condition: 0, sufficient_set: 0 },
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
    `- Nodes: key=${nodeCounts.key}, function=${nodeCounts.function}, condition=${nodeCounts.condition}, sufficient_set=${nodeCounts.sufficient_set}`,
    `- Edges: necessary=${edgeCounts.necessary}, sufficient=${edgeCounts.sufficient}, requires=${edgeCounts.requires}, unlocks=${edgeCounts.unlocks}`,
    "",
    "Progression Summary",
    `- Starting keys: ${report.analysis.startingKeys.join(", ") || "(none)"}`,
    `- Reachable conditions: ${reachable.length}`,
    `- Blocked conditions: ${blocked.length}`,
    `- Keys reachable from simulation: ${report.analysis.unlockedKeysReached.join(", ") || "(none)"}`,
    `- Unreachable keys: ${report.analysis.unreachableKeys.join(", ") || "(none)"}`,
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
  const sufficientSetNodes = sortNodes(orderedNodes.filter((node) => node.type === "sufficient_set"));

  const appendNodeSubgraph = (title: string, nodes: GraphNode[]): void => {
    lines.push(`  subgraph ${title}`);
    for (const node of nodes) {
      const alias = nodeAliasById.get(node.id) as string;
      const label = escapeMermaidLabel(`${node.type}: ${node.label}`);
      lines.push(`    ${alias}["${label}"]`);
    }
    lines.push("  end");
  };

  appendNodeSubgraph("Keys", keyNodes);
  appendNodeSubgraph("Functions", functionNodes);
  appendNodeSubgraph("Conditions", conditionNodes);
  if (sufficientSetNodes.length > 0) {
    appendNodeSubgraph("SufficientSets", sufficientSetNodes);
  }

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

  // Mirror requirement links so the graph can be read from function -> condition as well.
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

export const filterUnlockGraphToIncomingUnlockKeys = (
  graph: UnlockGraph,
  alwaysIncludeKeys: Key[] = ["++"],
): UnlockGraph => {
  const alwaysInclude = new Set(alwaysIncludeKeys);
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const outgoingEdges = new Map<string, GraphEdge[]>();
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
      .map((edge) => edge.to),
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
  for (const [key, unlocked] of Object.entries(state.unlocks.utilities)) {
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
