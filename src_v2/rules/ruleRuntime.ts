import { applyUnlocks } from "../../src/domain/unlocks.js";
import type { GameState, UnlockDefinition } from "../../src/domain/types.js";
import { unlockCatalog } from "./unlockCatalog.js";

export const evaluateUnlocks = (
  state: GameState,
  catalog: UnlockDefinition[] = unlockCatalog,
): GameState => applyUnlocks(state, catalog);
