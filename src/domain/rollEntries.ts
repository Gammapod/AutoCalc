import type { CalculatorValue, RationalValue, RollEntry } from "./types.js";

export const MAX_ROLL_ENTRIES = 5000;
export const MAX_ROLL_STEP_ROWS = MAX_ROLL_ENTRIES - 1;

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

const withAnalysisIgnored = (entry: RollEntry, analysisIgnored: boolean): RollEntry => {
  const { analysisIgnored: _analysisIgnored, ...rest } = entry;
  if (!analysisIgnored) {
    return rest;
  }
  return {
    ...rest,
    analysisIgnored: true,
  };
};

export const normalizeAnalysisIgnoredRollEntries = (rollEntries: RollEntry[]): RollEntry[] => {
  const normalized = rollEntries.map((entry, index) => withAnalysisIgnored(
    entry,
    index === 0 ? false : entry.origin === "roll_inverse",
  ));
  for (let index = 1; index < normalized.length; index += 1) {
    if (normalized[index]?.origin !== "roll_inverse") {
      continue;
    }
    for (let prior = index - 1; prior >= 1; prior -= 1) {
      if (!normalized[prior]?.analysisIgnored) {
        normalized[prior] = withAnalysisIgnored(normalized[prior], true);
        break;
      }
    }
  }
  return normalized;
};

export type RollAnalysisProjectionEntry = {
  rawIndex: number;
  entry: RollEntry;
};

export const buildAnalysisRollProjection = (rollEntries: RollEntry[]): RollAnalysisProjectionEntry[] =>
  rollEntries.flatMap((entry, rawIndex) =>
    entry.analysisIgnored ? [] : [{ rawIndex, entry }],
  );

export const appendSeedIfMissing = (rollEntries: RollEntry[], seed: CalculatorValue): RollEntry[] =>
  rollEntries.length === 0 ? [createRollEntry(seed)] : rollEntries;

export const appendStepRow = (rollEntries: RollEntry[], entry: RollEntry): RollEntry[] => {
  const next = [...rollEntries, entry];
  if (next.length <= MAX_ROLL_ENTRIES) {
    return next;
  }

  const seed = next[0];
  const prunedSteps = next.slice(-(MAX_ROLL_STEP_ROWS));
  return [seed, ...prunedSteps];
};

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
  if (left.kind === "complex" && right.kind === "complex") {
    const lRe = left.value.re.kind === "rational" ? normalizeRational(left.value.re.value) : left.value.re.value;
    const rRe = right.value.re.kind === "rational" ? normalizeRational(right.value.re.value) : right.value.re.value;
    const lIm = left.value.im.kind === "rational" ? normalizeRational(left.value.im.value) : left.value.im.value;
    const rIm = right.value.im.kind === "rational" ? normalizeRational(right.value.im.value) : right.value.im.value;
    return JSON.stringify(lRe) === JSON.stringify(rRe) && JSON.stringify(lIm) === JSON.stringify(rIm);
  }
  return false;
};
