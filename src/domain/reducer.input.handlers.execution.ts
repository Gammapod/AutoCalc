import {
  applyEquals,
  applyEqualsFromStepProgress,
  applyStepThrough,
} from "./reducer.input.core.js";
import type { GameState } from "./types.js";

export const handleEqualsInput = (state: GameState): GameState =>
  (state.calculator.stepProgress.active ? applyEqualsFromStepProgress(state) : applyEquals(state));

export const handleStepThroughInput = (state: GameState): GameState =>
  applyStepThrough(state);

