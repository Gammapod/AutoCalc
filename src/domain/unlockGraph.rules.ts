import type { Key, UnlockDefinition, UnlockEffect } from "./types.js";
import { getPredicateCapabilitySpec, type CapabilityId } from "./predicateCapabilitySpec.js";
import {
  capabilityToFunctionProviderIds,
  staticFunctionCapabilityProviders,
  type FunctionSufficiencySpec,
} from "./functionCapabilityProviders.js";
import type { GraphEdge, GraphNode, UnlockGraph, UnlockTargetDescriptor } from "./unlockGraph.types.js";

type FunctionRule = {
  id: string;
  label: string;
  rule: string;
  sufficiency: FunctionSufficiencySpec;
  isSatisfied: (keys: Set<Key>) => boolean;
};

export const compareKeys = (a: Key, b: Key): number => a.localeCompare(b);

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

export const collectContributorKeys = (sufficiency: FunctionSufficiencySpec): Key[] => {
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
  return {
    ...input,
    sufficiency: normalizedSufficiency,
    isSatisfied: (keys) => normalizedSufficiency.length > 0 && evaluateSufficiency(keys, normalizedSufficiency),
  };
};

const dedupeGraphEdges = (edges: GraphEdge[]): GraphEdge[] => {
  const seen = new Set<string>();
  const deduped: GraphEdge[] = [];
  for (const edge of edges) {
    const signature = `${edge.from}|${edge.to}|${edge.type}|${edge.label ?? ""}`;
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    deduped.push(edge);
  }
  return deduped;
};

const pressFunctionId = (key: Key): string => `fn.press_target_key.${key}`;

const unlockEffectTarget = (effect: UnlockEffect): UnlockTargetDescriptor => {
  if (
    effect.type === "unlock_digit" ||
    effect.type === "unlock_slot_operator" ||
    effect.type === "unlock_utility" ||
    effect.type === "unlock_memory" ||
    effect.type === "unlock_execution" ||
    effect.type === "unlock_visualizer"
  ) {
    return {
      id: `key.${effect.key}`,
      type: "key",
      label: effect.key,
      key: effect.key,
    };
  }
  if (effect.type === "increase_allocator_max_points") {
    return { id: "effect.allocator.max_points", type: "effect_target", label: "allocator.max_points" };
  }
  if (effect.type === "increase_max_total_digits") {
    return { id: "effect.calculator.max_total_digits", type: "effect_target", label: "calculator.max_total_digits" };
  }
  if (effect.type === "unlock_second_slot") {
    return { id: "effect.calculator.second_slot", type: "effect_target", label: "calculator.second_slot" };
  }
  if (effect.type === "upgrade_keypad_column") {
    return { id: "effect.keypad.columns", type: "effect_target", label: "keypad.columns" };
  }
  if (effect.type === "upgrade_keypad_row") {
    return { id: "effect.keypad.rows", type: "effect_target", label: "keypad.rows" };
  }
  return {
    id: `effect.move_key_to_coord.${effect.key}.r${effect.row}.c${effect.col}`,
    type: "effect_target",
    label: `move(${effect.key})@r${effect.row},c${effect.col}`,
  };
};

export const unlockTargetsFromEffect = (unlock: UnlockDefinition): UnlockTargetDescriptor[] => [unlockEffectTarget(unlock.effect)];

export const unlockedKeyFromEffect = (unlock: UnlockDefinition): Key | null => {
  const target = unlockEffectTarget(unlock.effect);
  return target.type === "key" ? target.key ?? null : null;
};

export const allKnownEffectTargets = (catalog: UnlockDefinition[]): UnlockTargetDescriptor[] => {
  const descriptors = new Map<string, UnlockTargetDescriptor>();
  for (const unlock of catalog) {
    const target = unlockEffectTarget(unlock.effect);
    if (target.type !== "effect_target") {
      continue;
    }
    descriptors.set(target.id, target);
  }
  return [...descriptors.values()].sort((a, b) => a.id.localeCompare(b.id));
};

export const allKnownKeys = (catalog: UnlockDefinition[], startingKeys: Key[]): Key[] => {
  const keys = new Set<Key>(startingKeys);
  for (const unlock of catalog) {
    const target = unlockEffectTarget(unlock.effect);
    if (target.type === "key" && target.key) {
      keys.add(target.key);
    }
    if (unlock.effect.type === "move_key_to_coord") {
      keys.add(unlock.effect.key);
    }
    if (unlock.predicate.type === "key_press_count_at_least") {
      keys.add(unlock.predicate.key);
    }
  }
  for (const provider of staticFunctionCapabilityProviders) {
    for (const key of collectContributorKeys(provider.sufficiency)) {
      keys.add(key);
    }
  }
  return [...keys].sort();
};

