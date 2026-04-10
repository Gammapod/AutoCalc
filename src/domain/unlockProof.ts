import { stableSignature } from "../infra/stateSignature.js";
import { keyCatalog } from "../contracts/keyCatalog.js";
import { reducer } from "./reducer.js";
import { evaluateUnlockPredicate } from "./unlockEngine.js";
import { applyEffect } from "./unlocks.js";
import { isKeyUsableForInput } from "./keyUnlocks.js";
import type { Action, GameState, Key, UnlockDefinition } from "./types.js";
import type {
  ProofAction,
  ProofBounds,
  ProofLayer,
  UnlockProofRecord,
  UnlockProofReport,
} from "./unlockGraph.types.js";
import {
  allKnownKeys,
  buildFunctionRules,
  collectContributorKeys,
  requiredFunctionIdsForUnlock,
  unlockedKeyFromEffect,
} from "./unlockGraph.rules.js";
import { deriveUnlockedKeysFromState } from "./unlockGraph.filters.js";

const ENGINE_VERSION = "unlock-proof-v1";
const DEFAULT_BOUNDS: ProofBounds = {
  maxSeconds: 60,
  maxDepth: 18,
  maxStatesPerUnlock: 20000,
};

const FIXED_ACTIONS: readonly ProofAction[] = [
  { type: "UPGRADE_KEYPAD_COLUMN" },
  { type: "UPGRADE_KEYPAD_ROW" },
];

type SearchResult = {
  witness: ProofAction[] | null;
  exploredStates: number;
  maxDepthReached: number;
  timedOut: boolean;
  stateLimitHit: boolean;
  depthLimitHit: boolean;
};

type FrontierState = {
  state: GameState;
  signature: string;
};

type LayerCacheEntry = {
  index: number;
  fingerprint: string;
  layer: ProofLayer;
  frontierOutputStates: GameState[];
};

export type UnlockProofCacheSnapshot = {
  engineVersion: string;
  catalogFingerprint: string;
  bounds: ProofBounds;
  layers: LayerCacheEntry[];
};

export type BuildUnlockProofReportOptions = {
  now?: Date;
  bounds?: Partial<ProofBounds>;
  initialStates?: GameState[];
  cacheMode?: "off" | "local";
  cacheSnapshot?: UnlockProofCacheSnapshot | null;
};

export type BuildUnlockProofReportResult = {
  report: UnlockProofReport;
  cacheSnapshot: UnlockProofCacheSnapshot;
};

const normalizeBounds = (input?: Partial<ProofBounds>): ProofBounds => ({
  maxSeconds: Math.max(1, Math.trunc(input?.maxSeconds ?? DEFAULT_BOUNDS.maxSeconds)),
  maxDepth: Math.max(0, Math.trunc(input?.maxDepth ?? DEFAULT_BOUNDS.maxDepth)),
  maxStatesPerUnlock: Math.max(1, Math.trunc(input?.maxStatesPerUnlock ?? DEFAULT_BOUNDS.maxStatesPerUnlock)),
});

const bigintReplacer = (_key: string, value: unknown): unknown =>
  typeof value === "bigint" ? { __bigint: value.toString() } : value;

const stableJson = (value: unknown): string => JSON.stringify(value, bigintReplacer);

const toAction = (proofAction: ProofAction): Action => {
  if (proofAction.type === "PRESS_KEY") {
    return { type: "PRESS_KEY", key: proofAction.key };
  }
  return proofAction;
};

const actionSortKey = (action: ProofAction): string =>
  action.type === "PRESS_KEY" ? `PRESS_KEY:${action.key}` : action.type;

const actionUniverseForState = (state: GameState): ProofAction[] => {
  const keyActions: ProofAction[] = keyCatalog
    .map((entry) => entry.key)
    .filter((key): key is Key => isKeyUsableForInput(state, key))
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({ type: "PRESS_KEY", key }));
  return [...keyActions, ...FIXED_ACTIONS].sort((a, b) => actionSortKey(a).localeCompare(actionSortKey(b)));
};

const dedupeFrontierStates = (states: GameState[]): FrontierState[] => {
  const seen = new Set<string>();
  const deduped: FrontierState[] = [];
  for (const state of states) {
    const signature = stableSignature(state);
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    deduped.push({ state, signature });
  }
  return deduped.sort((a, b) => a.signature.localeCompare(b.signature));
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
    if (component.length > 1 || (adjacency.get(component[0]) ?? []).includes(component[0])) {
      components.push(component.sort((a, b) => a.localeCompare(b)));
    }
  };

  for (const key of keys) {
    if (!indices.has(key)) {
      strongConnect(key);
    }
  }
  return components;
};

