import type { CalculatorValue, RationalValue, RollEntry } from "./types.js";
import { expressionToAlgebriteString } from "./expression.js";

export type RollValueDomain = "\u2205" | "\u2115" | "\u2124" | "\u211A";

export type PrimeFactorTerm = {
  prime: bigint;
  exponent: number;
};

export type RationalPrimeFactorization = {
  sign: -1 | 1;
  numerator: PrimeFactorTerm[];
  denominator: PrimeFactorTerm[];
};

export type RollEntryDerived = {
  x: number;
  y: RollEntry["y"];
  yAlgebrite: string;
  domain: RollValueDomain;
  remainder?: RationalValue;
  error?: RollEntry["error"];
  primeFactorization?: RationalPrimeFactorization;
};

const absBigInt = (value: bigint): bigint => (value < 0n ? -value : value);

const toAlgebriteRationalString = (value: RationalValue): string =>
  value.den === 1n ? value.num.toString() : `${value.num.toString()}/${value.den.toString()}`;

const factorPositiveInteger = (value: bigint): PrimeFactorTerm[] => {
  if (value < 2n) {
    return [];
  }

  const factors: PrimeFactorTerm[] = [];
  let remaining = value;

  let exponent = 0;
  while (remaining % 2n === 0n) {
    remaining /= 2n;
    exponent += 1;
  }
  if (exponent > 0) {
    factors.push({ prime: 2n, exponent });
  }

  let candidate = 3n;
  while (candidate * candidate <= remaining) {
    exponent = 0;
    while (remaining % candidate === 0n) {
      remaining /= candidate;
      exponent += 1;
    }
    if (exponent > 0) {
      factors.push({ prime: candidate, exponent });
    }
    candidate += 2n;
  }

  if (remaining > 1n) {
    factors.push({ prime: remaining, exponent: 1 });
  }

  return factors;
};

export const getRollYAlgebriteString = (value: CalculatorValue): string =>
  value.kind === "nan" ? "NaN" : value.kind === "rational" ? toAlgebriteRationalString(value.value) : expressionToAlgebriteString(value.value);

export const getRollYDomain = (value: CalculatorValue): RollValueDomain => {
  if (value.kind === "nan" || value.kind === "expr") {
    return "\u2205";
  }
  return value.value.den === 1n ? (value.value.num >= 0n ? "\u2115" : "\u2124") : "\u211A";
};

export const getRationalPrimeFactorization = (value: RationalValue): RationalPrimeFactorization | undefined => {
  if (value.num === 0n) {
    return undefined;
  }

  const normalizedDenominator = value.den < 0n ? -value.den : value.den;
  return {
    sign: value.num < 0n ? -1 : 1,
    numerator: factorPositiveInteger(absBigInt(value.num)),
    denominator: factorPositiveInteger(normalizedDenominator),
  };
};

export const getRollYPrimeFactorization = (value: CalculatorValue): RationalPrimeFactorization | undefined =>
  value.kind === "rational" ? getRationalPrimeFactorization(value.value) : undefined;

export const getDerivedRollEntry = (entry: RollEntry, x: number): RollEntryDerived => {
  const primeFactorization = getRollYPrimeFactorization(entry.y);
  return {
    x,
    y: entry.y,
    yAlgebrite: getRollYAlgebriteString(entry.y),
    domain: getRollYDomain(entry.y),
    ...(entry.remainder ? { remainder: entry.remainder } : {}),
    ...(entry.error ? { error: entry.error } : {}),
    ...(primeFactorization ? { primeFactorization } : {}),
  };
};

export const getDerivedRollEntries = (rollEntries: RollEntry[]): RollEntryDerived[] =>
  rollEntries.map((entry, x) => getDerivedRollEntry(entry, x));
