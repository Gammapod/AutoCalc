import type { GameState, RationalValue, RollEntry } from "./types.js";

export type LocalGrowthOrder = "constant" | "linear" | "quadratic" | "exponential" | "radical" | "logarithmic" | "unknown";

const GROWTH_WINDOW_SIZE = 5;
const GROWTH_AICC_DELTA_THRESHOLD = 2;
const EPSILON = 1e-12;
const POWER_MIN_P = 0.05;
const POWER_MAX_P = 0.95;
const POWER_STEP = 0.05;

type GrowthSample = {
  n: number;
  y: number;
  d1: RationalValue;
  d2: RationalValue | null;
  r1: RationalValue | null;
};

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

const rationalsEqual = (left: RationalValue, right: RationalValue): boolean => {
  const l = normalizeRational(left);
  const r = normalizeRational(right);
  return l.num === r.num && l.den === r.den;
};

const isRationalZero = (value: RationalValue): boolean => {
  const normalized = normalizeRational(value);
  return normalized.num === 0n;
};

const absRationalGreaterThanOne = (value: RationalValue): boolean => {
  const normalized = normalizeRational(value);
  const absNum = normalized.num < 0n ? -normalized.num : normalized.num;
  return absNum > normalized.den;
};

const fitLinearModel = (
  xs: number[],
  ys: number[],
): { a: number; b: number; sse: number } | null => {
  if (xs.length !== ys.length || xs.length === 0) {
    return null;
  }
  const count = xs.length;
  const meanX = xs.reduce((sum, value) => sum + value, 0) / count;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / count;
  let varX = 0;
  let cov = 0;
  for (let index = 0; index < count; index += 1) {
    const dx = xs[index] - meanX;
    varX += dx * dx;
    cov += dx * (ys[index] - meanY);
  }
  if (varX <= EPSILON) {
    return null;
  }
  const b = cov / varX;
  const a = meanY - b * meanX;
  let sse = 0;
  for (let index = 0; index < count; index += 1) {
    const estimate = a + b * xs[index];
    const residual = ys[index] - estimate;
    sse += residual * residual;
  }
  return { a, b, sse };
};

const computeAicc = (sse: number, n: number, k: number): number => {
  if (n <= k + 1) {
    return Number.POSITIVE_INFINITY;
  }
  const boundedSse = Math.max(sse, EPSILON);
  return n * Math.log(boundedSse / n) + 2 * k + (2 * k * (k + 1)) / (n - k - 1);
};

const classifyNonlinearGrowth = (samples: GrowthSample[]): "radical" | "logarithmic" | "unknown" => {
  const n = samples.length;
  const xsN = samples.map((sample) => sample.n);
  const ys = samples.map((sample) => sample.y);
  const xsLog = xsN.map((value) => Math.log(value));
  const logFit = fitLinearModel(xsLog, ys);
  if (!logFit) {
    return "unknown";
  }
  const logAicc = computeAicc(logFit.sse, n, 2);

  let bestPowerAicc = Number.POSITIVE_INFINITY;
  for (let p = POWER_MIN_P; p <= POWER_MAX_P + EPSILON; p += POWER_STEP) {
    const xsPower = xsN.map((value) => Math.pow(value, p));
    const powerFit = fitLinearModel(xsPower, ys);
    if (!powerFit) {
      continue;
    }
    const powerAicc = computeAicc(powerFit.sse, n, 3);
    if (powerAicc < bestPowerAicc) {
      bestPowerAicc = powerAicc;
    }
  }
  if (!Number.isFinite(bestPowerAicc)) {
    return "unknown";
  }

  const delta = Math.abs(logAicc - bestPowerAicc);
  if (delta < GROWTH_AICC_DELTA_THRESHOLD) {
    return "unknown";
  }
  return bestPowerAicc < logAicc ? "radical" : "logarithmic";
};

const toGrowthSample = (entry: RollEntry, index: number): GrowthSample | null => {
  if (index <= 0 || entry.error || entry.y.kind !== "rational" || !entry.d1) {
    return null;
  }
  const y = Number(entry.y.value.num) / Number(entry.y.value.den);
  if (!Number.isFinite(y)) {
    return null;
  }
  return {
    n: index,
    y,
    d1: entry.d1,
    d2: entry.d2 ?? null,
    r1: entry.r1 ?? null,
  };
};

const resolveGrowthTargetIndex = (state: GameState): number => {
  const maxIndex = state.calculator.rollEntries.length - 1;
  if (maxIndex < 1) {
    return maxIndex;
  }
  const cycle = state.calculator.rollAnalysis.stopReason === "cycle" ? state.calculator.rollAnalysis.cycle : null;
  if (!cycle) {
    return maxIndex;
  }
  return Math.max(1, Math.min(maxIndex, cycle.j));
};

export const classifyLocalGrowthOrder = (state: GameState, targetIndex: number = resolveGrowthTargetIndex(state)): LocalGrowthOrder => {
  if (targetIndex < 1) {
    return "unknown";
  }
  const samples = state.calculator.rollEntries
    .slice(1, targetIndex + 1)
    .map((entry, offset) => toGrowthSample(entry, offset + 1))
    .filter((entry): entry is GrowthSample => Boolean(entry));
  const window = samples.slice(-GROWTH_WINDOW_SIZE);
  if (window.length < GROWTH_WINDOW_SIZE) {
    return "unknown";
  }

  const d1Values = window.map((sample) => sample.d1);
  const d2Values = window.map((sample) => sample.d2);
  const r1Values = window.map((sample) => sample.r1);

  if (d1Values.every((value) => isRationalZero(value))) {
    return "constant";
  }

  const d1First = d1Values[0];
  if (!isRationalZero(d1First) && d1Values.every((value) => rationalsEqual(value, d1First))) {
    return "linear";
  }

  const r1First = r1Values[0];
  if (r1First && absRationalGreaterThanOne(r1First) && r1Values.every((value) => value !== null && rationalsEqual(value, r1First))) {
    return "exponential";
  }

  if (d2Values.every((value) => value !== null && !isRationalZero(value))) {
    const first = d2Values[0];
    if (first && d2Values.every((value) => value !== null && rationalsEqual(value, first))) {
      return "quadratic";
    }
  }

  return classifyNonlinearGrowth(window);
};
