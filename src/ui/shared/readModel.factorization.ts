import { computeOverflowBoundary } from "../../domain/calculatorValue.js";
import { classifyLocalGrowthOrder as classifyLocalGrowthOrderShared, type LocalGrowthOrder } from "../../domain/rollGrowthOrder.js";
import { getRollYPrimeFactorization } from "../../domain/rollDerived.js";
import { getStepRows } from "../../domain/rollEntries.js";
import type {
  GameState,
  PrimeFactorTerm,
  RationalPrimeFactorization,
  RationalValue,
  RollEntry,
} from "../../domain/types.js";

export type OrbitHeuristicState = "none" | "chaos_like" | "cycle_likely";
export type { LocalGrowthOrder };

export type FactorizationPanelViewModel = {
  seedLabel: string;
  currentLabel: string;
  growthLabel: string;
  transientLabel?: string;
  cycleLabel?: string;
  growthOrder: LocalGrowthOrder;
  cycleDetected: boolean;
};

const FACTORIZATION_EMPTY = "\u2205";
const GROWTH_WINDOW_SIZE = 5;
const GROWTH_AICC_DELTA_THRESHOLD = 2;
const EPSILON = 1e-12;
const POWER_MIN_P = 0.05;
const POWER_MAX_P = 0.95;
const POWER_STEP = 0.05;
const HEURISTIC_HORIZON = 12;
const HEURISTIC_MIN_SAMPLES = 6;
const HEURISTIC_MIN_COMPARISONS = 5;
const CHAOS_DIVERGENCE_RATIO_THRESHOLD = 4;

const toSuperscriptNumber = (value: number): string => {
  const superscriptDigits: Record<string, string> = {
    "0": "\u2070",
    "1": "\u00B9",
    "2": "\u00B2",
    "3": "\u00B3",
    "4": "\u2074",
    "5": "\u2075",
    "6": "\u2076",
    "7": "\u2077",
    "8": "\u2078",
    "9": "\u2079",
  };
  return value
    .toString()
    .split("")
    .map((digit) => superscriptDigits[digit] ?? digit)
    .join("");
};

const formatFactorizationTerms = (terms: PrimeFactorTerm[]): string => {
  if (terms.length === 0) {
    return "1";
  }
  return terms
    .map((term) => `${term.prime.toString()}${toSuperscriptNumber(term.exponent)}`)
    .join(" \u00D7 ");
};