const impossibleByKeysUnlockedAll = (
  unlock: UnlockDefinition,
  frontierUnlockedKeys: Set<Key>,
  unlockableKeys: Set<Key>,
): string | null => {
  if (unlock.predicate.type !== "keys_unlocked_all") {
    return null;
  }
  const missing = unlock.predicate.keys.filter((key) => !frontierUnlockedKeys.has(key) && !unlockableKeys.has(key));
  if (missing.length === 0) {
    return null;
  }
  return `keys cannot ever be unlocked: ${missing.join(", ")}`;
};

const impossibleByPressTarget = (
  unlock: UnlockDefinition,
  frontierUsableKeys: Set<Key>,
  unlockableKeys: Set<Key>,
): string | null => {
  if (unlock.predicate.type !== "key_press_count_at_least") {
    return null;
  }
  if (frontierUsableKeys.has(unlock.predicate.key) || unlockableKeys.has(unlock.predicate.key)) {
    return null;
  }
  return `press target key cannot ever be unlocked: ${unlock.predicate.key}`;
};

const buildCycleImpossibleSet = (
  catalog: UnlockDefinition[],
  functionRules: ReturnType<typeof buildFunctionRules>,
  frontierUnlockedKeys: Set<Key>,
): Set<Key> => {
  const knownKeys = allKnownKeys(catalog, [...frontierUnlockedKeys]);
  const keyEdges: Array<[Key, Key]> = [];
  const incomingFromOutside = new Map<Key, number>();
  for (const key of knownKeys) {
    incomingFromOutside.set(key, 0);
  }
  for (const unlock of catalog) {
    const targetKey = unlockedKeyFromEffect(unlock);
    if (!targetKey) {
      continue;
    }
    const functionIds = requiredFunctionIdsForUnlock(unlock, functionRules);
    for (const functionId of functionIds) {
      const rule = functionRules.get(functionId);
      const providers = collectContributorKeys(rule?.sufficiency ?? []);
      for (const providerKey of providers) {
        keyEdges.push([providerKey, targetKey]);
      }
    }
  }

  const cycles = findKeyCycles(keyEdges, knownKeys);
  const componentByKey = new Map<Key, number>();
  cycles.forEach((component, idx) => {
    for (const key of component) {
      componentByKey.set(key, idx);
    }
  });
  for (const [from, to] of keyEdges) {
    const fromComponent = componentByKey.get(from);
    const toComponent = componentByKey.get(to);
    if (fromComponent == null || toComponent == null || fromComponent === toComponent) {
      continue;
    }
    incomingFromOutside.set(to, (incomingFromOutside.get(to) ?? 0) + 1);
  }
  const impossibleKeys = new Set<Key>();
  for (const component of cycles) {
    const seeded = component.some((key) => frontierUnlockedKeys.has(key));
    const hasIncoming = component.some((key) => (incomingFromOutside.get(key) ?? 0) > 0);
    if (!seeded && !hasIncoming) {
      for (const key of component) {
        impossibleKeys.add(key);
      }
    }
  }
  return impossibleKeys;
};

const findImpossibleCertificate = (
  unlock: UnlockDefinition,
  functionRules: ReturnType<typeof buildFunctionRules>,
  impossibleCycleKeys: Set<Key>,
  frontierUnlockedKeys: Set<Key>,
  frontierUsableKeys: Set<Key>,
  unlockableKeys: Set<Key>,
): { ruleId: string; message: string } | null => {
  const requiredFunctionIds = requiredFunctionIdsForUnlock(unlock, functionRules);
  for (const functionId of requiredFunctionIds) {
    const rule = functionRules.get(functionId);
    if (!rule || rule.sufficiency.length > 0) {
      continue;
    }
    return {
      ruleId: "dead_function_no_clauses",
      message: `required capability has no sufficiency clauses: ${functionId}`,
    };
  }

  const targetKey = unlockedKeyFromEffect(unlock);
  if (targetKey && impossibleCycleKeys.has(targetKey)) {
    return {
      ruleId: "cycle_without_seed",
      message: `target key ${targetKey} is in a dependency cycle with no seed and no external incoming providers`,
    };
  }

  const missingAll = impossibleByKeysUnlockedAll(unlock, frontierUnlockedKeys, unlockableKeys);
  if (missingAll) {
    return {
      ruleId: "keys_unlocked_all_unreachable_key",
      message: missingAll,
    };
  }
  const missingPress = impossibleByPressTarget(unlock, frontierUsableKeys, unlockableKeys);
  if (missingPress) {
    return {
      ruleId: "press_target_key_unreachable",
      message: missingPress,
    };
  }
  return null;
};

