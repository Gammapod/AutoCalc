import type { RationalValue } from "../../domain/types.js";
import { fromBigInt, isInteger, subInt, toDisplayString } from "./rationalEngine.js";

export type EuclideanDivisionResult =
  | { ok: true; quotient: RationalValue; remainder: RationalValue }
  | { ok: false; reason: "division_by_zero" };

const floorDiv = (num: bigint, den: bigint): bigint => {
  if (den === 0n) {
    throw new Error("Invalid floor division by zero denominator.");
  }

  let numerator = num;
  let denominator = den;
  if (denominator < 0n) {
    numerator = -numerator;
    denominator = -denominator;
  }

  let quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder !== 0n && numerator < 0n) {
    quotient -= 1n;
  }
  return quotient;
};

export const toPreferredFractionString = (value: RationalValue): string => toDisplayString(value);

export const euclideanDivide = (value: RationalValue, operand: bigint): EuclideanDivisionResult => {
  if (operand === 0n) {
    return { ok: false, reason: "division_by_zero" };
  }

  const quotientInt = floorDiv(value.num, value.den * operand);
  const quotient = fromBigInt(quotientInt);
  if (!isInteger(quotient)) {
    throw new Error("Euclidean quotient must be represented as integer.");
  }

  const remainder = subInt(value, operand * quotientInt);
  return { ok: true, quotient, remainder };
};
