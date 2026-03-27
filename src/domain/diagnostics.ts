import { calculatorValueToDisplayString, computeOverflowBoundary, isRationalCalculatorValue } from "./calculatorValue.js";
import { expressionToDisplayString, slotOperandToExpression } from "./expression.js";
import { getCurrentTotalDomainSymbol } from "./currentTotalDomain.js";
import { classifyLocalGrowthOrder as classifyLocalGrowthOrderShared, type LocalGrowthOrder } from "./rollGrowthOrder.js";
import { getRollYPrimeFactorization } from "./rollDerived.js";
import { buildAnalysisRollProjection, getSeedRow } from "./rollEntries.js";
import {
  getButtonFace,
  getOperatorAlgebraicFace,
  getOperatorSlotFace,
  isBinaryOperatorKeyId,
  isUnaryOperatorId,
} from "./keyPresentation.js";
import type { BinarySlot, GameState, PrimeFactorTerm, RationalPrimeFactorization, RationalValue, RollEntry, Slot, UnarySlot } from "./types.js";
import type { ContentProvider } from "../contracts/contentProvider.js";
import { getAppServices } from "../contracts/appServices.js";

type TokenMap = Record<string, string | undefined>;

const EMPTY = "_";
const FACTORIZATION_EMPTY = "\u2205";
const EPSILON = 1e-12;
const POWER_MIN_P = 0.05;
const POWER_MAX_P = 0.95;
const POWER_STEP = 0.05;
const GROWTH_AICC_DELTA_THRESHOLD = 2;
const HEURISTIC_HORIZON = 12;
const HEURISTIC_MIN_SAMPLES = 6;
const HEURISTIC_MIN_COMPARISONS = 5;
const CHAOS_DIVERGENCE_RATIO_THRESHOLD = 4;

export type OrbitHeuristicState = "none" | "chaos_like" | "cycle_likely";

export type ResolvedLastKeyDiagnostic = {
  title: string;
  short: string;
  long: string;
  caveats: string[];
};

export type ResolvedNextOperationDiagnostic = {
  label: string;
  expandedShort: string;
  expandedLong: string;
  hasPendingOperation: boolean;
};

export type RollDiagnosticsSectionRow = {
  text: string;
  kind: "section" | "normal" | "placeholder";
  role?:
    | "seed_factorization"
    | "current_factorization"
    | "growth_label"
    | "cycle_transient"
    | "cycle_period";
};

export type CircleSemanticSnapshot = {
  mode: "radial" | "residue_wheel";
  residueWheelSpec: {
    cycleStartIndex: number;
    cycleEndIndex: number;
    wheelMin: number;
    wheelMaxExclusive: number;
    span: number;
  } | null;
  radialCapIndex: number | null;
};

export type RollDiagnosticsSnapshot = {
  lastKey: ResolvedLastKeyDiagnostic;
  nextOperation: ResolvedNextOperationDiagnostic;
  orbit: {
    growthOrder: LocalGrowthOrder;
    growthLabel: string;
    heuristicState: OrbitHeuristicState;
    cycleDetected: boolean;
    transientLength: number | null;
    periodLength: number | null;
    transientLabel: string | null;
    cycleLabel: string | null;
  };
  domain: {
    text: string;
    symbol: ReturnType<typeof getCurrentTotalDomainSymbol>;
    category: "empty" | "prime" | "natural" | "integer" | "rational" | "symbolic_or_nan";
  };
  factorization: {
    seedLabel: string;
    currentLabel: string;
  };
  rollWindow: {
    analysisEntries: RollEntry[];
    allEntries: RollEntry[];
    latestIndex: number | null;
    cycleStartIndex: number | null;
    cycleEndIndex: number | null;
  };
  circleSemantics: CircleSemanticSnapshot;
  sectionRows: RollDiagnosticsSectionRow[];
};

const interpolateTemplate = (template: string, tokens: TokenMap): string =>
  template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, tokenName: string) => {
    const value = tokens[tokenName];
    if (typeof value !== "string") {
      return EMPTY;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : EMPTY;
  });

const resolveCalcSymbol = (state: GameState): string => (state.activeCalculatorId === "g" ? "g" : "f");

const resolveCommonTokens = (state: GameState): TokenMap => ({
  calcSymbol: resolveCalcSymbol(state),
  activeVisualizer: state.settings.visualizer,
});

const resolveCurrentTotalToken = (state: GameState): string => calculatorValueToDisplayString(state.calculator.total);

