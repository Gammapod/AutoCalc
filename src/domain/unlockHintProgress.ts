import { getAppServices } from "../contracts/appServices.js";
import { isInteger } from "../infra/math/rationalEngine.js";
import { isRationalCalculatorValue } from "./calculatorValue.js";
import { classifyLocalGrowthOrder } from "./rollGrowthOrder.js";
import { evaluateUnlockPredicate } from "./unlockEngine.js";
import type { GameState, UnlockDefinition, UnlockPredicate } from "./types.js";

export type UnlockHintProgressMode = "partial" | "binary";
export type UnlockHintBinaryState = "observed" | "not_observed";

export type UnlockHintPartialProgress = {
  mode: "partial";
  progress01: number;
  current: number;
  target: number;
};

export type UnlockHintBinaryProgress = {
  mode: "binary";
  state: UnlockHintBinaryState;
};

export type UnlockHintProgress = UnlockHintPartialProgress | UnlockHintBinaryProgress;

export type UnlockHintProgressRow = {
  unlockId: string;
  predicateType: UnlockPredicate["type"];
  progressMode: UnlockHintProgressMode;
  eligibleForHint: boolean;
  progress: UnlockHintProgress;
};

type PartialAdapterResult = {
  current: number;
  target: number;
  progress01: number;
};

export type CatalogProgressCoverage = {
  usedPredicateTypes: UnlockPredicate["type"][];
  missingPredicateTypes: UnlockPredicate["type"][];
};

const BINARY_ONLY_PREDICATE_TYPES = new Set<UnlockPredicate["type"]>([
  "total_equals",
  "roll_cycle_period_at_least",
  "roll_cycle_transient_at_least",
  "roll_cycle_diameter_at_least",
  "roll_cycle_is_opposite_pair",
]);

const PARTIAL_PROGRESS_PREDICATE_TYPES = new Set<UnlockPredicate["type"]>([
  "completed_unlock_id_seen",
  "roll_ends_with_constant_step_run",
  "roll_ends_with_growth_order_run",
  "total_at_least",
  "roll_length_at_least",
  "any_error_seen",
  "roll_contains_domain_type",
  "roll_tail_powers_of_two_run",
]);

const isFiniteNumber = (value: number): boolean => Number.isFinite(value);

const clamp01 = (value: number): number => {
  if (!isFiniteNumber(value)) {
    return value > 0 ? 1 : 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
};

const normalizePartialProgress = (current: number, target: number): PartialAdapterResult => {
  const safeTarget = isFiniteNumber(target) && target > 0 ? target : 1;
  const safeCurrent = isFiniteNumber(current) && current >= 0 ? current : 0;
  return {
    current: safeCurrent,
    target: safeTarget,
    progress01: clamp01(safeCurrent / safeTarget),
  };
};

const isPositivePowerOfTwoIntegerValue = (stateValue: GameState["calculator"]["total"]): boolean => {
  if (!isRationalCalculatorValue(stateValue) || stateValue.value.den !== 1n) {
    return false;
  }
  const num = stateValue.value.num;
  return num > 0n && (num & (num - 1n)) === 0n;
};

const readIntegerTail = (state: GameState, length: number): bigint[] | null => {
  if (length <= 0 || state.calculator.rollEntries.length < length) {
    return null;
  }
  const tail = state.calculator.rollEntries.slice(-length);
  const values: bigint[] = [];
  for (const entry of tail) {
    if (!isRationalCalculatorValue(entry.y) || !isInteger(entry.y.value)) {
      return null;
    }
    values.push(entry.y.value.num);
  }
  return values;
};

const satisfiesConstantStepRun = (
  values: bigint[],
  predicate: Extract<UnlockPredicate, { type: "roll_ends_with_constant_step_run" }>,
): boolean => {
  if (values.length < 2) {
    return false;
  }
  const step = values[1] - values[0];
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] - values[index - 1] !== step) {
      return false;
    }
  }
  const absStep = step < 0n ? -step : step;
  if (predicate.minAbsStep != null && absStep < predicate.minAbsStep) {
    return false;
  }
  if (predicate.requirePositiveStep && step <= 0n) {
    return false;
  }
  if (predicate.requireNegativeStep && step >= 0n) {
    return false;
  }
  if (predicate.endValue != null && values[values.length - 1] !== predicate.endValue) {
    return false;
  }
  return true;
};

