import { isRationalCalculatorValue } from "./calculatorValue.js";
import { getRollYDomain, type RollValueDomain } from "./rollDerived.js";
import type { GameState } from "./types.js";

export type NumberDomainSymbol = RollValueDomain;

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

export const getCurrentTotalDomainSymbol = (state: GameState): NumberDomainSymbol => {
  if (isClearedTotalDisplayState(state)) {
    return "\u2205";
  }
  return getRollYDomain(state.calculator.total);
};
