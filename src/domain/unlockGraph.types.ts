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
};

