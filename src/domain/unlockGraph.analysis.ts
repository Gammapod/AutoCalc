import type { Key, UnlockDefinition } from "./types.js";
import type { UnlockGraphAnalysis } from "./unlockGraph.types.js";
import {
  allKnownEffectTargets,
  allKnownKeys,
  buildFunctionRules,
  collectContributorKeys,
  compareKeys,
  requiredFunctionIdsForUnlock,
  unlockedKeyFromEffect,
  unlockTargetsFromEffect,
} from "./unlockGraph.rules.js";

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
  const knownEffectTargets = allKnownEffectTargets(catalog).map((target) => target.id);
  const unlockedKeys = new Set<Key>(startingKeys);
  const reachedEffectTargets = new Set<string>();
  const reachableConditionIds = new Set<string>();
  const conditionStatuses: UnlockGraphAnalysis["conditionStatuses"] = [];

  let changed = true;
  while (changed) {
    changed = false;
    for (const unlock of catalog) {
      if (reachableConditionIds.has(unlock.id)) {
        continue;
      }
      const requiredFunctions = requiredFunctionIdsForUnlock(unlock, functionRules);
      const missingFunctions = requiredFunctions.filter((functionId) => !functionRules.get(functionId)?.isSatisfied(unlockedKeys));
      if (missingFunctions.length > 0) {
        continue;
      }
      reachableConditionIds.add(unlock.id);
      for (const target of unlockTargetsFromEffect(unlock)) {
        if (target.type === "key" && target.key && !unlockedKeys.has(target.key)) {
          unlockedKeys.add(target.key);
        }
        if (target.type === "effect_target") {
          reachedEffectTargets.add(target.id);
        }
      }
      changed = true;
    }
  }

  const blockedConditionIds = catalog
    .map((unlock) => unlock.id)
    .filter((unlockId) => !reachableConditionIds.has(unlockId));

  for (const unlock of catalog) {
    const requiredFunctions = requiredFunctionIdsForUnlock(unlock, functionRules);
    const missingFunctions = requiredFunctions.filter((functionId) => !functionRules.get(functionId)?.isSatisfied(unlockedKeys));
    const targets = unlockTargetsFromEffect(unlock);
    conditionStatuses.push({
      unlockId: unlock.id,
      reachable: reachableConditionIds.has(unlock.id),
      unlockedKey: unlockedKeyFromEffect(unlock),
      unlockedTargets: targets.map((target) => target.id).sort(),
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
    for (const functionId of requiredFunctionIdsForUnlock(unlock, functionRules)) {
      const providers = collectContributorKeys(functionRules.get(functionId)?.sufficiency ?? []);
      for (const providerKey of providers) {
        keyDependencyEdges.push([providerKey, targetKey]);
      }
    }
  }
  const keyCycles = findKeyCycles(keyDependencyEdges, allKnownKeys(catalog, startingKeys));
  const unreachableKeys = knownKeys.filter((key) => !unlockedKeys.has(key));
  const unreachableEffectTargets = knownEffectTargets.filter((targetId) => !reachedEffectTargets.has(targetId));

  return {
    startingKeys: [...startingKeys].sort(compareKeys),
    reachableConditionIds: [...reachableConditionIds].sort(),
    blockedConditionIds,
    unlockedKeysReached: [...unlockedKeys].sort(compareKeys),
    unreachableKeys,
    reachedEffectTargets: [...reachedEffectTargets].sort(),
    unreachableEffectTargets,
    conditionStatuses,
    keyCycles,
  };
};