const resolveFunctionIdsForCapability = (unlock: UnlockDefinition, capability: CapabilityId): string[] => {
  if (capability === "press_target_key") {
    if (unlock.predicate.type !== "key_press_count_at_least") {
      throw new Error(
        `Capability press_target_key requires key_press_count_at_least predicate (unlock=${unlock.id}, predicate=${unlock.predicate.type})`,
      );
    }
    return [pressFunctionId(unlock.predicate.key)];
  }
  return capabilityToFunctionProviderIds[capability];
};

export const buildFunctionRules = (catalog: UnlockDefinition[]): Map<string, FunctionRule> => {
  const map = new Map<string, FunctionRule>(
    staticFunctionCapabilityProviders.map((provider) => [
      provider.id,
      defineFunctionRule({
        id: provider.id,
        label: provider.label,
        rule: provider.rule,
        sufficiency: provider.sufficiency,
      }),
    ]),
  );
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

export const requiredFunctionIdsForUnlock = (unlock: UnlockDefinition, functionRules: Map<string, FunctionRule>): string[] => {
  const spec = getPredicateCapabilitySpec(unlock.predicate.type);
  if (!spec) {
    throw new Error(`Missing predicate capability spec for ${unlock.predicate.type} (unlock=${unlock.id})`);
  }
  if (spec.notes?.startsWith("TODO:")) {
    throw new Error(`Predicate capability spec is TODO for ${unlock.predicate.type} (unlock=${unlock.id})`);
  }
  const functionIds = new Set<string>();
  for (const required of spec.necessary) {
    const resolved = resolveFunctionIdsForCapability(unlock, required.capability);
    if (resolved.length === 0) {
      throw new Error(
        `No function rules mapped for capability ${required.capability} (unlock=${unlock.id}, predicate=${unlock.predicate.type})`,
      );
    }
    for (const functionId of resolved) {
      if (!functionRules.has(functionId)) {
        throw new Error(`Missing function rule ${functionId} for unlock ${unlock.id}`);
      }
      functionIds.add(functionId);
    }
  }
  return [...functionIds].sort();
};

export const buildUnlockGraph = (catalog: UnlockDefinition[], startingKeys: Key[]): UnlockGraph => {
  const functionRules = buildFunctionRules(catalog);
  const keys = allKnownKeys(catalog, startingKeys);
  const effectTargets = allKnownEffectTargets(catalog);

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
  const effectTargetNodes: GraphNode[] = effectTargets.map((target) => ({
    id: target.id,
    type: "effect_target",
    label: target.label,
  }));
  const conditionNodes: GraphNode[] = catalog.map((unlock) => ({
    id: `cond.${unlock.id}`,
    type: "condition",
    label: unlock.id,
  }));

  const edges: GraphEdge[] = [];
  const globalSetNodeByClause = new Map<string, string>();
  let nextGlobalSetIndex = 0;
  for (const rule of functionRules.values()) {
    for (const clause of rule.sufficiency) {
      if (clause.length === 1) {
        edges.push({
          from: `key.${clause[0]}`,
          to: rule.id,
          type: "sufficient",
        });
        continue;
      }
      const clauseKey = clause.join("|");
      let setNodeId = globalSetNodeByClause.get(clauseKey);
      if (!setNodeId) {
        setNodeId = `set.global.${nextGlobalSetIndex}`;
        nextGlobalSetIndex += 1;
        globalSetNodeByClause.set(clauseKey, setNodeId);
        sufficientSetNodes.push({
          id: setNodeId,
          type: "sufficient_set",
          label: clause.join(" & "),
        });
      }
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
    const requiredFunctions = requiredFunctionIdsForUnlock(unlock, functionRules);
    for (const functionId of requiredFunctions) {
      const rule = functionRules.get(functionId);
      edges.push({
        from: conditionNodeId,
        to: functionId,
        type: "requires",
        label: rule?.rule,
      });
    }

    for (const target of unlockTargetsFromEffect(unlock)) {
      edges.push({
        from: conditionNodeId,
        to: target.id,
        type: "unlocks",
      });
    }
  }

  return {
    nodes: [...keyNodes, ...functionNodes, ...sufficientSetNodes, ...effectTargetNodes, ...conditionNodes],
    edges: dedupeGraphEdges(edges),
  };
};

