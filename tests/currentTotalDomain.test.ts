import assert from "node:assert/strict";
import { getCurrentTotalDomainSymbol } from "../src/domain/currentTotalDomain.js";
import { toNanCalculatorValue, toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { initialState } from "../src/domain/state.js";

export const runCurrentTotalDomainTests = (): void => {
  const cleared = initialState();
  assert.equal(getCurrentTotalDomainSymbol(cleared), "\u2205", "cleared total display state maps to null set");

  const natural = {
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      total: toRationalCalculatorValue({ num: 8n, den: 1n }),
      roll: [toRationalCalculatorValue({ num: 8n, den: 1n })],
    },
  };
  assert.equal(getCurrentTotalDomainSymbol(natural), "\u2115", "non-negative integers map to naturals");

  const integer = {
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      total: toRationalCalculatorValue({ num: -3n, den: 1n }),
      roll: [toRationalCalculatorValue({ num: -3n, den: 1n })],
    },
  };
  assert.equal(getCurrentTotalDomainSymbol(integer), "\u2124", "negative integers map to integers");

  const rational = {
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      total: toRationalCalculatorValue({ num: 7n, den: 3n }),
      roll: [toRationalCalculatorValue({ num: 7n, den: 3n })],
    },
  };
  assert.equal(getCurrentTotalDomainSymbol(rational), "\u211A", "fractions map to rationals");

  const nan = {
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      total: toNanCalculatorValue(),
      roll: [toNanCalculatorValue()],
    },
  };
  assert.equal(getCurrentTotalDomainSymbol(nan), "\u2205", "NaN total maps to null set");
};
