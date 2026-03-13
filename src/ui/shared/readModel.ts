import { unlockCatalog } from "../../content/unlocks.catalog.js";
import { toPreferredFractionString } from "../../infra/math/euclideanEngine.js";
import { calculatorValueToDisplayString } from "../../domain/calculatorValue.js";
import { expressionToDisplayString, slotOperandToExpression } from "../../domain/expression.js";
import { getButtonDefinition } from "../../domain/buttonRegistry.js";
import {
  getKeyButtonFaceLabel,
  getOperatorAlgebraicFaceLabel,
  getOperatorInlineFaceLabel,
  getOperatorSlotFaceLabel,
  isBinaryOperatorKeyId,
  isDigitKeyId,
  KEY_ID,
  resolveKeyId,
  toLegacyKey,
} from "../../domain/keyPresentation.js";
import { analyzeUnlockSpecRows, type UnlockSpecStatus } from "../../domain/analysis.js";
import { buildUnlockCriteria } from "../../domain/unlockEngine.js";
import { getRollYPrimeFactorization } from "../../domain/rollDerived.js";
import { getSeedRow, getStepRows } from "../../domain/rollEntries.js";
import type {
  CalculatorValue,
  GameState,
  Key,
  PrimeFactorTerm,
  RationalPrimeFactorization,
  RationalValue,
  RollEntry,
  BinarySlot,
  Slot,
  SlotOperator,
  UnlockDefinition,
  UnlockEffect,
} from "../../domain/types.js";

export type KeyVisualGroup = "value_expression" | "slot_operator" | "utility" | "memory" | "step" | "settings" | "visualizers" | "execution";

export type UnlockRowState = "not_completed" | "completed" | "impossible";

export type UnlockCriterionVm = {
  label: string;
  checked: boolean;
};

export type UnlockRowVm = {
  id: string;
  name: string;
  state: UnlockRowState;
  criteria: UnlockCriterionVm[];
  difficulty?: "difficult";
  difficultyLabel?: "Difficult";
};

export type ChecklistVisibilityPolicy = {
  showCompletedAlways: boolean;
  showUnknown: boolean;
  showTodo: boolean;
  hideBlocked: boolean;
};

export type ChecklistVisibleRowVm = UnlockRowVm & {
  analysisStatus?: UnlockSpecStatus;
  visibilityReason?: string;
};

export type RollRow = {
  prefix: string;
  value: string;
  remainder?: string;
  errorCode?: string;
};

export type RollViewModel = {
  rows: RollRow[];
  isVisible: boolean;
  lineCount: number;
  valueColumnChars: number;
};

export type FeedTableRow = {
  x: number;
  yText: string;
  rText?: string;
  hasRemainder: boolean;
  hasError: boolean;
};

export type FeedTableViewModel = {
  rows: FeedTableRow[];
  showRColumn: boolean;
  xWidth: number;
  yWidth: number;
  rWidth: number;
};

export type AlgebraicMainLineSource = "builder_unsimplified" | "roll_simplified" | "roll_literal";

export type AlgebraicViewModel = {
  seedLine: string;
  recurrenceLine: string;
  mainLine: string;
  mainLineSource: AlgebraicMainLineSource;
  hasIncompleteDraft: boolean;
  containsEuclidLiteral: boolean;
  recurrenceExpressionText: string;
};

export type LocalGrowthOrder = "constant" | "linear" | "quadratic" | "exponential" | "radical" | "logarithmic" | "unknown";

export type FactorizationPanelViewModel = {
  seedLabel: string;
  currentLabel: string;
  growthLabel: string;
  transientLabel?: string;
  cycleLabel?: string;
  growthOrder: LocalGrowthOrder;
  cycleDetected: boolean;
};

const FEED_MAX_VISIBLE_ROWS = 7;
const FEED_FIXED_COLUMN_WIDTH = 5;
const MAX_UNLOCKED_TOTAL_DIGITS = 12;
const FACTORIZATION_EMPTY = "\u2205";
const GROWTH_WINDOW_SIZE = 5;
const GROWTH_AICC_DELTA_THRESHOLD = 2;
const EPSILON = 1e-12;
const POWER_MIN_P = 0.05;
const POWER_MAX_P = 0.95;
const POWER_STEP = 0.05;

