import type { Key, SufficiencyRequirement, SufficiencyToken, UnlockDefinition, UnlockEffect } from "./types.js";
import { KEY_ID } from "./keyPresentation.js";
import { getPredicateCapabilitySpec, type CapabilityId } from "./predicateCapabilitySpec.js";
import {
  capabilityToFunctionProviderIds,
  staticFunctionCapabilityProviders,
  type FunctionSufficiencySpec,
} from "./functionCapabilityProviders.js";
import type {
  GraphEdge,
  GraphNode,
  UnlockGraph,
  UnlockGraphAnalysis,
  UnlockGraphCanonicalUnlock,
  UnlockGraphDiagnostic,
} from "./unlockGraph.types.js";

type FunctionRule = {
  id: string;
  label: string;
  rule: string;
  sufficiency: FunctionSufficiencySpec;
  isSatisfied: (keys: Set<Key>) => boolean;
};

export const compareKeys = (a: Key, b: Key): number => a.localeCompare(b);
const isExecutionKey = (key: Key): boolean => key.startsWith("exec_");
const compareRequirements = (a: SufficiencyRequirement, b: SufficiencyRequirement): number => a.localeCompare(b);

const SUFFICIENCY_TOKEN_KEYS: Record<SufficiencyToken, Key[]> = {
  digit_nonzero: [
    KEY_ID.digit_1,
    KEY_ID.digit_2,
    KEY_ID.digit_3,
    KEY_ID.digit_4,
    KEY_ID.digit_5,
    KEY_ID.digit_6,
    KEY_ID.digit_7,
    KEY_ID.digit_8,
    KEY_ID.digit_9,
  ],
};
const SUFFICIENCY_TOKEN_LABELS: Record<SufficiencyToken, string> = {
  digit_nonzero: "digit_1..digit_9",
};

const compareNodeLabels = (a: GraphNode, b: GraphNode): number =>
  a.label.localeCompare(b.label) || a.id.localeCompare(b.id);

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

const pressFunctionId = (key: Key): string => `fn.press_target_key.${key}`;

const keyFromEffect = (effect: UnlockEffect): Key | null => {
  if (
    effect.type === "unlock_digit"
    || effect.type === "unlock_slot_operator"
    || effect.type === "unlock_utility"
    || effect.type === "unlock_memory"
    || effect.type === "unlock_execution"
    || effect.type === "unlock_visualizer"
  ) {
    return effect.key;
  }
  return null;
};

export const unlockedKeyFromEffect = (unlock: UnlockDefinition): Key | null => keyFromEffect(unlock.effect);

