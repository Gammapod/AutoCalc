import {
  applyConstantValue,
  applyDigit,
  isDigit,
  isValueAtomConstant,
} from "./reducer.input.core.js";
import type { GameState, Key } from "./types.js";

export const handleValueInput = (state: GameState, key: Key): GameState => {
  if (isDigit(key)) {
    return applyDigit(state, key);
  }
  if (isValueAtomConstant(key)) {
    return applyConstantValue(state, key);
  }
  return state;
};

