import { normalizeLoadedStateForRuntime as normalizeDomainLoadedStateForRuntime } from "../../domain/autoEqualsPolicy.js";
import type { GameState } from "../../domain/types.js";

export const normalizeLoadedStateForRuntime = (loaded: GameState | null): GameState | null =>
  normalizeDomainLoadedStateForRuntime(loaded);
