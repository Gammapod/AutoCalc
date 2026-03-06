import { isRationalCalculatorValue } from "./calculatorValue.js";
import type { GameState } from "./types.js";

export type NumberDomainSymbol = "\u2205" | "\u2115" | "\u2124" | "\u211A" | "\u{1D538}" | "\u211D" | "\u2102";

const isClearedTotalDisplayState = (state: GameState): boolean => {
  const calculator = state.calculator;
  return (
    isRationalCalculatorValue(calculator.total) &&
    calculator.total.value.num === 0n &&
    calculator.total.value.den === 1n &&
    !calculator.pendingNegativeTotal &&
    calculator.roll.length === 0 &&
    calculator.rollErrors.length === 0 &&
    calculator.euclidRemainders.length === 0 &&
    calculator.operationSlots.length === 0 &&
    calculator.draftingSlot === null
  );
};

export const getCurrentTotalDomainSymbol = (state: GameState): NumberDomainSymbol => {
  if (isClearedTotalDisplayState(state)) {
    return "\u2205";
  }

  if (!isRationalCalculatorValue(state.calculator.total)) {
    return "\u2205";
  }

  const { num, den } = state.calculator.total.value;
  if (den === 1n) {
    return num >= 0n ? "\u2115" : "\u2124";
  }
  return "\u211A";
};