const getRollLengthAtLeastPartial = (
  state: GameState,
  predicate: Extract<UnlockPredicate, { type: "roll_length_at_least" }>,
): PartialAdapterResult =>
  normalizePartialProgress(state.calculator.rollEntries.length, predicate.length);

const getTotalAtLeastPartial = (
  state: GameState,
  predicate: Extract<UnlockPredicate, { type: "total_at_least" }>,
): PartialAdapterResult => {
  if (!isRationalCalculatorValue(state.calculator.total)) {
    return normalizePartialProgress(0, 1);
  }
  const target = Number(predicate.value);
  if (!isFiniteNumber(target) || target <= 0) {
    const observed = evaluateUnlockPredicate(predicate, state);
    return normalizePartialProgress(observed ? 1 : 0, 1);
  }
  const current = Number(state.calculator.total.value.num) / Number(state.calculator.total.value.den);
  return normalizePartialProgress(current, target);
};

const getAnyErrorSeenPartial = (state: GameState): PartialAdapterResult => {
  const errorCount = state.calculator.rollEntries.filter((entry) => Boolean(entry.error)).length;
  return normalizePartialProgress(errorCount, 1);
};

const getCompletedUnlockSeenPartial = (
  state: GameState,
  predicate: Extract<UnlockPredicate, { type: "completed_unlock_id_seen" }>,
): PartialAdapterResult =>
  normalizePartialProgress(state.completedUnlockIds.includes(predicate.unlockId) ? 1 : 0, 1);

const getRollContainsDomainTypePartial = (
  state: GameState,
  predicate: Extract<UnlockPredicate, { type: "roll_contains_domain_type" }>,
): PartialAdapterResult => {
  const matches = state.calculator.rollEntries.filter((entry) => {
    if (!isRationalCalculatorValue(entry.y)) {
      return false;
    }
    if (entry.y.value.den !== 1n) {
      return predicate.domainType === "rational_non_integer";
    }
    if (entry.y.value.num > 0n) {
      return predicate.domainType === "natural";
    }
    return predicate.domainType === "non_positive_integer";
  }).length;
  return normalizePartialProgress(matches, 1);
};

const getRollTailPowersOfTwoPartial = (
  state: GameState,
  predicate: Extract<UnlockPredicate, { type: "roll_tail_powers_of_two_run" }>,
): PartialAdapterResult => {
  let runLength = 0;
  for (let index = state.calculator.rollEntries.length - 1; index >= 0; index -= 1) {
    if (!isPositivePowerOfTwoIntegerValue(state.calculator.rollEntries[index]!.y)) {
      break;
    }
    runLength += 1;
  }
  return normalizePartialProgress(runLength, predicate.length);
};

const getConstantStepRunPartial = (
  state: GameState,
  predicate: Extract<UnlockPredicate, { type: "roll_ends_with_constant_step_run" }>,
): PartialAdapterResult => {
  const maxLength = Math.min(state.calculator.rollEntries.length, predicate.length);
  let best = 0;
  for (let candidate = maxLength; candidate >= 2; candidate -= 1) {
    const values = readIntegerTail(state, candidate);
    if (!values) {
      continue;
    }
    if (satisfiesConstantStepRun(values, predicate)) {
      best = candidate;
      break;
    }
  }
  if (best === 0 && maxLength > 0) {
    const last = state.calculator.rollEntries[state.calculator.rollEntries.length - 1];
    if (last && isRationalCalculatorValue(last.y) && isInteger(last.y.value)) {
      best = 1;
    }
  }
  return normalizePartialProgress(best, predicate.length);
};

const getGrowthOrderRunPartial = (
  state: GameState,
  predicate: Extract<UnlockPredicate, { type: "roll_ends_with_growth_order_run" }>,
): PartialAdapterResult => {
  let consecutive = 0;
  for (let index = state.calculator.rollEntries.length - 1; index >= 1; index -= 1) {
    if (classifyLocalGrowthOrder(state, index) !== predicate.order) {
      break;
    }
    consecutive += 1;
  }
  return normalizePartialProgress(consecutive, predicate.length);
};

const resolvePredicateProgressMode = (type: UnlockPredicate["type"]): UnlockHintProgressMode | null => {
  if (BINARY_ONLY_PREDICATE_TYPES.has(type)) {
    return "binary";
  }
  if (PARTIAL_PROGRESS_PREDICATE_TYPES.has(type)) {
    return "partial";
  }
  return null;
};

export const getPredicateProgressMode = (type: UnlockPredicate["type"]): UnlockHintProgressMode | null =>
  resolvePredicateProgressMode(type);

