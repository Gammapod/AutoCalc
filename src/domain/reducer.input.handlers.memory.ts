import { applyMemoryKeyAction } from "./reducer.input.core.js";
import type { GameState, Key } from "./types.js";

export const handleMemoryInput = (state: GameState, key: Key): GameState =>
  applyMemoryKeyAction(state, key);

