import assert from "node:assert/strict";
import { getCurrentTotalDomainSymbol } from "../src/domain/currentTotalDomain.js";
import { toComplexCalculatorValue, toNanCalculatorValue, toRationalCalculatorValue, toRationalScalarValue } from "../src/domain/calculatorValue.js";
import { initialState } from "../src/domain/state.js";
import type { RollEntry } from "../src/domain/types.js";

const re = (...values: RollEntry["y"][]): RollEntry[] => values.map((y) => ({ y }));

export const runCurrentTotalDomainTests = (): void => {
  const cleared = initialState();
  assert.equal(getCurrentTotalDomainSymbol(cleared), "\u2205", "cleared total display state maps to null set");

  const natural = {
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      total: toRationalCalculatorValue({ num: 8n, den: 1n }),
      rollEntries: re(toRationalCalculatorValue({ num: 8n, den: 1n })),
    },
  };
  assert.equal(getCurrentTotalDomainSymbol(natural), "\u2115", "non-negative integers map to naturals");

  const prime = {
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      total: toRationalCalculatorValue({ num: 97n, den: 1n }),
      rollEntries: re(toRationalCalculatorValue({ num: 97n, den: 1n })),
    },
  };
  assert.equal(getCurrentTotalDomainSymbol(prime), "\u2119", "primes map to prime subdomain");

  const integer = {
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      total: toRationalCalculatorValue({ num: -3n, den: 1n }),
      rollEntries: re(toRationalCalculatorValue({ num: -3n, den: 1n })),
    },
  };
  assert.equal(getCurrentTotalDomainSymbol(integer), "\u2124", "negative integers map to integers");

  const rational = {
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      total: toRationalCalculatorValue({ num: 7n, den: 3n }),
      rollEntries: re(toRationalCalculatorValue({ num: 7n, den: 3n })),
    },
  };
  assert.equal(getCurrentTotalDomainSymbol(rational), "\u211A", "fractions map to rationals");

  const nan = {
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      total: toNanCalculatorValue(),
      rollEntries: re(toNanCalculatorValue()),
    },
  };
  assert.equal(getCurrentTotalDomainSymbol(nan), "\u2205", "NaN total maps to null set");

  const complex = {
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      total: toComplexCalculatorValue(
        toRationalScalarValue({ num: 1n, den: 2n }),
        toRationalScalarValue({ num: 4n, den: 1n }),
      ),
      rollEntries: re(toComplexCalculatorValue(
        toRationalScalarValue({ num: 1n, den: 2n }),
        toRationalScalarValue({ num: 4n, den: 1n }),
      )),
    },
  };
  assert.equal(getCurrentTotalDomainSymbol(complex), "\u2102", "complex totals map to complex domain");

  const pureImaginaryPrime = {
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      total: toComplexCalculatorValue(
        toRationalScalarValue({ num: 0n, den: 1n }),
        toRationalScalarValue({ num: 3n, den: 1n }),
      ),
      rollEntries: re(toComplexCalculatorValue(
        toRationalScalarValue({ num: 0n, den: 1n }),
        toRationalScalarValue({ num: 3n, den: 1n }),
      )),
    },
  };
  assert.equal(getCurrentTotalDomainSymbol(pureImaginaryPrime), "\u2124(\u{1D540})", "pure-imaginary gaussian totals map to Z(I)");
  const gaussian = {
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      total: toComplexCalculatorValue(
        toRationalScalarValue({ num: 1n, den: 1n }),
        toRationalScalarValue({ num: 4n, den: 1n }),
      ),
      rollEntries: re(toComplexCalculatorValue(
        toRationalScalarValue({ num: 1n, den: 1n }),
        toRationalScalarValue({ num: 4n, den: 1n }),
      )),
    },
  };
  assert.equal(getCurrentTotalDomainSymbol(gaussian), "\u2124(\u{1D540})", "gaussian complex totals map to Z(I)");
};

