import assert from "node:assert/strict";
import { toNanCalculatorValue, toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import {
  getDerivedRollEntries,
  getDerivedRollEntry,
  getRationalPrimeFactorization,
  getRollYAlgebriteString,
  getRollYDomain,
} from "../src/domain/rollDerived.js";
import type { RollEntry } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });

export const runRollDerivedTests = (): void => {
  assert.equal(getRollYAlgebriteString(r(12n)), "12", "integer y converts to algebrite integer string");
  assert.equal(getRollYAlgebriteString(r(7n, 3n)), "7/3", "fractional y converts to algebrite fraction string");
  assert.equal(getRollYAlgebriteString(toNanCalculatorValue()), "NaN", "nan y converts to NaN token");

  assert.equal(getRollYDomain(r(0n)), "\u2115", "zero is classified as natural for roll domain projection");
  assert.equal(getRollYDomain(r(-2n)), "\u2124", "negative integers map to integers");
  assert.equal(getRollYDomain(r(7n, 3n)), "\u211A", "fractions map to rationals");
  assert.equal(getRollYDomain(toNanCalculatorValue()), "\u2205", "nan maps to null set domain marker");

  assert.deepEqual(
    getRationalPrimeFactorization({ num: -12n, den: 35n }),
    {
      sign: -1,
      numerator: [
        { prime: 2n, exponent: 2 },
        { prime: 3n, exponent: 1 },
      ],
      denominator: [
        { prime: 5n, exponent: 1 },
        { prime: 7n, exponent: 1 },
      ],
    },
    "rational prime factorization splits numerator and denominator factors",
  );
  assert.equal(getRationalPrimeFactorization({ num: 0n, den: 1n }), undefined, "zero has no prime factorization");

  const entry: RollEntry = {
    y: r(9n),
    remainder: { num: 1n, den: 2n },
    error: { code: "n/0", kind: "division_by_zero" },
  };
  assert.deepEqual(
    getDerivedRollEntry(entry, 4),
    {
      x: 4,
      y: r(9n),
      yAlgebrite: "9",
      domain: "\u2115",
      remainder: { num: 1n, den: 2n },
      error: { code: "n/0", kind: "division_by_zero" },
      primeFactorization: {
        sign: 1,
        numerator: [{ prime: 3n, exponent: 2 }],
        denominator: [],
      },
    },
    "derived roll entry projects x/y/domain/factors/remainder/error",
  );

  const derived = getDerivedRollEntries([{ y: r(2n) }, { y: r(3n, 2n) }]);
  assert.equal(derived[0].x, 0, "first derived entry uses x index 0");
  assert.equal(derived[1].x, 1, "second derived entry uses x index 1");
};
