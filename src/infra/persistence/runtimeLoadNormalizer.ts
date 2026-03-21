import { normalizeLoadedStateForRuntime as normalizeDomainLoadedStateForRuntime } from "../../domain/autoEqualsPolicy.js";
import { normalizeRuntimeStateInvariants } from "../../domain/runtimeStateInvariants.js";
import type { GameState } from "../../domain/types.js";

export const normalizeLoadedStateForRuntime = (loaded: GameState | null): GameState | null =>
  loaded
    ? (() => {
      const normalized = normalizeDomainLoadedStateForRuntime(loaded);
      return normalized ? normalizeRuntimeStateInvariants(normalized) : null;
    })()
    : loaded;
