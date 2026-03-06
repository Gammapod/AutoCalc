import type { GameState } from "../../src/domain/types.js";

export type CalculatorMode = "idle" | "drafting" | "rolled";

export const getCalculatorMode = (state: GameState): CalculatorMode => {
  if (state.calculator.rollEntries.length > 0) {
    return "rolled";
  }
  if (state.calculator.draftingSlot) {
    return "drafting";
  }
  return "idle";
};
