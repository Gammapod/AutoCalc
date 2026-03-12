import type { CalculatorValue, RationalValue, RollEntry } from "./types.js";

export const isSeedIndex = (index: number): boolean => index === 0;

export const getSeedRow = (rollEntries: RollEntry[]): RollEntry | undefined => rollEntries[0];

export const getStepRows = (rollEntries: RollEntry[]): RollEntry[] =>
  rollEntries.length <= 1 ? [] : rollEntries.slice(1);

export const getXk = (rollEntries: RollEntry[], k: number): CalculatorValue | undefined => {
  if (k < 0 || !Number.isInteger(k)) {
    return undefined;
  }
  return rollEntries[k]?.y;
};

export const createRollEntry = (
  y: CalculatorValue,
  patch: Partial<Omit<RollEntry, "y" | "d1" | "d2" | "r1" | "seedMinus1Y" | "seedPlus1Y">> = {},
): RollEntry => ({
  y,
  d1: null,
  d2: null,
  r1: null,
  seedMinus1Y: null,
  seedPlus1Y: null,
  ...patch,
});

export const appendSeedIfMissing = (rollEntries: RollEntry[], seed: CalculatorValue): RollEntry[] =>
  rollEntries.length === 0 ? [createRollEntry(seed)] : rollEntries;

export const appendStepRow = (rollEntries: RollEntry[], entry: RollEntry): RollEntry[] => [...rollEntries, entry];

export const toStepCount = (rollEntries: RollEntry[]): number => Math.max(0, rollEntries.length - 1);

const normalizeRational = (value: RationalValue): RationalValue => {
  if (value.den === 0n) {
    throw new Error("Invalid rational denominator.");
  }
  if (value.num === 0n) {
    return { num: 0n, den: 1n };
  }
  const sign = value.den < 0n ? -1n : 1n;
  let num = value.num * sign;
  let den = value.den * sign;
  const abs = (x: bigint): bigint => (x < 0n ? -x : x);
  let a = abs(num);
  let b = abs(den);
  while (b !== 0n) {
    const t = a % b;
    a = b;
    b = t;
  }
  num /= a;
  den /= a;
  return { num, den };
};

export const addRational = (left: RationalValue, right: RationalValue): RationalValue =>
  normalizeRational({
    num: left.num * right.den + right.num * left.den,
    den: left.den * right.den,
  });

export const subRational = (left: RationalValue, right: RationalValue): RationalValue =>
  addRational(left, { num: -right.num, den: right.den });

export const divRational = (left: RationalValue, right: RationalValue): RationalValue | null => {
  if (right.num === 0n) {
    return null;
  }
  return normalizeRational({
    num: left.num * right.den,
    den: left.den * right.num,
  });
};

export const addIntToRational = (value: RationalValue, intValue: bigint): RationalValue =>
  normalizeRational({
    num: value.num + intValue * value.den,
    den: value.den,
  });

export const calculatorValueEquals = (left: CalculatorValue, right: CalculatorValue): boolean => {
  if (left.kind !== right.kind) {
    return false;
  }
  if (left.kind === "nan" && right.kind === "nan") {
    return true;
  }
  if (left.kind === "rational" && right.kind === "rational") {
    const l = normalizeRational(left.value);
    const r = normalizeRational(right.value);
    return l.num === r.num && l.den === r.den;
  }
  if (left.kind === "expr" && right.kind === "expr") {
    return JSON.stringify(left.value) === JSON.stringify(right.value);
  }
  return false;
};

