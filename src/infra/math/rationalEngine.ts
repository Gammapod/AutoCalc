import type { RationalValue } from "../../domain/types.js";

const gcd = (a: bigint, b: bigint): bigint => {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
};

const normalize = (value: RationalValue): RationalValue => {
  if (value.den === 0n) {
    throw new Error("Invalid rational with zero denominator.");
  }
  if (value.num === 0n) {
    return { num: 0n, den: 1n };
  }

  const sign = value.den < 0n ? -1n : 1n;
  const num = value.num * sign;
  const den = value.den * sign;
  const d = gcd(num, den);
  return { num: num / d, den: den / d };
};

const parseSimpleRational = (text: string): RationalValue => {
  const compact = text.replace(/\s+/g, "");
  if (/^-?\d+$/.test(compact)) {
    return { num: BigInt(compact), den: 1n };
  }

  const fraction = compact.match(/^(-?\d+)\/(-?\d+)$/);
  if (!fraction) {
    throw new Error(`Unsupported rational expression: ${text}`);
  }

  return normalize({ num: BigInt(fraction[1]), den: BigInt(fraction[2]) });
};

export const fromBigInt = (value: bigint): RationalValue => ({ num: value, den: 1n });

export const addInt = (value: RationalValue, operand: bigint): RationalValue =>
  normalize({ num: value.num + operand * value.den, den: value.den });

export const subInt = (value: RationalValue, operand: bigint): RationalValue =>
  normalize({ num: value.num - operand * value.den, den: value.den });

export const mulInt = (value: RationalValue, operand: bigint): RationalValue =>
  normalize({ num: value.num * operand, den: value.den });

export const divInt = (value: RationalValue, operand: bigint): RationalValue => {
  if (operand === 0n) {
    throw new Error("Division by zero.");
  }
  return normalize({ num: value.num, den: value.den * operand });
};

export const equalsBigInt = (value: RationalValue, other: bigint): boolean => value.num === other * value.den;

export const gteBigInt = (value: RationalValue, other: bigint): boolean => value.num >= other * value.den;

export const lteBigInt = (value: RationalValue, other: bigint): boolean => value.num <= other * value.den;

export const toDisplayString = (value: RationalValue): string =>
  value.den === 1n ? value.num.toString() : `${value.num.toString()}/${value.den.toString()}`;

export const isInteger = (value: RationalValue): boolean => value.den === 1n;

export const parseRational = (text: string): RationalValue => normalize(parseSimpleRational(text));