const proveUnlock = (
  unlock: UnlockDefinition,
  frontierStates: FrontierState[],
  bounds: ProofBounds,
  deadlineMs: number,
): SearchResult => {
  type Node = { state: GameState; signature: string; depth: number; parent: number; action: ProofAction | null };
  const queue: Node[] = [];
  const visited = new Set<string>();
  let cursor = 0;
  let exploredStates = 0;
  let maxDepthReached = 0;
  let timedOut = false;
  let stateLimitHit = false;
  let depthLimitHit = false;

  for (const entry of frontierStates) {
    queue.push({
      state: entry.state,
      signature: entry.signature,
      depth: 0,
      parent: -1,
      action: null,
    });
    visited.add(entry.signature);
  }

  const reconstruct = (index: number): ProofAction[] => {
    const actions: ProofAction[] = [];
    let cursorIndex = index;
    while (cursorIndex >= 0) {
      const node = queue[cursorIndex];
      if (node.action) {
        actions.push(node.action);
      }
      cursorIndex = node.parent;
    }
    actions.reverse();
    return actions;
  };

  while (cursor < queue.length) {
    const now = Date.now();
    if (now >= deadlineMs) {
      timedOut = true;
      break;
    }
    if (exploredStates >= bounds.maxStatesPerUnlock) {
      stateLimitHit = true;
      break;
    }
    const current = queue[cursor];
    cursor += 1;
    exploredStates += 1;
    if (current.depth > maxDepthReached) {
      maxDepthReached = current.depth;
    }
    if (evaluateUnlockPredicate(unlock.predicate, current.state)) {
      return {
        witness: reconstruct(cursor - 1),
        exploredStates,
        maxDepthReached,
        timedOut: false,
        stateLimitHit: false,
        depthLimitHit,
      };
    }
    if (current.depth >= bounds.maxDepth) {
      depthLimitHit = true;
      continue;
    }
    const actions = actionUniverseForState(current.state);
    for (const action of actions) {
      const nextState = reducer(current.state, toAction(action));
      const nextSignature = stableSignature(nextState);
      if (visited.has(nextSignature)) {
        continue;
      }
      visited.add(nextSignature);
      queue.push({
        state: nextState,
        signature: nextSignature,
        depth: current.depth + 1,
        parent: cursor - 1,
        action,
      });
    }
  }

  return {
    witness: null,
    exploredStates,
    maxDepthReached,
    timedOut,
    stateLimitHit,
    depthLimitHit,
  };
};

const applySolvedUnlocksToState = (state: GameState, solvedUnlocks: UnlockDefinition[]): GameState => {
  let nextState = state;
  for (const unlock of solvedUnlocks) {
    nextState = applyEffect(unlock.effect, nextState);
    if (!nextState.completedUnlockIds.includes(unlock.id)) {
      nextState = {
        ...nextState,
        completedUnlockIds: [...nextState.completedUnlockIds, unlock.id],
      };
    }
  }
  return nextState;
};

const collectFrontierUnlockedKeys = (frontier: FrontierState[]): Set<Key> => {
  const keys = new Set<Key>();
  for (const entry of frontier) {
    for (const key of deriveUnlockedKeysFromState(entry.state)) {
      keys.add(key);
    }
  }
  return keys;
};

const collectFrontierUsableKeys = (frontier: FrontierState[]): Set<Key> => {
  const keys = new Set<Key>();
  const allKeys = keyCatalog.map((entry) => entry.key);
  for (const entry of frontier) {
    for (const key of allKeys) {
      if (isKeyUsableForInput(entry.state, key)) {
        keys.add(key);
      }
    }
  }
  return keys;
};

const buildLayerFingerprint = (
  layerIndex: number,
  frontierInputSignatures: string[],
  unsolvedUnlockIds: string[],
  catalogById: Map<string, UnlockDefinition>,
  bounds: ProofBounds,
): string =>
  stableJson({
    engineVersion: ENGINE_VERSION,
    layerIndex,
    frontierInputSignatures,
    unsolvedUnlocks: unsolvedUnlockIds.map((unlockId) => catalogById.get(unlockId)).filter(Boolean),
    bounds,
  });

const sortProofRecords = (records: UnlockProofRecord[]): UnlockProofRecord[] =>
  [...records].sort((a, b) => a.unlockId.localeCompare(b.unlockId));

