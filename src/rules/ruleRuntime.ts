import { applyUnlocks } from "../domain/unlocks.js";
import type { GameState, UnlockDefinition } from "../domain/types.js";
import { unlockCatalog } from "./unlockCatalog.js";

export const evaluateUnlocks = (
  state: GameState,
  catalog: UnlockDefinition[] = unlockCatalog,
): GameState => applyUnlocks(state, catalog);
