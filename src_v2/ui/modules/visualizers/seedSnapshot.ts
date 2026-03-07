import { isRationalCalculatorValue } from "../../../../src/domain/calculatorValue.js";
import type { GameState } from "../../../../src/domain/types.js";

export const resolveGraphSeedSnapshot = (state: GameState): GameState["calculator"]["seedSnapshot"] => {
  if (state.calculator.seedSnapshot !== undefined) {
    return state.calculator.seedSnapshot;
  }
  if (state.calculator.rollEntries.length === 0) {
    return state.calculator.total;
  }
  return undefined;
};

const isClearedCalculatorState = (state: GameState): boolean =>
  isRationalCalculatorValue(state.calculator.total) &&
  state.calculator.total.value.num === 0n &&
  state.calculator.total.value.den === 1n &&
  !state.calculator.pendingNegativeTotal &&
  state.calculator.rollEntries.length === 0 &&
  state.calculator.operationSlots.length === 0 &&
  state.calculator.draftingSlot === null;

export const resolveFeedSeedSnapshot = (state: GameState): GameState["calculator"]["seedSnapshot"] => {
  if (state.calculator.seedSnapshot !== undefined) {
    return state.calculator.seedSnapshot;
  }
  const hasAnyKeyPress = Object.values(state.keyPressCounts).some((count) => (count ?? 0) > 0);
  const shouldRenderClearedPlaceholder =
    isClearedCalculatorState(state) && (state.calculator.singleDigitInitialTotalEntry || !hasAnyKeyPress);
  if (state.calculator.rollEntries.length === 0 && !shouldRenderClearedPlaceholder) {
    return state.calculator.total;
  }
  return undefined;
};
