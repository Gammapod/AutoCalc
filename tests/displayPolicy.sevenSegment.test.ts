import assert from "node:assert/strict";
import { toExpressionCalculatorValue, toNanCalculatorValue, toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { symbolicExpr } from "../src/domain/expression.js";
import { initialState } from "../src/domain/state.js";
import {
  FRACTION_TOKEN,
  IRRATIONAL_TOKEN,
  NAN_ERROR_TOKEN,
  buildTokenGlyphSlots,
  hasImaginaryRollHistory,
  resolveDisplayToken,
  resolveScalarDisplayKind,
} from "../src/ui/shared/displayPolicy.sevenSegment.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });
const c = (reNum: bigint, imNum: bigint) => ({
  kind: "complex" as const,
  value: {
    re: { kind: "rational" as const, value: { num: reNum, den: 1n } },
    im: { kind: "rational" as const, value: { num: imNum, den: 1n } },
  },
});

export const runDisplayPolicySevenSegmentTests = (): void => {
  assert.equal(resolveScalarDisplayKind(r(5n)), "integer", "integer rational values resolve to integer display kind");
  assert.equal(resolveScalarDisplayKind(r(5n, 2n)), "fraction", "fractional rational values resolve to fraction display kind");
  assert.equal(
    resolveScalarDisplayKind(toExpressionCalculatorValue(symbolicExpr("sqrt(2)"))),
    "irrational",
    "non-rational expressions resolve to irrational display kind",
  );
  assert.equal(resolveScalarDisplayKind(toNanCalculatorValue()), "nan", "NaN values resolve to nan display kind");

  assert.equal(resolveDisplayToken("integer"), null, "integer display kind has no token");
  assert.equal(resolveDisplayToken("fraction"), FRACTION_TOKEN, "fraction display kind resolves FrAC token");
  assert.equal(resolveDisplayToken("irrational"), IRRATIONAL_TOKEN, "irrational display kind resolves rAdicAL token");
  assert.equal(resolveDisplayToken("nan"), NAN_ERROR_TOKEN, "nan display kind resolves Error token");

  assert.deepEqual(
    buildTokenGlyphSlots("Error", 1),
    ["E"],
    "token glyph slots preserve left-prefixed token text for one slot",
  );
  assert.deepEqual(
    buildTokenGlyphSlots("rAdicAL", 3),
    ["r", "A", "d"],
    "token glyph slots preserve left-prefixed token text for three slots",
  );

  const realOnlyState = {
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      rollEntries: [{ y: r(1n) }, { y: r(2n, 3n) }],
    },
  };
  assert.equal(hasImaginaryRollHistory(realOnlyState), false, "real-only roll history does not enable imaginary history visibility");

  const withImaginaryState = {
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      rollEntries: [{ y: r(1n) }, { y: c(2n, 1n) }, { y: c(3n, 0n) }],
    },
  };
  assert.equal(
    hasImaginaryRollHistory(withImaginaryState),
    true,
    "any roll with non-zero imaginary component enables imaginary history visibility",
  );
};

