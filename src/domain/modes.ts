import type { GameState } from "./types.js";
import { getStepRows } from "./rollEntries.js";

export type CalculatorMode = "idle" | "drafting" | "rolled";

export const getCalculatorMode = (state: GameState): CalculatorMode => {
  if (getStepRows(state.calculator.rollEntries).length > 0) {
    return "rolled";
  }
  if (state.calculator.draftingSlot) {
    return "drafting";
  }
  return "idle";
};
