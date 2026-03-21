import type { Key, UnlockDefinition } from "./types.js";
import type { UnlockGraphAnalysis } from "./unlockGraph.types.js";
import { analyzeUnlockGraph as analyzeUnlockGraphStatic } from "./unlockGraph.rules.js";

export const analyzeUnlockGraph = (
  catalog: UnlockDefinition[],
  startingKeys: Key[],
): UnlockGraphAnalysis => analyzeUnlockGraphStatic(catalog, startingKeys);
