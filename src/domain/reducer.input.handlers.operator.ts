import {
  applyOperator,
  applyUnaryOperator,
  isOperator,
  isUnaryOperator,
} from "./reducer.input.core.js";
import type { GameState, Key } from "./types.js";

export const handleOperatorInput = (state: GameState, key: Key): GameState =>
  (isOperator(key) ? applyOperator(state, key) : state);

export const handleUnaryOperatorInput = (state: GameState, key: Key): GameState =>
  (isUnaryOperator(key) ? applyUnaryOperator(state, key) : state);

