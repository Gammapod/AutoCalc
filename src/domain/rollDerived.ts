import type { CalculatorValue, PrimeFactorTerm, RationalPrimeFactorization, RationalValue, RollEntry, ScalarValue } from "./types.js";
import { expressionToAlgebriteString, expressionToRational } from "./expression.js";
import { algebraicToDisplayString, algebraicToRational } from "./algebraicScalar.js";

export type RollValueDomain =
  | "\u2205"
  | "\u2119"
  | "\u2115"
  | "\u2124"
  | "\u211A"
  | "\u2124(\u{1D540})"
  | "\u{1D538}"
  | "\u{1D540}(\u2115)"
  | "\u{1D540}(\u2124)"
  | "\u{1D540}(\u2119)"
  | "\u{1D540}(\u211A)"
  | "\u{1D540}(\u{1D538})"
  | "\u2102";

export type RollEntryDerived = {
  x: number;
  y: RollEntry["y"];
  yAlgebrite: string;
  domain: RollValueDomain;
  error?: RollEntry["error"];
  primeFactorization?: RationalPrimeFactorization;
};

const absBigInt = (value: bigint): bigint => (value < 0n ? -value : value);

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
  value.kind === "nan"
    ? "NaN"
    : value.kind === "rational"
      ? toAlgebriteRationalString(value.value)
      : value.kind === "expr"
        ? expressionToAlgebriteString(value.value)
        : `(${value.value.re.kind === "rational"
          ? toAlgebriteRationalString(value.value.re.value)
          : value.value.re.kind === "alg"
            ? algebraicToDisplayString(value.value.re.value)
            : expressionToAlgebriteString(value.value.re.value)})+(${value.value.im.kind === "rational"
          ? toAlgebriteRationalString(value.value.im.value)
          : value.value.im.kind === "alg"
            ? algebraicToDisplayString(value.value.im.value)
            : expressionToAlgebriteString(value.value.im.value)})*i`;

export const getRollYDomain = (value: CalculatorValue): RollValueDomain => {
  const getScalarDomain = (scalar: ScalarValue): RollValueDomain => {
    if (scalar.kind === "alg") {
      const rational = algebraicToRational(scalar.value);
      if (!rational) {
        return "\u{1D538}";
      }
      if (rational.den === 1n) {
        if (isPrimeInteger(rational.num)) {
          return "\u2119";
        }
        return rational.num >= 0n ? "\u2115" : "\u2124";
      }
      return "\u211A";
    }
    if (scalar.kind === "expr") {
      return "\u{1D538}";
    }
    if (scalar.value.den === 1n) {
      if (isPrimeInteger(scalar.value.num)) {
        return "\u2119";
      }
      return scalar.value.num >= 0n ? "\u2115" : "\u2124";
    }
    return "\u211A";
  };

  if (value.kind === "complex") {
    const real = value.value.re;
    const imaginary = value.value.im;
    if (imaginary.kind === "rational" && imaginary.value.num === 0n) {
      return getScalarDomain(real);
    }
    const realRational = real.kind === "rational"
      ? real.value
      : real.kind === "alg"
        ? algebraicToRational(real.value)
        : expressionToRational(real.value);
    const imaginaryRational = imaginary.kind === "rational"
      ? imaginary.value
      : imaginary.kind === "alg"
        ? algebraicToRational(imaginary.value)
        : expressionToRational(imaginary.value);
    if (
      realRational
      && imaginaryRational
      && realRational.den === 1n
      && imaginaryRational.den === 1n
      && imaginaryRational.num !== 0n
    ) {
      return "\u2124(\u{1D540})";
    }
    const pureImaginary = real.kind === "rational"
      ? real.value.num === 0n
      : real.kind === "alg"
        ? Boolean(algebraicToRational(real.value)?.num === 0n)
        : false;
    if (!pureImaginary) {
      return "\u2102";
    }
    const imagDomain = getScalarDomain(imaginary);
    if (imagDomain === "\u2119") {
      return "\u{1D540}(\u2119)";
    }
    if (imagDomain === "\u2115") {
      return "\u{1D540}(\u2115)";
    }
    if (imagDomain === "\u2124") {
      return "\u{1D540}(\u2124)";
    }
    if (imagDomain === "\u211A") {
      return "\u{1D540}(\u211A)";
    }
    if (imagDomain === "\u{1D538}") {
      return "\u{1D540}(\u{1D538})";
    }
    return "\u2102";
  }
  if (value.kind === "nan") {
    return "\u2205";
  }
  if (value.kind === "expr") {
    return "\u{1D538}";
  }
  return getScalarDomain({ kind: "rational", value: value.value });
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
  value.kind === "rational"
    ? getRationalPrimeFactorization(value.value)
    : value.kind === "complex"
      && value.value.re.kind === "rational"
      && value.value.im.kind === "rational"
      && value.value.im.value.num === 0n
      ? getRationalPrimeFactorization(value.value.re.value)
      : undefined;

export const getDerivedRollEntry = (entry: RollEntry, x: number): RollEntryDerived => {
  const primeFactorization = entry.factorization ?? getRollYPrimeFactorization(entry.y);
  return {
    x,
    y: entry.y,
    yAlgebrite: getRollYAlgebriteString(entry.y),
    domain: getRollYDomain(entry.y),
    ...(entry.error ? { error: entry.error } : {}),
    ...(primeFactorization ? { primeFactorization } : {}),
  };
};

export const getDerivedRollEntries = (rollEntries: RollEntry[]): RollEntryDerived[] =>
  rollEntries.map((entry, x) => getDerivedRollEntry(entry, x));