const isZeroRational = (value: CalculatorValue): boolean =>
  value.kind === "rational" && value.value.num === 0n && value.value.den === 1n;

const hasAnyKeyPress = (state: GameState): boolean =>
  Object.values(state.keyPressCounts).some((count) => (count ?? 0) > 0);

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

const classifyLocalGrowthOrder = (state: GameState): LocalGrowthOrder => {
  const targetIndex = resolveGrowthTargetIndex(state);
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
  if (absRationalGreaterThanOne(r1First) && r1Values.every((value) => rationalsEqual(value, r1First))) {
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

const buildSeedFactorizationLabel = (state: GameState): string => {
  const seedValue = state.calculator.rollEntries.length > 0
    ? state.calculator.rollEntries[0]?.y
    : state.calculator.total;
  if (!seedValue) {
    return `f₀ = ${FACTORIZATION_EMPTY}`;
  }
  if (seedValue.kind === "nan") {
    return `f₀ = ${FACTORIZATION_EMPTY}`;
  }
  if (seedValue.kind === "rational" && seedValue.value.num === 0n) {
    return `f₀ = ${FACTORIZATION_EMPTY}`;
  }
  return `f₀ = ${formatFactorization(getRollYPrimeFactorization(seedValue))}`;
};

const buildCurrentFactorizationLabel = (state: GameState): string => {
  const latest = state.calculator.rollEntries.at(-1);
  return `fₙ = ${formatFactorization(latest?.factorization)}`;
};

export const buildFactorizationPanelViewModel = (state: GameState): FactorizationPanelViewModel => {
  const growthOrder = classifyLocalGrowthOrder(state);
  const cycle = state.calculator.rollAnalysis.stopReason === "cycle" ? state.calculator.rollAnalysis.cycle : null;
  const cycleDetected = Boolean(cycle);
  const growthLabel = cycleDetected ? `O(f_\u03BC) = ${growthOrder}` : `O(f) = ${growthOrder}`;
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

export const formatOperatorForDisplay = (operator: SlotOperator): string =>
  getOperatorInlineFaceLabel(operator);

export const formatOperatorForOperationSlotDisplay = (operator: SlotOperator): string =>
  getOperatorSlotFaceLabel(operator);

const isEuclidLiteralOperator = (operator: SlotOperator): boolean => {
  const operatorId = resolveKeyId(operator);
  return operatorId === KEY_ID.op_euclid_div || operatorId === KEY_ID.op_mod;
};

const formatAlgebraicOperator = (operator: SlotOperator): string =>
  getOperatorAlgebraicFaceLabel(operator);

const formatUnarySlotOperator = (operator: Extract<Slot, { kind: "unary" }>["operator"]): string =>
  getOperatorSlotFaceLabel(operator);

export const formatKeyLabel = (key: Key): string => getKeyButtonFaceLabel(key);

export const getKeyVisualGroup = (key: Key): KeyVisualGroup => {
  if (isDigitKeyId(key)) {
    return "value_expression";
  }
  if (getButtonDefinition(toLegacyKey(resolveKeyId(key)))?.unlockGroup === "unaryOperators") {
    return "slot_operator";
  }
  if (isBinaryOperatorKeyId(key)) {
    return "slot_operator";
  }
  if (key === KEY_ID.util_clear_all || key === KEY_ID.util_clear_entry || key === KEY_ID.util_undo || key === KEY_ID.util_backspace) {
    return "utility";
  }
  if (getButtonDefinition(toLegacyKey(resolveKeyId(key)))?.category === "settings") {
    return "settings";
  }
  if (getButtonDefinition(toLegacyKey(resolveKeyId(key)))?.category === "memory") {
    return "memory";
  }
  if (getButtonDefinition(toLegacyKey(resolveKeyId(key)))?.behaviorKind === "visualizer") {
    return "visualizers";
  }
  return "execution";
};

export const buildOperationSlotDisplay = (state: GameState): string => {
  const visibleSlots = state.unlocks.maxSlots;
  if (visibleSlots <= 0) {
    return "(no operation slots)";
  }

  const filledTokens = state.calculator.operationSlots.map(
    (slot) => slot.kind === "unary"
      ? `[ ${formatUnarySlotOperator(slot.operator)} ]`
      : `[ ${formatOperatorForOperationSlotDisplay(slot.operator)} ${typeof slot.operand === "bigint" ? slot.operand.toString() : expressionToDisplayString(slotOperandToExpression(slot.operand))} ]`,
  );
  if (state.calculator.draftingSlot) {
    const operand = state.calculator.draftingSlot.operandInput
      ? `${state.calculator.draftingSlot.isNegative ? "-" : ""}${state.calculator.draftingSlot.operandInput}`
      : state.calculator.draftingSlot.isNegative
        ? "-_"
        : "_";
    filledTokens.push(`[ ${formatOperatorForOperationSlotDisplay(state.calculator.draftingSlot.operator)} ${operand} ]`);
  }

  const tokens = filledTokens.slice(0, visibleSlots);
  while (tokens.length < visibleSlots) {
    tokens.push("[ _ _ ]");
  }

  return tokens.join(" -> ");
};

const resolveSeedValueForAlgebra = (state: GameState): CalculatorValue | null => {
  if (state.calculator.rollEntries.length > 0) {
    return getSeedRow(state.calculator.rollEntries)?.y ?? null;
  }

  const noSeedEnteredYet =
    isZeroRational(state.calculator.total)
    && !state.calculator.pendingNegativeTotal
    && state.calculator.rollEntries.length === 0
    && state.calculator.operationSlots.length === 0
    && state.calculator.draftingSlot === null
    && (state.calculator.singleDigitInitialTotalEntry || !hasAnyKeyPress(state));
  if (noSeedEnteredYet) {
    return null;
  }

  return state.calculator.total;
};

const normalizeDraftOperandText = (drafting: NonNullable<GameState["calculator"]["draftingSlot"]>): { value: string; incomplete: boolean } => {
  if (drafting.operandInput === "") {
    return { value: "_", incomplete: true };
  }
  const signedValue = `${drafting.isNegative ? "-" : ""}${drafting.operandInput}`;
  return { value: signedValue, incomplete: false };
};

const toExpressionOperandText = (operand: BinarySlot["operand"]): string =>
  typeof operand === "bigint" ? operand.toString() : expressionToDisplayString(slotOperandToExpression(operand));

export const buildFunctionRecurrenceDisplay = (
  state: GameState,
): { line: string; hasIncompleteDraft: boolean; containsEuclidLiteral: boolean; expressionText: string } => {
  let displayAccumulator = "f_n";
  let expressionAccumulator = "f_n";
  let hasIncompleteDraft = false;
  let containsEuclidLiteral = false;

  for (const slot of state.calculator.operationSlots) {
    if (!("operand" in slot)) {
      const unaryDisplay = formatUnarySlotOperator(slot.operator);
      displayAccumulator = `(${displayAccumulator} ${unaryDisplay})`;
      expressionAccumulator = `(${expressionAccumulator}${slot.operator})`;
      continue;
    }
    const operandText = toExpressionOperandText(slot.operand);
    const displayOperator = formatAlgebraicOperator(slot.operator);
    displayAccumulator = `(${displayAccumulator} ${displayOperator} ${operandText})`;
    expressionAccumulator = `(${expressionAccumulator}${slot.operator}${operandText})`;
    containsEuclidLiteral = containsEuclidLiteral || isEuclidLiteralOperator(slot.operator);
  }

  if (state.calculator.draftingSlot) {
    const draftOperand = normalizeDraftOperandText(state.calculator.draftingSlot);
    const displayOperator = formatAlgebraicOperator(state.calculator.draftingSlot.operator);
    displayAccumulator = `(${displayAccumulator} ${displayOperator} ${draftOperand.value})`;
    expressionAccumulator = `(${expressionAccumulator}${state.calculator.draftingSlot.operator}${draftOperand.value})`;
    hasIncompleteDraft = draftOperand.incomplete;
    containsEuclidLiteral = containsEuclidLiteral || isEuclidLiteralOperator(state.calculator.draftingSlot.operator);
  }

  return {
    line: `f_{n+1} = ${displayAccumulator}`,
    hasIncompleteDraft,
    containsEuclidLiteral,
    expressionText: expressionAccumulator,
  };
};

export const buildAlgebraicViewModel = (state: GameState): AlgebraicViewModel => {
  const seedValue = resolveSeedValueForAlgebra(state);
  const seedLine = seedValue ? `f_0 = ${calculatorValueToDisplayString(seedValue)}` : "f_0 = _";
  const recurrence = buildFunctionRecurrenceDisplay(state);
  const preRollMain = recurrence.line;

  if (state.calculator.rollEntries.length === 0) {
    return {
      seedLine,
      recurrenceLine: recurrence.line,
      mainLine: preRollMain,
      mainLineSource: "builder_unsimplified",
      hasIncompleteDraft: recurrence.hasIncompleteDraft,
      containsEuclidLiteral: recurrence.containsEuclidLiteral,
      recurrenceExpressionText: recurrence.expressionText,
    };
  }

  if (recurrence.containsEuclidLiteral) {
    return {
      seedLine,
      recurrenceLine: recurrence.line,
      mainLine: preRollMain,
      mainLineSource: "roll_literal",
      hasIncompleteDraft: recurrence.hasIncompleteDraft,
      containsEuclidLiteral: recurrence.containsEuclidLiteral,
      recurrenceExpressionText: recurrence.expressionText,
    };
  }

  const latestRelevantSymbolic = [...state.calculator.rollEntries]
    .reverse()
    .find((entry) => entry.symbolic?.exprText === recurrence.expressionText);

  if (!latestRelevantSymbolic?.symbolic) {
    return {
      seedLine,
      recurrenceLine: recurrence.line,
      mainLine: preRollMain,
      mainLineSource: "builder_unsimplified",
      hasIncompleteDraft: recurrence.hasIncompleteDraft,
      containsEuclidLiteral: recurrence.containsEuclidLiteral,
      recurrenceExpressionText: recurrence.expressionText,
    };
  }

  return {
    seedLine,
    recurrenceLine: recurrence.line,
    mainLine: latestRelevantSymbolic.symbolic.renderText,
    mainLineSource: "roll_simplified",
    hasIncompleteDraft: recurrence.hasIncompleteDraft,
    containsEuclidLiteral: recurrence.containsEuclidLiteral,
    recurrenceExpressionText: recurrence.expressionText,
  };
};

export const buildRollLines = (rollEntries: RollEntry[]): string[] =>
  rollEntries.map((entry) => calculatorValueToDisplayString(entry.y));

const calculatorValueToFeedText = (value: CalculatorValue): string =>
  calculatorValueToDisplayString(value);

export const buildFeedTableRows = (
  rollEntries: RollEntry[],
): FeedTableRow[] => {
  const rows: FeedTableRow[] = [];
  const seedRow = getSeedRow(rollEntries);
  if (seedRow) {
    rows.push({
      x: 0,
      yText: calculatorValueToFeedText(seedRow.y),
      hasRemainder: false,
      hasError: false,
    });
  }
  const stepRows = getStepRows(rollEntries);
  for (let index = 0; index < stepRows.length; index += 1) {
    const entry = stepRows[index];
    const hasError = Boolean(entry.error);
    const hasRemainder = Boolean(entry.remainder) && !hasError;
    rows.push({
      x: index + 1,
      yText: calculatorValueToFeedText(entry.y),
      ...(hasRemainder ? { rText: toPreferredFractionString(entry.remainder!) } : {}),
      hasRemainder,
      hasError,
    });
  }
  return rows;
};

export const buildFeedTableViewModel = (
  rollEntries: RollEntry[],
  unlockedTotalDigits: number = 1,
): FeedTableViewModel => {
  const rows = buildFeedTableRows(rollEntries);
  const visibleRows = rows.slice(-FEED_MAX_VISIBLE_ROWS);
  const showRColumn = visibleRows.some((row) => row.hasRemainder);
  const yWidth = Math.max(1, Math.min(MAX_UNLOCKED_TOTAL_DIGITS, Math.trunc(unlockedTotalDigits)));
  return {
    rows: visibleRows,
    showRColumn,
    xWidth: FEED_FIXED_COLUMN_WIDTH,
    yWidth,
    rWidth: FEED_FIXED_COLUMN_WIDTH,
  };
};

export const buildRollRows = (
  rollEntries: RollEntry[],
): RollRow[] => {
  const rollLines = buildRollLines(rollEntries);
  const rows: RollRow[] = [];
  let previousVisibleErrorCode: string | undefined;
  for (let index = 0; index < rollEntries.length; index += 1) {
    const entry = rollEntries[index];
    const errorCode = entry.error?.code;
    if (errorCode && errorCode === previousVisibleErrorCode) {
      continue;
    }
    const remainder = entry.remainder ? toPreferredFractionString(entry.remainder) : undefined;
    rows.push({
      prefix: rows.length === 0 ? "X =" : "  =",
      value: errorCode ? "" : rollLines[index],
      remainder: errorCode ? undefined : remainder,
      errorCode,
    });
    previousVisibleErrorCode = errorCode;
  }
  return rows;
};

export const buildRollViewModel = (
  rollEntries: RollEntry[],
): RollViewModel => {
  const rows = buildRollRows(rollEntries);
  const valueColumnChars = rows.reduce((max, row) => {
    const suffixLength = row.errorCode
      ? `Err: ${row.errorCode}`.length
      : row.remainder
        ? `\u27E1= ${row.remainder}`.length
        : 0;
    return Math.max(max, row.value.length, suffixLength);
  }, 0);
  return {
    rows,
    isVisible: rows.length > 0,
    lineCount: rows.length,
    valueColumnChars,
  };
};

const getUnlockName = (effect: UnlockEffect): string => {
  if (effect.type === "unlock_digit") {
    return effect.key;
  }
  if (effect.type === "unlock_slot_operator") {
    return formatOperatorForDisplay(effect.key);
  }
  if (effect.type === "unlock_execution") {
    return effect.key;
  }
  if (effect.type === "unlock_visualizer") {
    return effect.key;
  }
  if (effect.type === "unlock_utility") {
    return effect.key;
  }
  if (effect.type === "unlock_memory") {
    return effect.key;
  }
  if (effect.type === "increase_max_total_digits") {
    return "maxTotalDigits";
  }
  if (effect.type === "increase_allocator_max_points") {
    return "λ++";
  }
  if (effect.type === "upgrade_keypad_column") {
    return "keypadCols";
  }
  if (effect.type === "upgrade_keypad_row") {
    return "keypadRows";
  }
  if (effect.type === "move_key_to_coord") {
    return `${formatKeyLabel(effect.key)}->R${effect.row.toString()}C${effect.col.toString()}`;
  }
  return "unknown";
};

const isUnlockImpossible = (_unlock: UnlockDefinition, _state: GameState): boolean => false;

const DEFAULT_CHECKLIST_VISIBILITY_POLICY: ChecklistVisibilityPolicy = {
  showCompletedAlways: true,
  showUnknown: true,
  showTodo: true,
  hideBlocked: true,
};

type BaseChecklistRowVm = {
  row: UnlockRowVm;
  completed: boolean;
  difficulty: "normal" | "difficult";
};

const buildBaseChecklistRows = (
  state: GameState,
  catalog: UnlockDefinition[],
): BaseChecklistRowVm[] =>
  catalog.map((unlock) => {
    const completed = state.completedUnlockIds.includes(unlock.id);
    const criteria = buildUnlockCriteria(unlock.predicate, state);
    return {
      completed,
      row: {
        id: unlock.id,
        name: getUnlockName(unlock.effect),
        state: completed ? "completed" : "not_completed",
        criteria: completed ? criteria.map((criterion) => ({ ...criterion, checked: true })) : criteria,
        difficulty: unlock.difficulty === "difficult" ? "difficult" : undefined,
        difficultyLabel: unlock.difficulty === "difficult" ? "Difficult" : undefined,
      },
      difficulty: unlock.difficulty ?? "normal",
    };
  });

const getChecklistVisibilityDecision = (
  status: UnlockSpecStatus | null,
  completed: boolean,
  policy: ChecklistVisibilityPolicy,
): { visible: boolean; reason: string } => {
  if (completed && policy.showCompletedAlways) {
    return { visible: true, reason: "completed_row_always_visible" };
  }
  if (status === "satisfied" || status === "possible") {
    return { visible: true, reason: "status_attemptable" };
  }
  if (status === "unknown" && policy.showUnknown) {
    return { visible: true, reason: "status_unknown_visible_by_policy" };
  }
  if (status === "todo" && policy.showTodo) {
    return { visible: true, reason: "status_todo_visible_by_policy" };
  }
  if (status === "blocked" && policy.hideBlocked) {
    return { visible: false, reason: "status_blocked_hidden_by_policy" };
  }
  if (status === null) {
    return { visible: true, reason: "missing_analysis_row_fails_open" };
  }
  return { visible: true, reason: "default_visible_fallback" };
};

export type BuildVisibleChecklistRowsOptions = {
  catalog?: UnlockDefinition[];
  visibilityPolicy?: Partial<ChecklistVisibilityPolicy>;
  includeDebugMeta?: boolean;
};

export const buildVisibleChecklistRows = (
  state: GameState,
  options: BuildVisibleChecklistRowsOptions = {},
): ChecklistVisibleRowVm[] => {
  const catalog = options.catalog ?? unlockCatalog;
  const visibilityPolicy: ChecklistVisibilityPolicy = {
    ...DEFAULT_CHECKLIST_VISIBILITY_POLICY,
    ...(options.visibilityPolicy ?? {}),
  };
  const includeDebugMeta = options.includeDebugMeta ?? false;

  const keypadScopeRowsById = new Map(
    analyzeUnlockSpecRows(state, { capabilityScope: "present_on_keypad" }, catalog).map((row) => [row.unlockId, row]),
  );
  const unlockedScopeRowsById = new Map(
    analyzeUnlockSpecRows(state, { capabilityScope: "all_unlocked" }, catalog).map((row) => [row.unlockId, row]),
  );
  const baseRows = buildBaseChecklistRows(state, catalog);

  const visibleRows: ChecklistVisibleRowVm[] = [];
  for (const base of baseRows) {
    const specRow =
      base.difficulty === "difficult"
        ? unlockedScopeRowsById.get(base.row.id)
        : keypadScopeRowsById.get(base.row.id);
    const status = specRow?.status ?? null;
    const decision = getChecklistVisibilityDecision(status, base.completed, visibilityPolicy);
    if (!decision.visible) {
      continue;
    }
    if (includeDebugMeta) {
      visibleRows.push({
        ...base.row,
        analysisStatus: status ?? undefined,
        visibilityReason: decision.reason,
      });
    } else {
      visibleRows.push(base.row);
    }
  }

  const pending = visibleRows.filter((row) => row.state === "not_completed");
  const completed = visibleRows.filter((row) => row.state === "completed");
  return [...pending, ...completed];
};

export const buildUnlockRows = (
  state: GameState,
  catalog: UnlockDefinition[] = unlockCatalog,
  impossibleCheck: (unlock: UnlockDefinition, state: GameState) => boolean = isUnlockImpossible,
): UnlockRowVm[] => {
  const visibleRowsById = new Map(buildVisibleChecklistRows(state, { catalog }).map((row) => [row.id, row]));
  const rows: UnlockRowVm[] = [];
  for (const unlock of catalog) {
    const impossible = impossibleCheck(unlock, state);
    const visibleRow = visibleRowsById.get(unlock.id);
    if (impossible || !visibleRow) {
      rows.push({
        id: unlock.id,
        name: getUnlockName(unlock.effect),
        state: "impossible",
        criteria: [],
      });
      continue;
    }
    rows.push(visibleRow);
  }
  const visible = rows.filter((row) => row.state !== "impossible");
  const pending = visible.filter((row) => row.state === "not_completed");
  const completed = visible.filter((row) => row.state === "completed");
  return [...pending, ...completed];
};




