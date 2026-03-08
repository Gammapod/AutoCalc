import type { CalculatorValue, ErrorCode, ExpressionValue, RationalValue } from "./types.js";
import {
  expressionToDisplayString,
  expressionToRational,
  isExpressionInteger,
  normalizeExpression,
  rationalExpr,
} from "./expression.js";

export const OVERFLOW_ERROR_CODE: ErrorCode = "x∉[-R,R]";
export const DIVISION_BY_ZERO_ERROR_CODE: ErrorCode = "n/0";
export const NAN_INPUT_ERROR_CODE: ErrorCode = "NaN";

export const toRationalCalculatorValue = (value: RationalValue): CalculatorValue => ({
  kind: "rational",
  value,
});

export const toExpressionCalculatorValue = (value: ExpressionValue): CalculatorValue => ({
  kind: "expr",
  value: normalizeExpression(value),
});

export const toNanCalculatorValue = (): CalculatorValue => ({ kind: "nan" });

export const isRationalCalculatorValue = (
  value: CalculatorValue,
): value is Extract<CalculatorValue, { kind: "rational" }> => value.kind === "rational";

export const isExpressionCalculatorValue = (
  value: CalculatorValue,
): value is Extract<CalculatorValue, { kind: "expr" }> => value.kind === "expr";

export const calculatorValueToDisplayString = (value: CalculatorValue): string =>
  value.kind === "nan"
    ? "NaN"
    : value.kind === "rational"
      ? (value.value.den === 1n ? value.value.num.toString() : `${value.value.num.toString()}/${value.value.den.toString()}`)
      : expressionToDisplayString(value.value);

export const isCalculatorValueInteger = (value: CalculatorValue): boolean =>
  value.kind === "rational" ? value.value.den === 1n : value.kind === "expr" ? isExpressionInteger(value.value) : false;

export const calculatorValueToExpression = (value: CalculatorValue): ExpressionValue | null => {
  if (value.kind === "nan") {
    return null;
  }
  if (value.kind === "rational") {
    return rationalExpr(value.value);
  }
  return value.value;
};

export const calculatorValueToRational = (value: CalculatorValue): RationalValue | null => {
  if (value.kind === "rational") {
    return value.value;
  }
  if (value.kind === "expr") {
    return expressionToRational(value.value);
  }
  return null;
};

export const computeOverflowBoundary = (maxDigits: number): bigint => {
  const safeDigits = Math.max(1, maxDigits);
  return (10n ** BigInt(safeDigits)) - 1n;
};

const absBigInt = (value: bigint): bigint => (value < 0n ? -value : value);

export const exceedsMagnitudeBoundary = (value: RationalValue, boundary: bigint): boolean =>
  absBigInt(value.num) > boundary * absBigInt(value.den);

export const clampRationalToBoundary = (value: RationalValue, boundary: bigint): RationalValue => ({
  num: value.num < 0n ? -boundary : boundary,
  den: 1n,
});