export const allKnownKeys = (catalog: UnlockDefinition[], startingKeys: Key[]): Key[] => {
  const keys = new Set<Key>(startingKeys);
  for (const unlock of catalog) {
    const targetKey = keyFromEffect(unlock.effect);
    if (targetKey) {
      keys.add(targetKey);
    }
    if (unlock.effect.type === "move_key_to_coord") {
      keys.add(unlock.effect.key);
    }
    if (unlock.predicate.type === "key_press_count_at_least") {
      keys.add(unlock.predicate.key);
    }
    if (unlock.predicate.type === "keys_unlocked_all") {
      for (const key of unlock.predicate.keys) {
        keys.add(key);
      }
    }
  }
  for (const provider of staticFunctionCapabilityProviders) {
    for (const key of collectContributorKeys(provider.sufficiency)) {
      keys.add(key);
    }
  }
  return [...keys].sort(compareKeys);
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

const isValidTargetNodeId = (value: string): boolean => value.trim().length > 0;

const normalizeKeySet = (keySet: readonly Key[]): Key[] => [...new Set(keySet)].sort(compareKeys);
const normalizeRequirementSet = (set: readonly SufficiencyRequirement[]): SufficiencyRequirement[] =>
  [...new Set(set)].sort(compareRequirements);

const isSufficiencyToken = (value: SufficiencyRequirement): value is SufficiencyToken =>
  Object.prototype.hasOwnProperty.call(SUFFICIENCY_TOKEN_KEYS, value);

const expandRequirementToKeys = (requirement: SufficiencyRequirement): Key[] =>
  isSufficiencyToken(requirement)
    ? SUFFICIENCY_TOKEN_KEYS[requirement]
    : [requirement as Key];

const targetNodeIdFromUnlock = (unlock: UnlockDefinition): string => `target.${unlock.targetNodeId}`;

const nodeLabelFromUnlock = (unlock: UnlockDefinition): string =>
  unlock.targetLabel?.trim().length ? unlock.targetLabel : unlock.targetNodeId;

const canonicalTargetForUnlock = (unlock: UnlockDefinition): {
  targetNodeId: string;
  targetLabel: string;
  targetType: "key" | "non_key";
} => {
  const targetKey = unlockedKeyFromEffect(unlock);
  if (targetKey) {
    return {
      targetNodeId: `key.${targetKey}`,
      targetLabel: targetKey,
      targetType: "key",
    };
  }
  return {
    targetNodeId: targetNodeIdFromUnlock(unlock),
    targetLabel: nodeLabelFromUnlock(unlock),
    targetType: "non_key",
  };
};

const dedupeGraphEdges = (edges: GraphEdge[]): GraphEdge[] => {
  const seen = new Set<string>();
  const deduped: GraphEdge[] = [];
  for (const edge of edges) {
    const signature = `${edge.from}|${edge.to}|${edge.type}|${edge.unlockId ?? ""}`;
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    deduped.push(edge);
  }
  return deduped;
};

const toDiagnosticsSortKey = (entry: UnlockGraphDiagnostic): string =>
  `${entry.unlockId}|${entry.reason}|${entry.detail}`;

const analyzeCatalog = (catalog: UnlockDefinition[], startingKeys: Key[]): UnlockGraphAnalysis => {
  const knownKeySet = new Set<Key>(allKnownKeys(catalog, startingKeys));
  const starting = [...new Set(startingKeys)].sort(compareKeys);
  const canonicalUnlocks: UnlockGraphCanonicalUnlock[] = [];
  const diagnostics: UnlockGraphDiagnostic[] = [];

  for (const unlock of catalog) {
    if (!isValidTargetNodeId(unlock.targetNodeId)) {
      diagnostics.push({
        unlockId: unlock.id,
        reason: "invalid_target_node_id",
        detail: "targetNodeId must be non-empty",
      });
      continue;
    }

    if (!Array.isArray(unlock.sufficientKeySets) || unlock.sufficientKeySets.length === 0) {
      diagnostics.push({
        unlockId: unlock.id,
        reason: "missing_sufficient_key_sets",
        detail: "sufficientKeySets must contain at least one key set",
      });
      continue;
    }

    const normalizedSets = unlock.sufficientKeySets.map((set) => normalizeRequirementSet(set));
    const setWithExecutionKey = normalizedSets.find((set) =>
      set.some((requirement) => expandRequirementToKeys(requirement).some((key) => isExecutionKey(key))));
    if (setWithExecutionKey) {
      diagnostics.push({
        unlockId: unlock.id,
        reason: "execution_key_in_sufficient_set",
        detail: `execution keys are not allowed in sufficient sets: ${setWithExecutionKey.join(", ")}`,
      });
      continue;
    }
    const canonicalSourceRequirements = normalizedSets[0] ?? [];
    if (canonicalSourceRequirements.length === 0) {
      diagnostics.push({
        unlockId: unlock.id,
        reason: "empty_sufficient_key_set",
        detail: "canonical sufficient key set (index 0) is empty",
      });
      continue;
    }

    const canonicalSourceKeysExpanded = [...new Set(
      canonicalSourceRequirements.flatMap((requirement) => expandRequirementToKeys(requirement)),
    )].sort(compareKeys);

    const unknownKeys = canonicalSourceKeysExpanded.filter((key) => !knownKeySet.has(key));
    if (unknownKeys.length > 0) {
      diagnostics.push({
        unlockId: unlock.id,
        reason: "unknown_key_in_sufficient_set",
        detail: `canonical set contains unknown keys: ${unknownKeys.join(", ")}`,
      });
      continue;
    }

    const target = canonicalTargetForUnlock(unlock);
    canonicalUnlocks.push({
      unlockId: unlock.id,
      targetNodeId: target.targetNodeId,
      targetLabel: target.targetLabel,
      targetType: target.targetType,
      effectType: unlock.effect.type,
      canonicalSourceRequirements,
      canonicalSourceKeysExpanded,
      sufficientSetCount: normalizedSets.length,
    });
  }

  canonicalUnlocks.sort((a, b) => a.unlockId.localeCompare(b.unlockId));
  diagnostics.sort((a, b) => toDiagnosticsSortKey(a).localeCompare(toDiagnosticsSortKey(b)));

  return {
    startingKeys: starting,
    knownKeys: [...knownKeySet].sort(compareKeys),
    canonicalUnlocks,
    diagnostics,
  };
};

export const analyzeUnlockGraph = (catalog: UnlockDefinition[], startingKeys: Key[]): UnlockGraphAnalysis =>
  analyzeCatalog(catalog, startingKeys);

const tokenNodeId = (token: SufficiencyToken): string => `token.${token}`;

export const buildUnlockGraph = (catalog: UnlockDefinition[], startingKeys: Key[]): UnlockGraph => {
  const analysis = analyzeCatalog(catalog, startingKeys);
  const nodesById = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  for (const key of analysis.knownKeys) {
    nodesById.set(`key.${key}`, {
      id: `key.${key}`,
      type: "key",
      label: key,
    });
  }

  for (const unlock of analysis.canonicalUnlocks) {
    if (unlock.targetType === "non_key") {
      nodesById.set(unlock.targetNodeId, {
        id: unlock.targetNodeId,
        type: "unlock_target",
        label: unlock.targetLabel,
      });
    }
    for (const requirement of unlock.canonicalSourceRequirements) {
      const sourceNodeId = isSufficiencyToken(requirement)
        ? tokenNodeId(requirement)
        : `key.${requirement}`;
      if (isSufficiencyToken(requirement)) {
        nodesById.set(sourceNodeId, {
          id: sourceNodeId,
          type: "sufficiency_token",
          label: SUFFICIENCY_TOKEN_LABELS[requirement],
        });
      } else {
        nodesById.set(sourceNodeId, {
          id: sourceNodeId,
          type: "key",
          label: requirement,
        });
      }
      edges.push({
        from: sourceNodeId,
        to: unlock.targetNodeId,
        type: "unlocks",
        unlockId: unlock.unlockId,
      });
    }
  }

  return {
    nodes: [...nodesById.values()].sort(compareNodeLabels),
    edges: dedupeGraphEdges(edges),
  };
};