const formatFactorization = (factorization: RationalPrimeFactorization | undefined): string => {
  if (!factorization) {
    return FACTORIZATION_EMPTY;
  }
  const numerator = formatFactorizationTerms(factorization.numerator);
  if (factorization.denominator.length === 0) {
    return `${factorization.sign < 0 ? "-" : ""}${numerator}`;
  }
  const denominator = formatFactorizationTerms(factorization.denominator);
  return `${factorization.sign < 0 ? "-" : ""}(${numerator}) / (${denominator})`;
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

const toRationalNumber = (value: RationalValue): number => Number(value.num) / Number(value.den);

const getChaosDivergenceSample = (entry: RollEntry): number | null => {
  if (
    entry.error
    || entry.y.kind !== "rational"
    || entry.seedMinus1Y?.kind !== "rational"
    || entry.seedPlus1Y?.kind !== "rational"
  ) {
    return null;
  }
  const y = toRationalNumber(entry.y.value);
  const seedMinus = toRationalNumber(entry.seedMinus1Y.value);
  const seedPlus = toRationalNumber(entry.seedPlus1Y.value);
  if (!Number.isFinite(y) || !Number.isFinite(seedMinus) || !Number.isFinite(seedPlus)) {
    return null;
  }
  return (Math.abs(y - seedMinus) + Math.abs(seedPlus - y)) / 2;
};

const isChaosLikeHeuristic = (stepRows: RollEntry[]): boolean => {
  const divergenceSamples = stepRows
    .map((entry) => getChaosDivergenceSample(entry))
    .filter((value): value is number => value !== null);
  if (divergenceSamples.length < HEURISTIC_MIN_SAMPLES) {
    return false;
  }
  const tail = divergenceSamples.slice(-HEURISTIC_MIN_SAMPLES);
  const logTail = tail.map((value) => Math.log(Math.max(value, EPSILON)));
  const comparisonAverages: number[] = [];
  for (let index = 1; index < logTail.length; index += 1) {
    comparisonAverages.push((logTail[index - 1] + logTail[index]) / 2);
  }
  if (comparisonAverages.length < HEURISTIC_MIN_COMPARISONS) {
    return false;
  }
  for (let index = 1; index < comparisonAverages.length; index += 1) {
    if (comparisonAverages[index] + EPSILON < comparisonAverages[index - 1]) {
      return false;
    }
  }
  const first = Math.max(tail[0], EPSILON);
  const last = Math.max(tail[tail.length - 1], EPSILON);
  return (last / first) >= CHAOS_DIVERGENCE_RATIO_THRESHOLD;
};

const isCycleLikelyHeuristic = (stepRows: RollEntry[], maxTotalDigits: number): boolean => {
  if (stepRows.length < HEURISTIC_MIN_SAMPLES) {
    return false;
  }
  const boundary = computeOverflowBoundary(maxTotalDigits);
  const seen = new Set<string>();
  let hasRepeat = false;
  for (const entry of stepRows) {
    if (entry.error || entry.y.kind !== "rational" || entry.y.value.den !== 1n) {
      return false;
    }
    const value = entry.y.value.num;
    const absValue = value < 0n ? -value : value;
    if (absValue > boundary) {
      return false;
    }
    const key = value.toString();
    if (seen.has(key)) {
      hasRepeat = true;
    }
    seen.add(key);
  }
  return hasRepeat;
};

const resolveOrbitHeuristicState = (state: GameState): OrbitHeuristicState => {
  if (state.calculator.rollAnalysis.stopReason === "cycle") {
    return "none";
  }
  const stepRows = getStepRows(state.calculator.rollEntries).slice(-HEURISTIC_HORIZON);
  if (isCycleLikelyHeuristic(stepRows, state.unlocks.maxTotalDigits)) {
    return "cycle_likely";
  }
  if (isChaosLikeHeuristic(stepRows)) {
    return "chaos_like";
  }
  return "none";
};

type GrowthSample = {
  n: number;
  y: number;
  d1: RationalValue;
  d2: RationalValue | null;
  r1: RationalValue;
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
  if (index <= 0 || entry.error || entry.y.kind !== "rational" || !entry.d1 || !entry.r1) {
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
    r1: entry.r1,
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

const classifyLocalGrowthOrder = (state: GameState): LocalGrowthOrder =>
  classifyLocalGrowthOrderShared(state, resolveGrowthTargetIndex(state));

const buildSeedFactorizationLabel = (state: GameState): string => {
  const seedValue = state.calculator.rollEntries.length > 0
    ? state.calculator.rollEntries[0]?.y
    : state.calculator.total;
  if (!seedValue) {
    return `f\u2080 = ${FACTORIZATION_EMPTY}`;
  }
  if (seedValue.kind === "nan") {
    return `f\u2080 = ${FACTORIZATION_EMPTY}`;
  }
  if (seedValue.kind === "rational" && seedValue.value.num === 0n) {
    return `f\u2080 = ${FACTORIZATION_EMPTY}`;
  }
  return `f\u2080 = ${formatFactorization(getRollYPrimeFactorization(seedValue))}`;
};

const buildCurrentFactorizationLabel = (state: GameState): string => {
  const latest = state.calculator.rollEntries.at(-1);
  return `f\u2099 = ${formatFactorization(latest?.factorization)}`;
};

export const buildFactorizationPanelViewModel = (state: GameState): FactorizationPanelViewModel => {
  const growthOrder = classifyLocalGrowthOrder(state);
  const cycle = state.calculator.rollAnalysis.stopReason === "cycle" ? state.calculator.rollAnalysis.cycle : null;
  const cycleDetected = Boolean(cycle);
  const orbitHeuristic = cycleDetected ? "none" : resolveOrbitHeuristicState(state);
  const growthLabel = cycleDetected
    ? `O(f_\u03BC) = ${growthOrder}`
    : orbitHeuristic === "chaos_like"
      ? "O(f) = chaos?"
      : orbitHeuristic === "cycle_likely"
        ? "O(f) = cycle-likely"
        : `O(f) = ${growthOrder}`;
  return {
    seedLabel: buildSeedFactorizationLabel(state),
    currentLabel: buildCurrentFactorizationLabel(state),
    growthLabel,
    ...(cycleDetected && cycle
      ? {
          transientLabel: `f^\u03BC = ${cycle.i.toString()}`,
          cycleLabel: `f^\u27E1 = ${(cycle.j - cycle.i).toString()}`,
        }
      : {}),
    growthOrder,
    cycleDetected,
  };
};
