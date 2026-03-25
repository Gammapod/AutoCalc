import type { Key } from "./types.js";

export type GraphNodeType = "key" | "function" | "condition" | "sufficient_set" | "effect_target";
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

export type UnlockTargetDescriptor = {
  id: string;
  type: "key" | "effect_target";
  label: string;
  key?: Key;
};

export type ConditionStatus = {
  unlockId: string;
  reachable: boolean;
  unlockedKey: Key | null;
  unlockedTargets: string[];
  requiredFunctions: string[];
  missingFunctions: string[];
};

export type UnlockGraphAnalysis = {
  startingKeys: Key[];
  reachableConditionIds: string[];
  blockedConditionIds: string[];
  unlockedKeysReached: Key[];
  unreachableKeys: Key[];
  reachedEffectTargets: string[];
  unreachableEffectTargets: string[];
  conditionStatuses: ConditionStatus[];
  keyCycles: Key[][];
};

export type UnlockGraphReport = {
  generatedAtIso: string;
  graph: UnlockGraph;
  analysis: UnlockGraphAnalysis;
  proof?: UnlockProofReport;
};

export type UnlockProofStatus = "proved" | "impossible" | "unknown";

export type ImpossibleCertificate = {
  ruleId: string;
  message: string;
};

export type ProofAction =
  | { type: "PRESS_KEY"; key: Key }
  | { type: "ALLOCATOR_RETURN_PRESSED" }
  | { type: "ALLOCATOR_ALLOCATE_PRESSED" }
  | { type: "UPGRADE_KEYPAD_ROW" }
  | { type: "UPGRADE_KEYPAD_COLUMN" };

export type ProofBounds = {
  maxSeconds: number;
  maxDepth: number;
  maxStatesPerUnlock: number;
};

export type UnlockProofRecord = {
  unlockId: string;
  status: UnlockProofStatus;
  layerIndex: number | null;
  witness: ProofAction[] | null;
  impossible: ImpossibleCertificate | null;
  search: {
    exploredStates: number;
    maxDepthReached: number;
    timedOut: boolean;
    stateLimitHit: boolean;
    depthLimitHit: boolean;
  };
};

export type ProofLayer = {
  index: number;
  frontierInputSignatures: string[];
  solvedUnlockIds: string[];
  unlockProofs: UnlockProofRecord[];
  frontierOutputSignatures: string[];
  cacheHit: boolean;
};

export type UnlockProofCacheStats = {
  mode: "off" | "local";
  cacheUsed: boolean;
  cacheHitLayers: number;
};

export type UnlockProofReport = {
  engineVersion: string;
  generatedAtIso: string;
  bounds: ProofBounds;
  cache: UnlockProofCacheStats;
  runtimeMs: number;
  layers: ProofLayer[];
  unlockProofs: UnlockProofRecord[];
};
