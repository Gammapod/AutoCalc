import type { GameState, Key, UnlockDefinition } from "./types.js";

export type GraphNodeType = "key" | "function" | "condition";
export type GraphEdgeType = "contributes" | "requires" | "unlocks";

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
  contributorKeys: Key[];
  rule: string;
  isSatisfied: (keys: Set<Key>) => boolean;
};

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
const VALUE_KEYS: Key[] = [...DIGIT_KEYS, "NEG"];
const OPERATOR_KEYS: Key[] = ["+", "-", "*", "/", "#", "\u27E1"];

const staticFunctionRules: FunctionRule[] = [
  {
    id: "fn.execute_activation",
    label: "execute_activation",
    contributorKeys: ["=", "++", "\u23EF"],
    rule: "= or ++ is unlocked",
    isSatisfied: (keys) => keys.has("=") || keys.has("++"),
  },
  {
    id: "fn.step_plus_one",
    label: "step_plus_one",
    contributorKeys: ["++", "=", "+", "1"],
    rule: "++ is unlocked OR (= and + and 1 are unlocked)",
    isSatisfied: (keys) => keys.has("++") || (keys.has("=") && keys.has("+") && keys.has("1")),
  },
  {
    id: "fn.step_minus_one",
    label: "step_minus_one",
    contributorKeys: ["=", "-", "+", "NEG", "1"],
    rule: "(= and - and 1) OR (= and + and NEG and 1)",
    isSatisfied: (keys) => (keys.has("=") && keys.has("-") && keys.has("1")) || (keys.has("=") && keys.has("+") && keys.has("NEG") && keys.has("1")),
  },
  {
    id: "fn.reset_to_zero",
    label: "reset_to_zero",
    contributorKeys: ["C", "UNDO"],
    rule: "C or UNDO is unlocked",
    isSatisfied: (keys) => keys.has("C") || keys.has("UNDO"),
  },
  {
    id: "fn.form_operator_plus_operand",
    label: "form_operator_plus_operand",
    contributorKeys: [...OPERATOR_KEYS, ...VALUE_KEYS],
    rule: "at least one operator key and at least one value key are unlocked",
    isSatisfied: (keys) => OPERATOR_KEYS.some((key) => keys.has(key)) && VALUE_KEYS.some((key) => keys.has(key)),
  },
  {
    id: "fn.roll_growth",
    label: "roll_growth",
    contributorKeys: ["=", "++", "+", "-", "NEG", "1", ...OPERATOR_KEYS, ...VALUE_KEYS],
    rule: "execute activation and at least one growth-producing operation",
    isSatisfied: (keys) =>
      keys.has("=") &&
      (OPERATOR_KEYS.some((key) => keys.has(key)) && VALUE_KEYS.some((key) => keys.has(key))
        || keys.has("++")
        || (keys.has("-") && keys.has("1"))
        || (keys.has("+") && keys.has("NEG") && keys.has("1"))),
  },
  {
    id: "fn.roll_equal_run",
    label: "roll_equal_run",
    contributorKeys: ["=", "+", "-", "*", "/", "0", "1"],
    rule: "= and one of (+ and 0), (- and 0), (* and 1), (/ and 1)",
    isSatisfied: (keys) =>
      keys.has("=") &&
      ((keys.has("+") && keys.has("0"))
        || (keys.has("-") && keys.has("0"))
        || (keys.has("*") && keys.has("1"))
        || (keys.has("/") && keys.has("1"))),
  },
  {
    id: "fn.roll_incrementing_run",
    label: "roll_incrementing_run",
    contributorKeys: ["=", "+", "1"],
    rule: "= and + and 1 are unlocked",
    isSatisfied: (keys) => keys.has("=") && keys.has("+") && keys.has("1"),
  },
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
    for (const key of fn.contributorKeys) {
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
    map.set(id, {
      id,
      label: `press_target_key(${key})`,
      contributorKeys: [key],
      rule: `${key} is unlocked`,
      isSatisfied: (keys) => keys.has(key),
    });
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
  const conditionNodes: GraphNode[] = catalog.map((unlock) => ({
    id: `cond.${unlock.id}`,
    type: "condition",
    label: unlock.id,
  }));

  const edges: GraphEdge[] = [];
  for (const rule of functionRules.values()) {
    for (const key of rule.contributorKeys) {
      edges.push({
        from: `key.${key}`,
        to: rule.id,
        type: "contributes",
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
    nodes: [...keyNodes, ...functionNodes, ...conditionNodes],
    edges,
  };
};

const compareKeys = (a: Key, b: Key): number => a.localeCompare(b);

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
      const providers = functionRules.get(functionId)?.contributorKeys ?? [];
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
    { key: 0, function: 0, condition: 0 },
  );
  const edgeCounts = report.graph.edges.reduce(
    (acc, edge) => {
      acc[edge.type] += 1;
      return acc;
    },
    { contributes: 0, requires: 0, unlocks: 0 },
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
    `- Nodes: key=${nodeCounts.key}, function=${nodeCounts.function}, condition=${nodeCounts.condition}`,
    `- Edges: contributes=${edgeCounts.contributes}, requires=${edgeCounts.requires}, unlocks=${edgeCounts.unlocks}`,
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