export const buildUnlockProofReport = (
  catalog: UnlockDefinition[],
  options: BuildUnlockProofReportOptions = {},
): BuildUnlockProofReportResult => {
  const startTime = Date.now();
  const generatedAt = options.now ?? new Date();
  const bounds = normalizeBounds(options.bounds);
  const cacheMode = options.cacheMode ?? "local";
  const deadline = startTime + bounds.maxSeconds * 1000;
  const initialStates = options.initialStates ?? [];
  const initialFrontier = dedupeFrontierStates(initialStates);
  const catalogById = new Map(catalog.map((unlock) => [unlock.id, unlock]));
  const functionRules = buildFunctionRules(catalog);
  const unlockableKeys = new Set<Key>(catalog.map((unlock) => unlockedKeyFromEffect(unlock)).filter((key): key is Key => Boolean(key)));
  const catalogFingerprint = stableJson(catalog);
  const cacheCandidate = options.cacheSnapshot;
  const cacheCompatible = Boolean(
    cacheMode === "local"
    && cacheCandidate
    && cacheCandidate.engineVersion === ENGINE_VERSION
    && cacheCandidate.catalogFingerprint === catalogFingerprint,
  );

  const cachedLayers = cacheCompatible ? cacheCandidate?.layers ?? [] : [];
  const nextCacheLayers: LayerCacheEntry[] = [];
  const layers: ProofLayer[] = [];
  const unlockProofs = new Map<string, UnlockProofRecord>();
  let frontier = initialFrontier;
  let unsolved = new Set(catalog.map((unlock) => unlock.id));
  let layerIndex = 0;
  let cacheHitLayers = 0;

  while (unsolved.size > 0 && Date.now() < deadline) {
    const frontierInputSignatures = frontier.map((entry) => entry.signature).sort();
    const unsolvedIds = [...unsolved].sort();
    const fingerprint = buildLayerFingerprint(layerIndex, frontierInputSignatures, unsolvedIds, catalogById, bounds);
    const cached = cachedLayers.find((entry) => entry.index === layerIndex && entry.fingerprint === fingerprint);
    if (cached) {
      layers.push({
        ...cached.layer,
        cacheHit: true,
      });
      nextCacheLayers.push(cached);
      for (const record of cached.layer.unlockProofs) {
        unlockProofs.set(record.unlockId, record);
        unsolved.delete(record.unlockId);
      }
      frontier = dedupeFrontierStates(cached.frontierOutputStates);
      cacheHitLayers += 1;
      layerIndex += 1;
      continue;
    }

    const solvedUnlocks: UnlockDefinition[] = [];
    const layerRecords: UnlockProofRecord[] = [];
    const frontierUnlockedKeys = collectFrontierUnlockedKeys(frontier);
    const frontierUsableKeys = collectFrontierUsableKeys(frontier);
    const impossibleCycleKeys = buildCycleImpossibleSet(catalog, functionRules, frontierUnlockedKeys);
    for (const unlockId of unsolvedIds) {
      const unlock = catalogById.get(unlockId);
      if (!unlock) {
        continue;
      }
      const impossible = findImpossibleCertificate(
        unlock,
        functionRules,
        impossibleCycleKeys,
        frontierUnlockedKeys,
        frontierUsableKeys,
        unlockableKeys,
      );
      if (impossible) {
        const record: UnlockProofRecord = {
          unlockId: unlock.id,
          status: "impossible",
          layerIndex,
          witness: null,
          impossible,
          search: {
            exploredStates: 0,
            maxDepthReached: 0,
            timedOut: false,
            stateLimitHit: false,
            depthLimitHit: false,
          },
        };
        layerRecords.push(record);
        unlockProofs.set(unlock.id, record);
        solvedUnlocks.push(unlock);
        unsolved.delete(unlock.id);
        continue;
      }
      const search = proveUnlock(unlock, frontier, bounds, deadline);
      const proved = Boolean(search.witness);
      const record: UnlockProofRecord = {
        unlockId: unlock.id,
        status: proved ? "proved" : "unknown",
        layerIndex: proved ? layerIndex : null,
        witness: search.witness,
        impossible: null,
        search: {
          exploredStates: search.exploredStates,
          maxDepthReached: search.maxDepthReached,
          timedOut: search.timedOut,
          stateLimitHit: search.stateLimitHit,
          depthLimitHit: search.depthLimitHit,
        },
      };
      layerRecords.push(record);
      if (proved) {
        solvedUnlocks.push(unlock);
        unlockProofs.set(unlock.id, record);
        unsolved.delete(unlock.id);
      }
      if (search.timedOut) {
        break;
      }
    }

    const solvedIds = solvedUnlocks.map((unlock) => unlock.id).sort();
    const nextFrontierStates = solvedUnlocks.length > 0
      ? dedupeFrontierStates(frontier.map((entry) => applySolvedUnlocksToState(entry.state, solvedUnlocks))).map((entry) => entry.state)
      : frontier.map((entry) => entry.state);
    const layer: ProofLayer = {
      index: layerIndex,
      frontierInputSignatures,
      solvedUnlockIds: solvedIds,
      unlockProofs: sortProofRecords(layerRecords),
      frontierOutputSignatures: dedupeFrontierStates(nextFrontierStates).map((entry) => entry.signature).sort(),
      cacheHit: false,
    };
    layers.push(layer);
    nextCacheLayers.push({
      index: layerIndex,
      fingerprint,
      layer,
      frontierOutputStates: nextFrontierStates,
    });
    frontier = dedupeFrontierStates(nextFrontierStates);
    layerIndex += 1;
    if (solvedUnlocks.length === 0) {
      break;
    }
  }

  for (const unlock of catalog) {
    if (unlockProofs.has(unlock.id)) {
      continue;
    }
    unlockProofs.set(unlock.id, {
      unlockId: unlock.id,
      status: "unknown",
      layerIndex: null,
      witness: null,
      impossible: null,
      search: {
        exploredStates: 0,
        maxDepthReached: 0,
        timedOut: Date.now() >= deadline,
        stateLimitHit: false,
        depthLimitHit: false,
      },
    });
  }

  const report: UnlockProofReport = {
    engineVersion: ENGINE_VERSION,
    generatedAtIso: generatedAt.toISOString(),
    bounds,
    cache: {
      mode: cacheMode === "local" ? "local" : "off",
      cacheUsed: cacheHitLayers > 0,
      cacheHitLayers,
    },
    runtimeMs: Date.now() - startTime,
    layers,
    unlockProofs: sortProofRecords([...unlockProofs.values()]),
  };

  return {
    report,
    cacheSnapshot: {
      engineVersion: ENGINE_VERSION,
      catalogFingerprint,
      bounds,
      layers: nextCacheLayers,
    },
  };
};

