import type { CalculatorValue, ErrorCode, ExpressionValue, RationalValue, ScalarValue } from "./types.js";
import {
  expressionToDisplayString,
  expressionToRational,
  isExpressionInteger,
  normalizeExpression,
  rationalExpr,
} from "./expression.js";

type NonNanCalculatorValue = Exclude<CalculatorValue, { kind: "nan" }>;

export const OVERFLOW_ERROR_CODE: ErrorCode = "x∉[-R,R]";
export const DIVISION_BY_ZERO_ERROR_CODE: ErrorCode = "n/0";
export const NAN_INPUT_ERROR_CODE: ErrorCode = "NaN";

export const toRationalCalculatorValue = (value: RationalValue): NonNanCalculatorValue => ({
  kind: "rational",
  value,
});

export const toExpressionCalculatorValue = (value: ExpressionValue): NonNanCalculatorValue => ({
  kind: "expr",
  value: normalizeExpression(value),
});

export const toRationalScalarValue = (value: RationalValue): ScalarValue => ({
  kind: "rational",
  value,
});

export const toExpressionScalarValue = (value: ExpressionValue): ScalarValue => ({
  kind: "expr",
  value: normalizeExpression(value),
});

export const toScalarValue = (value: Extract<CalculatorValue, { kind: "rational" | "expr" }>): ScalarValue => {
  if (value.kind === "rational") {
    return toRationalScalarValue(value.value);
  }
  return toExpressionScalarValue(value.value);
};

export const scalarValueToCalculatorValue = (value: ScalarValue): NonNanCalculatorValue =>
  value.kind === "rational" ? toRationalCalculatorValue(value.value) : toExpressionCalculatorValue(value.value);

export const isScalarValueZero = (value: ScalarValue): boolean =>
  value.kind === "rational" && value.value.num === 0n;

export const toComplexCalculatorValue = (re: ScalarValue, im: ScalarValue): NonNanCalculatorValue => {
  if (isScalarValueZero(im)) {
    return scalarValueToCalculatorValue(re);
  }
  return {
    kind: "complex",
    value: {
      re: re.kind === "rational" ? toRationalScalarValue(re.value) : toExpressionScalarValue(re.value),
      im: im.kind === "rational" ? toRationalScalarValue(im.value) : toExpressionScalarValue(im.value),
    },
  };
};

export const toNanCalculatorValue = (): CalculatorValue => ({ kind: "nan" });

export const isRationalCalculatorValue = (
  value: CalculatorValue,
): value is Extract<CalculatorValue, { kind: "rational" }> => value.kind === "rational";

export const isExpressionCalculatorValue = (
  value: CalculatorValue,
): value is Extract<CalculatorValue, { kind: "expr" }> => value.kind === "expr";

export const isComplexCalculatorValue = (
  value: CalculatorValue,
): value is Extract<CalculatorValue, { kind: "complex" }> => value.kind === "complex";

const scalarToDisplayString = (value: ScalarValue): string =>
  value.kind === "rational"
    ? (value.value.den === 1n ? value.value.num.toString() : `${value.value.num.toString()}/${value.value.den.toString()}`)
    : expressionToDisplayString(value.value);

export const calculatorValueToDisplayString = (value: CalculatorValue): string =>
  value.kind === "nan"
    ? "NaN"
    : value.kind === "rational"
      ? (value.value.den === 1n ? value.value.num.toString() : `${value.value.num.toString()}/${value.value.den.toString()}`)
      : value.kind === "expr"
        ? expressionToDisplayString(value.value)
        : `${scalarToDisplayString(value.value.re)} + ${scalarToDisplayString(value.value.im)}i`;

export const isCalculatorValueInteger = (value: CalculatorValue): boolean =>
  value.kind === "rational" ? value.value.den === 1n : value.kind === "expr" ? isExpressionInteger(value.value) : false;

export const calculatorValueToExpression = (value: CalculatorValue): ExpressionValue | null => {
  if (value.kind === "nan") {
    return null;
  }
  if (value.kind === "complex") {
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

export const computeOverflowBoundary = (maxDigits: number, radix: number = 10): bigint => {
  const safeDigits = Math.max(1, maxDigits);
  const safeRadix = Math.max(2, Math.trunc(radix));
  return (BigInt(safeRadix) ** BigInt(safeDigits)) - 1n;
};

const absBigInt = (value: bigint): bigint => (value < 0n ? -value : value);

export const exceedsMagnitudeBoundary = (value: RationalValue, boundary: bigint): boolean =>
  absBigInt(value.num) > boundary * absBigInt(value.den);

export const clampRationalToBoundary = (value: RationalValue, boundary: bigint): RationalValue => ({
  num: value.num < 0n ? -boundary : boundary,
  den: 1n,
});

