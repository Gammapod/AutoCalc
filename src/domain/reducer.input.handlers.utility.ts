import {
  applyBackspace,
  applyC,
  applyUndoWithUnlocks,
} from "./reducer.input.core.js";
import type { GameState } from "./types.js";

export const handleClearAllInput = (state: GameState): GameState => applyC(state);

export const handleBackspaceInput = (state: GameState): GameState => applyBackspace(state);

export const handleUndoInput = (state: GameState): GameState => applyUndoWithUnlocks(state);