export const formatUnlockProofReport = (report: UnlockProofReport): string => {
  const proved = report.unlockProofs.filter((entry) => entry.status === "proved");
  const impossible = report.unlockProofs.filter((entry) => entry.status === "impossible");
  const unknown = report.unlockProofs.filter((entry) => entry.status === "unknown");
  const lines: string[] = [
    "Unlock Proof Report",
    `Generated: ${report.generatedAtIso}`,
    `Engine: ${report.engineVersion}`,
    `Runtime: ${report.runtimeMs.toString()}ms`,
    `Bounds: maxSeconds=${report.bounds.maxSeconds}, maxDepth=${report.bounds.maxDepth}, maxStatesPerUnlock=${report.bounds.maxStatesPerUnlock}`,
    `Cache: mode=${report.cache.mode}, used=${report.cache.cacheUsed ? "true" : "false"}, hitLayers=${report.cache.cacheHitLayers}`,
    "",
    "Summary",
    `- proved=${proved.length}`,
    `- impossible=${impossible.length}`,
    `- unknown=${unknown.length}`,
    "",
    "Unlocks",
  ];
  for (const record of report.unlockProofs) {
    if (record.status === "proved") {
      const witness = (record.witness ?? [])
        .map((action) => (action.type === "PRESS_KEY" ? `PRESS_KEY(${action.key})` : action.type))
        .join(" -> ");
      lines.push(
        `- ${record.unlockId} [proved] layer=${record.layerIndex?.toString() ?? "n/a"} witness=${witness || "(empty)"}`,
      );
      continue;
    }
    if (record.status === "impossible") {
      lines.push(
        `- ${record.unlockId} [impossible] rule=${record.impossible?.ruleId ?? "unknown"} reason=${record.impossible?.message ?? "(none)"}`,
      );
      continue;
    }
    lines.push(
      `- ${record.unlockId} [unknown] explored=${record.search.exploredStates.toString()} depth=${record.search.maxDepthReached.toString()} timeout=${record.search.timedOut ? "true" : "false"} stateLimit=${record.search.stateLimitHit ? "true" : "false"} depthLimit=${record.search.depthLimitHit ? "true" : "false"}`,
    );
  }
  return `${lines.join("\n")}\n`;
};
