import { isRationalCalculatorValue } from "./calculatorValue.js";
import type { GameState } from "./types.js";

export type NumberDomainSymbol = "\u2205" | "\u2119" | "\u2115" | "\u2124" | "\u211A" | "\u{1D538}" | "\u211D" | "\u2102";

const isClearedTotalDisplayState = (state: GameState): boolean => {
  const calculator = state.calculator;
  return (
    isRationalCalculatorValue(calculator.total) &&
    calculator.total.value.num === 0n &&
    calculator.total.value.den === 1n &&
    !calculator.pendingNegativeTotal &&
    calculator.rollEntries.length === 0 &&
    calculator.operationSlots.length === 0 &&
    calculator.draftingSlot === null
  );
};

const isPrimeInteger = (value: bigint): boolean => {
  if (value < 2n) {
    return false;
  }
  if (value === 2n) {
    return true;
  }
  if (value % 2n === 0n) {
    return false;
  }
  let candidate = 3n;
  while (candidate * candidate <= value) {
    if (value % candidate === 0n) {
      return false;
    }
    candidate += 2n;
  }
  return true;
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
    if (isPrimeInteger(num)) {
      return "\u2119";
    }
    return num >= 0n ? "\u2115" : "\u2124";
  }
  return "\u211A";
};