const getPartialProgress = (state: GameState, predicate: UnlockPredicate): PartialAdapterResult => {
  if (predicate.type === "roll_length_at_least") {
    return getRollLengthAtLeastPartial(state, predicate);
  }
  if (predicate.type === "total_at_least") {
    return getTotalAtLeastPartial(state, predicate);
  }
  if (predicate.type === "any_error_seen") {
    return getAnyErrorSeenPartial(state);
  }
  if (predicate.type === "completed_unlock_id_seen") {
    return getCompletedUnlockSeenPartial(state, predicate);
  }
  if (predicate.type === "roll_contains_domain_type") {
    return getRollContainsDomainTypePartial(state, predicate);
  }
  if (predicate.type === "roll_tail_powers_of_two_run") {
    return getRollTailPowersOfTwoPartial(state, predicate);
  }
  if (predicate.type === "roll_ends_with_constant_step_run") {
    return getConstantStepRunPartial(state, predicate);
  }
  if (predicate.type === "roll_ends_with_growth_order_run") {
    return getGrowthOrderRunPartial(state, predicate);
  }
  throw new Error(`Missing partial-progress adapter for predicate type: ${predicate.type}`);
};

export const deriveCatalogProgressCoverage = (
  catalog: UnlockDefinition[] = getAppServices().contentProvider.unlockCatalog,
): CatalogProgressCoverage => {
  const usedPredicateTypesSet = new Set<UnlockPredicate["type"]>();
  for (const unlock of catalog) {
    usedPredicateTypesSet.add(unlock.predicate.type);
  }
  const usedPredicateTypes = [...usedPredicateTypesSet];
  const missingPredicateTypes = usedPredicateTypes.filter((type) => resolvePredicateProgressMode(type) == null);
  return {
    usedPredicateTypes,
    missingPredicateTypes,
  };
};

export const deriveCatalogPartialProgressPredicateTypes = (
  catalog: UnlockDefinition[] = getAppServices().contentProvider.unlockCatalog,
): UnlockPredicate["type"][] => {
  const types = new Set<UnlockPredicate["type"]>();
  for (const unlock of catalog) {
    if (resolvePredicateProgressMode(unlock.predicate.type) === "partial") {
      types.add(unlock.predicate.type);
    }
  }
  return [...types].sort();
};

export const assertCatalogPredicateProgressCoverage = (
  catalog: UnlockDefinition[] = getAppServices().contentProvider.unlockCatalog,
): void => {
  const coverage = deriveCatalogProgressCoverage(catalog);
  if (coverage.missingPredicateTypes.length > 0) {
    throw new Error(`Missing progress-mode classification for predicate types: ${coverage.missingPredicateTypes.join(", ")}`);
  }
};

const toUnlockHintProgress = (state: GameState, unlock: UnlockDefinition): UnlockHintProgressRow => {
  const progressMode = resolvePredicateProgressMode(unlock.predicate.type);
  if (!progressMode) {
    throw new Error(`Missing progress-mode classification for predicate type: ${unlock.predicate.type}`);
  }
  const completed = state.completedUnlockIds.includes(unlock.id);
  const observed = evaluateUnlockPredicate(unlock.predicate, state);
  let progress: UnlockHintProgress;
  if (progressMode === "binary") {
    progress = {
      mode: "binary",
      state: observed ? "observed" : "not_observed",
    };
  } else {
    const partial = getPartialProgress(state, unlock.predicate);
    progress = {
      mode: "partial",
      progress01: clamp01(partial.progress01),
      current: partial.current,
      target: partial.target,
    };
  }
  return {
    unlockId: unlock.id,
    predicateType: unlock.predicate.type,
    progressMode,
    eligibleForHint: !completed && !observed,
    progress,
  };
};

export const projectUnlockHintProgressRows = (
  state: GameState,
  catalog: UnlockDefinition[] = getAppServices().contentProvider.unlockCatalog,
): UnlockHintProgressRow[] => {
  assertCatalogPredicateProgressCoverage(catalog);
  return catalog.map((unlock) => toUnlockHintProgress(state, unlock));
};

export const projectEligibleUnlockHintProgressRows = (
  state: GameState,
  catalog: UnlockDefinition[] = getAppServices().contentProvider.unlockCatalog,
): UnlockHintProgressRow[] =>
  projectUnlockHintProgressRows(state, catalog).filter((row) => row.eligibleForHint);
