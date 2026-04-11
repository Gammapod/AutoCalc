import type { Key, SufficiencyRequirement, UnlockEffect } from "./types.js";

export type GraphNodeType = "key" | "unlock_target" | "sufficiency_token";
export type GraphEdgeType = "unlocks";

export type GraphNode = {
  id: string;
  type: GraphNodeType;
  label: string;
};

export type GraphEdge = {
  from: string;
  to: string;
  type: GraphEdgeType;
  unlockId?: string;
};

export type UnlockGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type UnlockGraphDiagnosticReason =
  | "missing_sufficient_key_sets"
  | "empty_sufficient_key_set"
  | "execution_key_in_sufficient_set"
  | "unknown_key_in_sufficient_set"
  | "invalid_target_node_id";

export type UnlockGraphDiagnostic = {
  unlockId: string;
  reason: UnlockGraphDiagnosticReason;
  detail: string;
};

export type UnlockGraphTargetType = "key" | "non_key";

export type UnlockGraphCanonicalUnlock = {
  unlockId: string;
  targetNodeId: string;
  targetLabel: string;
  targetType: UnlockGraphTargetType;
  effectType: UnlockEffect["type"];
  canonicalSourceRequirements: SufficiencyRequirement[];
  canonicalSourceKeysExpanded: Key[];
  sufficientSetCount: number;
};

export type UnlockGraphAnalysis = {
  startingKeys: Key[];
  knownKeys: Key[];
  canonicalUnlocks: UnlockGraphCanonicalUnlock[];
  diagnostics: UnlockGraphDiagnostic[];
};

export type UnlockGraphReport = {
  generatedAtIso: string;
  graph: UnlockGraph;
  analysis: UnlockGraphAnalysis;
};

export type UnlockProofStatus = "proved" | "impossible" | "unknown";

export type ImpossibleCertificate = {
  ruleId: string;
  message: string;
};

export type ProofAction =
  | { type: "PRESS_KEY"; key: Key }
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