const resolveSeedToken = (state: GameState): string => {
  const seed = state.calculator.rollEntries.length > 0
    ? getSeedRow(state.calculator.rollEntries)?.y ?? state.calculator.total
    : state.calculator.total;
  return calculatorValueToDisplayString(seed);
};

const resolveDraftingOperand = (state: GameState): string => {
  const draft = state.calculator.draftingSlot;
  if (!draft) {
    return EMPTY;
  }
  if (draft.operandInput.length === 0) {
    return draft.isNegative ? `-${EMPTY}` : EMPTY;
  }
  return `${draft.isNegative ? "-" : ""}${draft.operandInput}`;
};

const resolveSlotOperand = (slot: BinarySlot): string => {
  if (typeof slot.operand === "bigint") {
    return slot.operand.toString();
  }
  return expressionToDisplayString(slotOperandToExpression(slot.operand));
};

const resolvePendingOperationSlot = (state: GameState): Slot | null => {
  const slots = state.calculator.operationSlots;
  if (state.calculator.stepProgress.active) {
    const index = Math.max(0, Math.min(state.calculator.stepProgress.nextSlotIndex, slots.length));
    if (index < slots.length) {
      return slots[index];
    }
    if (state.calculator.draftingSlot) {
      return { operator: state.calculator.draftingSlot.operator, operand: 0n };
    }
    return null;
  }
  if (slots.length > 0) {
    return slots[0];
  }
  if (state.calculator.draftingSlot) {
    return { operator: state.calculator.draftingSlot.operator, operand: 0n };
  }
  return null;
};

const resolveOperationTokens = (state: GameState, slot: Slot | null): TokenMap => {
  if (!slot) {
    return {
      ...resolveCommonTokens(state),
      operatorFace: EMPTY,
      operatorAlgebraicFace: EMPTY,
      operand: EMPTY,
      seed: resolveSeedToken(state),
      currentTotal: resolveCurrentTotalToken(state),
    };
  }
  const operatorFace = getOperatorSlotFace(slot.operator);
  const operatorAlgebraicFace = getOperatorAlgebraicFace(slot.operator);
  if ("operand" in slot) {
    return {
      ...resolveCommonTokens(state),
      operatorFace,
      operatorAlgebraicFace,
      operand: resolveSlotOperand(slot),
      seed: resolveSeedToken(state),
      currentTotal: resolveCurrentTotalToken(state),
    };
  }
  return {
    ...resolveCommonTokens(state),
    operatorFace,
    operatorAlgebraicFace,
    operand: EMPTY,
    seed: resolveSeedToken(state),
    currentTotal: resolveCurrentTotalToken(state),
  };
};

const resolveDiagnosticsContent = (content?: ContentProvider["diagnostics"]): ContentProvider["diagnostics"] =>
  content ?? getAppServices().contentProvider.diagnostics;

const buildLastKeyDiagnostic = (state: GameState, content: ContentProvider["diagnostics"]): ResolvedLastKeyDiagnostic => {
  const keyId = state.ui.diagnostics.lastAction.keyId;
  const keyEntry = keyId ? content.keys[keyId] : null;
  const tokens: TokenMap = {
    ...resolveCommonTokens(state),
    keyFace: keyId ? getButtonFace(keyId) : EMPTY,
    actionKind: state.ui.diagnostics.lastAction.actionKind,
  };

  if (!keyEntry) {
    return {
      title: "Last Key",
      short: interpolateTemplate("{keyFace}: {actionKind}.", tokens),
      long: interpolateTemplate("Last action was {actionKind} on {calcSymbol}.", tokens),
      caveats: [],
    };
  }

  return {
    title: keyEntry.title,
    short: interpolateTemplate(keyEntry.shortTemplate, tokens),
    long: interpolateTemplate(keyEntry.longTemplate ?? keyEntry.shortTemplate, tokens),
    caveats: (keyEntry.caveats ?? []).map((line) => interpolateTemplate(line, tokens)),
  };
};

const buildNextOperationDiagnostic = (state: GameState, content: ContentProvider["diagnostics"]): ResolvedNextOperationDiagnostic => {
  const slot = resolvePendingOperationSlot(state);
  if (!slot) {
    const common = { ...resolveCommonTokens(state), currentTotal: resolveCurrentTotalToken(state), seed: resolveSeedToken(state) };
    return {
      label: "No pending operation",
      expandedShort: interpolateTemplate("{currentTotal}", common),
      expandedLong: interpolateTemplate("No pending operation for {calcSymbol}.", common),
      hasPendingOperation: false,
    };
  }
  if ("operand" in slot && isBinaryOperatorKeyId(slot.operator)) {
    const entry = content.operations.binary[slot.operator];
    const tokens = resolveOperationTokens(state, slot);
    if (state.calculator.draftingSlot && state.calculator.operationSlots.length === 0) {
      tokens.operand = resolveDraftingOperand(state);
    }
    return {
      label: entry.label,
      expandedShort: interpolateTemplate(entry.expandedShortTemplate, tokens),
      expandedLong: interpolateTemplate(entry.expandedLongTemplate, tokens),
      hasPendingOperation: true,
    };
  }
  const unaryOperator = ("operator" in slot && isUnaryOperatorId(slot.operator))
    ? slot.operator
    : state.calculator.operationSlots.find((item): item is UnarySlot => "kind" in item && item.kind === "unary")?.operator;
  if (unaryOperator) {
    const entry = content.operations.unary[unaryOperator];
    const tokens = resolveOperationTokens(state, { kind: "unary", operator: unaryOperator });
    return {
      label: entry.label,
      expandedShort: interpolateTemplate(entry.expandedShortTemplate, tokens),
      expandedLong: interpolateTemplate(entry.expandedLongTemplate, tokens),
      hasPendingOperation: true,
    };
  }
  const fallbackTokens = resolveOperationTokens(state, slot);
  return {
    label: getOperatorSlotFace(slot.operator),
    expandedShort: interpolateTemplate("{currentTotal} {operatorFace} {operand}", fallbackTokens),
    expandedLong: interpolateTemplate("Pending operation {operatorFace} on {calcSymbol}.", fallbackTokens),
    hasPendingOperation: true,
  };
};

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
  return value.toString().split("").map((digit) => superscriptDigits[digit] ?? digit).join("");
};

const formatFactorizationTerms = (terms: PrimeFactorTerm[]): string => {
  if (terms.length === 0) {
    return "1";
  }
  return terms.map((term) => `${term.prime.toString()}${toSuperscriptNumber(term.exponent)}`).join(" \u00D7 ");
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

const buildSeedFactorizationLabel = (state: GameState): string => {
  const seedValue = state.calculator.rollEntries.length > 0
    ? state.calculator.rollEntries[0]?.y
    : state.calculator.total;
  if (!seedValue || seedValue.kind === "nan") {
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

const buildDomainText = (state: GameState): string => {
  const total = state.calculator.total;
  if (total.kind === "nan") {
    return "Current total domain: unresolved (NaN).";
  }
  if (!isRationalCalculatorValue(total)) {
    return "Current total domain: symbolic expression (numeric domain copy pending).";
  }
  const value = total.value;
  if (value.den !== 1n) {
    return "Current total domain: rational non-integer (\u211A\\\u2124).";
  }
  if (value.num > 0n) {
    return "Current total domain: natural number (\u2115).";
  }
  if (value.num === 0n) {
    return "Current total domain: integer boundary at zero (\u2124).";
  }
  return "Current total domain: non-natural integer (\u2124).";
};

const resolveDomainCategory = (state: GameState, symbol: ReturnType<typeof getCurrentTotalDomainSymbol>): RollDiagnosticsSnapshot["domain"]["category"] => {
  if (state.calculator.total.kind === "expr" || state.calculator.total.kind === "nan") {
    return "symbolic_or_nan";
  }
  if (symbol === "\u2205") {
    return "empty";
  }
  if (symbol === "\u2119") {
    return "prime";
  }
  if (symbol === "\u2115") {
    return "natural";
  }
  if (symbol === "\u2124") {
    return "integer";
  }
  return "rational";
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

const isRationalZero = (value: RationalValue): boolean => normalizeRational(value).num === 0n;

const absRationalGreaterThanOne = (value: RationalValue): boolean => {
  const normalized = normalizeRational(value);
  const absNum = normalized.num < 0n ? -normalized.num : normalized.num;
  return absNum > normalized.den;
};

type GrowthSample = { n: number; y: number; d1: RationalValue; d2: RationalValue | null; r1: RationalValue };

const fitLinearModel = (xs: number[], ys: number[]): { a: number; b: number; sse: number } | null => {
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
  return { n: index, y, d1: entry.d1, d2: entry.d2 ?? null, r1: entry.r1 };
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
  const divergenceSamples = stepRows.map((entry) => getChaosDivergenceSample(entry)).filter((value): value is number => value !== null);
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

const isCycleLikelyHeuristic = (state: GameState, stepRows: RollEntry[]): boolean => {
  if (stepRows.length < HEURISTIC_MIN_SAMPLES) {
    return false;
  }
  const displayRadix = state.settings.base === "base2" ? 2 : 10;
  const boundary = computeOverflowBoundary(state.unlocks.maxTotalDigits, displayRadix);
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
  const stepRows = buildAnalysisRollProjection(state.calculator.rollEntries)
    .slice(1)
    .map((item) => item.entry)
    .slice(-HEURISTIC_HORIZON);
  if (isCycleLikelyHeuristic(state, stepRows)) {
    return "cycle_likely";
  }
  if (isChaosLikeHeuristic(stepRows)) {
    return "chaos_like";
  }
  return "none";
};

const toFiniteEntryValue = (entry: RollEntry): number | null => {
  if (!isRationalCalculatorValue(entry.y)) {
    return null;
  }
  const value = Number(entry.y.value.num) / Number(entry.y.value.den);
  return Number.isFinite(value) ? value : null;
};

const buildCircleSemantics = (state: GameState): CircleSemanticSnapshot => {
  const deltaRangeWrapEnabled = state.settings.wrapper === "delta_range_clamp";
  const modZeroToDeltaEnabled = state.settings.wrapper === "mod_zero_to_delta";
  const displayRadix = state.settings.base === "base2" ? 2 : 10;

  if (deltaRangeWrapEnabled || modZeroToDeltaEnabled) {
    const boundary = Number(computeOverflowBoundary(state.unlocks.maxTotalDigits, displayRadix));
    if (!Number.isFinite(boundary) || boundary <= 0) {
      return { mode: "radial", residueWheelSpec: null, radialCapIndex: null };
    }
    if (deltaRangeWrapEnabled) {
      return {
        mode: "residue_wheel",
        residueWheelSpec: {
          cycleStartIndex: 0,
          cycleEndIndex: -1,
          wheelMin: -boundary,
          wheelMaxExclusive: boundary,
          span: boundary * 2,
        },
        radialCapIndex: -1,
      };
    }
    return {
      mode: "residue_wheel",
      residueWheelSpec: {
        cycleStartIndex: 0,
        cycleEndIndex: -1,
        wheelMin: 0,
        wheelMaxExclusive: boundary,
        span: boundary,
      },
      radialCapIndex: -1,
    };
  }

  if (state.calculator.rollAnalysis.stopReason !== "cycle") {
    return { mode: "radial", residueWheelSpec: null, radialCapIndex: null };
  }
  const cycle = state.calculator.rollAnalysis.cycle;
  if (!cycle || state.calculator.rollEntries.length === 0) {
    return { mode: "radial", residueWheelSpec: null, radialCapIndex: null };
  }
  const maxRollIndex = state.calculator.rollEntries.length - 1;
  const cycleStartIndex = Math.max(0, Math.min(maxRollIndex, cycle.i));
  const cycleEndIndex = Math.max(cycleStartIndex, Math.min(maxRollIndex, cycle.j));
  const cycleValues = state.calculator.rollEntries
    .slice(cycleStartIndex, cycleEndIndex + 1)
    .map((entry) => toFiniteEntryValue(entry))
    .filter((value): value is number => value !== null);
  if (cycleValues.length === 0) {
    return { mode: "radial", residueWheelSpec: null, radialCapIndex: null };
  }
  const wheelMin = Math.floor(Math.min(...cycleValues));
  const wheelMaxExclusive = Math.ceil(Math.max(...cycleValues));
  const span = wheelMaxExclusive - wheelMin;
  if (span <= 0) {
    return { mode: "radial", residueWheelSpec: null, radialCapIndex: null };
  }
  return {
    mode: "residue_wheel",
    residueWheelSpec: { cycleStartIndex, cycleEndIndex, wheelMin, wheelMaxExclusive, span },
    radialCapIndex: cycleEndIndex,
  };
};

const buildSectionRows = (
  lastKey: ResolvedLastKeyDiagnostic,
  nextOperation: ResolvedNextOperationDiagnostic,
  snapshot: Pick<RollDiagnosticsSnapshot, "orbit" | "domain" | "factorization">,
): RollDiagnosticsSectionRow[] => ([
  { text: "Last Key", kind: "section" },
  { text: `${lastKey.title}: ${lastKey.short}`, kind: "normal" },
  { text: lastKey.long, kind: "normal" },
  ...lastKey.caveats.map((line) => ({ text: line, kind: "placeholder" as const })),
  { text: "Next Operation", kind: "section" },
  { text: nextOperation.expandedShort, kind: nextOperation.hasPendingOperation ? "normal" : "placeholder" },
  { text: nextOperation.expandedLong, kind: nextOperation.hasPendingOperation ? "normal" : "placeholder" },
  { text: "Orbit Analysis", kind: "section" },
  { text: snapshot.orbit.growthLabel, kind: "normal", role: "growth_label" },
  ...(snapshot.orbit.transientLabel
    ? [{ text: snapshot.orbit.transientLabel, kind: "normal" as const, role: "cycle_transient" as const }]
    : [{ text: "Transient length tracking wired.", kind: "placeholder" as const }]),
  ...(snapshot.orbit.cycleLabel
    ? [
        { text: snapshot.orbit.cycleLabel, kind: "normal" as const, role: "cycle_period" as const },
        { text: "Cycle diameter/range reporting wiring in place; numeric wording pending.", kind: "placeholder" as const },
      ]
    : [{ text: "No cycle detected yet.", kind: "normal" as const }]),
  { text: "Domain", kind: "section" },
  { text: snapshot.domain.text, kind: "normal" },
  { text: "Prime Factorization", kind: "section" },
  { text: snapshot.factorization.seedLabel, kind: "normal", role: "seed_factorization" },
  { text: snapshot.factorization.currentLabel, kind: "normal", role: "current_factorization" },
]);

export const buildRollDiagnosticsSnapshot = (
  state: GameState,
  content?: ContentProvider["diagnostics"],
): RollDiagnosticsSnapshot => {
  const resolvedContent = resolveDiagnosticsContent(content);
  const lastKey = buildLastKeyDiagnostic(state, resolvedContent);
  const nextOperation = buildNextOperationDiagnostic(state, resolvedContent);
  const growthOrder = classifyLocalGrowthOrder(state);
  const cycle = state.calculator.rollAnalysis.stopReason === "cycle" ? state.calculator.rollAnalysis.cycle : null;
  const cycleDetected = Boolean(cycle);
  const heuristicState = cycleDetected ? "none" : resolveOrbitHeuristicState(state);
  const growthLabel = cycleDetected
    ? `O(f_\u03BC) = ${growthOrder}`
    : heuristicState === "chaos_like" && growthOrder !== "exponential"
      ? "O(f) = chaos?"
      : heuristicState === "cycle_likely"
        ? "O(f) = cycle-likely"
        : `O(f) = ${growthOrder}`;

  const transientLabel = cycleDetected && cycle ? `f^\u03BC = ${cycle.i.toString()}` : null;
  const cycleLabel = cycleDetected && cycle ? `f^\u27E1 = ${(cycle.j - cycle.i).toString()}` : null;
  const domainSymbol = getCurrentTotalDomainSymbol(state);
  const domain = {
    text: buildDomainText(state),
    symbol: domainSymbol,
    category: resolveDomainCategory(state, domainSymbol),
  } as const;
  const factorization = {
    seedLabel: buildSeedFactorizationLabel(state),
    currentLabel: buildCurrentFactorizationLabel(state),
  };
  const circleSemantics = buildCircleSemantics(state);
  const rollWindow = {
    analysisEntries: buildAnalysisRollProjection(state.calculator.rollEntries).map((item) => item.entry),
    allEntries: state.calculator.rollEntries,
    latestIndex: state.calculator.rollEntries.length > 0 ? state.calculator.rollEntries.length - 1 : null,
    cycleStartIndex: cycle ? cycle.i : null,
    cycleEndIndex: cycle ? cycle.j : null,
  };
  const orbit = {
    growthOrder,
    growthLabel,
    heuristicState,
    cycleDetected,
    transientLength: cycle ? cycle.i : null,
    periodLength: cycle ? cycle.j - cycle.i : null,
    transientLabel,
    cycleLabel,
  };
  const sectionRows = buildSectionRows(lastKey, nextOperation, { orbit, domain, factorization });

  return {
    lastKey,
    nextOperation,
    orbit,
    domain,
    factorization,
    rollWindow,
    circleSemantics,
    sectionRows,
  };
};

export const resolveLastKeyDiagnostic = (
  state: GameState,
  content?: ContentProvider["diagnostics"],
): ResolvedLastKeyDiagnostic => buildRollDiagnosticsSnapshot(state, content).lastKey;

export const resolveNextOperationDiagnostic = (
  state: GameState,
  content?: ContentProvider["diagnostics"],
): ResolvedNextOperationDiagnostic => buildRollDiagnosticsSnapshot(state, content).nextOperation;

