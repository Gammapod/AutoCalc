import { getAppServices } from "../contracts/appServices.js";
import { isInteger } from "../infra/math/rationalEngine.js";
import { isRationalCalculatorValue } from "./calculatorValue.js";
import { classifyLocalGrowthOrder } from "./rollGrowthOrder.js";
import { evaluateUnlockPredicate } from "./unlockEngine.js";
import type { GameState, UnlockDefinition, UnlockPredicate } from "./types.js";

export type UnlockHintProgressMode = "partial" | "binary";
export type UnlockHintBinaryState = "observed" | "not_observed";

type HintTemplate = {
  templateId: string;
  text: string;
};

type HintTokenValue = number | string;

export type UnlockHintPayload = {
  templateId: string;
  text: string;
  tokens: Record<string, HintTokenValue>;
};

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
  hint: UnlockHintPayload;
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
  missingHintUnlockIds: string[];
};

const BINARY_ONLY_PREDICATE_TYPES = new Set<UnlockPredicate["type"]>([
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

const REDACTED_HINT_TEMPLATES_BY_UNLOCK_ID: Record<string, HintTemplate> = {
  unlock_4_on_linear_growth_run_7: { templateId: "hint.roll.pattern_linear", text: "Build a stable growth pattern across recent rolls." },
  unlock_plus_on_linear_growth_run_7: { templateId: "hint.roll.pattern_linear", text: "Build a stable growth pattern across recent rolls." },
  unlock_mul_on_positive_constant_step_run_7: { templateId: "hint.roll.pattern_step", text: "Aim for a repeatable step pattern in recent roll results." },
  unlock_pow_on_exponential_growth_run_7: { templateId: "hint.roll.pattern_exponential", text: "Push into a stronger growth pattern over consecutive rolls." },
  unlock_dec_on_total_at_least_10: { templateId: "hint.roll.pattern_reverse", text: "Try producing a controlled downward movement in recent results." },
  unlock_inc_on_total_at_least_10: { templateId: "hint.total.raise", text: "Increase your total steadily to open new options." },
  unlock_step_expansion_on_total_at_least_10: { templateId: "hint.total.raise", text: "Increase your total steadily to open new options." },
  unlock_minus_on_negative_total: { templateId: "hint.roll.pattern_negative", text: "Find a sequence that trends downward in a consistent way." },
  unlock_neg_on_opposite_pair_cycle: { templateId: "hint.cycle.observe", text: "Keep experimenting with loops and symmetry in roll behavior." },
  unlock_c_on_first_error: { templateId: "hint.error.observe", text: "Observe a run outcome that triggers an error state." },
  unlock_div_on_negative_step_run_to_zero: { templateId: "hint.roll.pattern_targeted", text: "Steer a consistent downward pattern toward a specific landing point." },
  unlock_euclid_div_on_first_rational_result: { templateId: "hint.domain.rational", text: "Create a non-integer result in the roll history." },
  unlock_calculator_g_on_tail_powers_of_two_run_7: { templateId: "hint.roll.pattern_power2", text: "Build a tail sequence that stays in one numeric family." },
  award_lambda_to_f_on_transient_length_gt_10: { templateId: "hint.cycle.observe", text: "Explore longer runs and observe evolving cycle behavior." },
  award_lambda_to_f_on_cycle_diameter_gt_10: { templateId: "hint.cycle.observe", text: "Explore wider cycle behavior by varying your run structure." },
  award_lambda_to_f_on_cycle_length_gt_5: { templateId: "hint.cycle.observe", text: "Experiment until recurring behavior lasts longer." },
  award_lambda_to_f_on_linear_growth_run_3_slope_gt_1: { templateId: "hint.roll.pattern_step", text: "Aim for a repeatable step pattern in recent roll results." },
  award_lambda_to_f_on_exponential_growth_run_3: { templateId: "hint.roll.pattern_exponential", text: "Push into a stronger growth pattern over consecutive rolls." },
  award_lambda_to_g_on_binary_add_result_1: { templateId: "hint.binary.observe", text: "Try binary-mode actions and watch for key milestone outcomes." },
  award_lambda_to_g_on_binary_mul_result_0: { templateId: "hint.binary.observe", text: "Try binary-mode actions and watch for key milestone outcomes." },
  unlock_memory_plus_on_first_lambda_awarded: { templateId: "hint.lambda.progression", text: "Advance allocator progression milestones to unlock memory tools." },
  unlock_memory_minus_on_first_lambda_spent: { templateId: "hint.lambda.progression", text: "Advance allocator progression milestones to unlock memory tools." },
  unlock_viz_feed_on_roll_length_gt_20: { templateId: "hint.roll.extend", text: "Keep the run going to reach deeper progression surfaces." },
  unlock_exec_play_pause_on_roll_length_gt_40: { templateId: "hint.roll.extend", text: "Keep the run going to reach deeper progression surfaces." },
  unlock_backspace_on_c_clears_function_two_slots: { templateId: "hint.utility.observe", text: "Use utility interactions while building richer function setups." },
  unlock_undo_on_first_nan_result: { templateId: "hint.error.observe", text: "Observe a run outcome that triggers an error state." },
  unlock_roll_inverse_on_undo_while_feed_visible: { templateId: "hint.total.raise", text: "Increase your total steadily to open new options." },
  unlock_mod_on_first_cycle_length_gt_2: { templateId: "hint.cycle.observe", text: "Experiment until recurring behavior lasts longer." },
  unlock_toggle_mod_zero_to_delta_on_binary_overflow: { templateId: "hint.binary.observe", text: "Try binary-mode actions and watch for key milestone outcomes." },
};

const getHintTemplate = (unlockId: string): HintTemplate => {
  const template = REDACTED_HINT_TEMPLATES_BY_UNLOCK_ID[unlockId];
  if (!template) {
    throw new Error(`Missing redacted hint template mapping for unlock id: ${unlockId}`);
  }
  return template;
};

export const deriveCatalogProgressCoverage = (
  catalog: UnlockDefinition[] = getAppServices().contentProvider.unlockCatalog,
): CatalogProgressCoverage => {
  const usedPredicateTypesSet = new Set<UnlockPredicate["type"]>();
  const missingHintUnlockIds: string[] = [];
  for (const unlock of catalog) {
    usedPredicateTypesSet.add(unlock.predicate.type);
    if (!REDACTED_HINT_TEMPLATES_BY_UNLOCK_ID[unlock.id]) {
      missingHintUnlockIds.push(unlock.id);
    }
  }
  const usedPredicateTypes = [...usedPredicateTypesSet];
  const missingPredicateTypes = usedPredicateTypes.filter((type) => resolvePredicateProgressMode(type) == null);
  return {
    usedPredicateTypes,
    missingPredicateTypes,
    missingHintUnlockIds,
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
  if (coverage.missingHintUnlockIds.length > 0) {
    throw new Error(`Missing redacted hint mapping for unlock ids: ${coverage.missingHintUnlockIds.join(", ")}`);
  }
};

const toHintPayload = (
  unlockId: string,
  progressMode: UnlockHintProgressMode,
  progress: UnlockHintProgress,
): UnlockHintPayload => {
  const template = getHintTemplate(unlockId);
  if (progressMode === "binary") {
    const binaryProgress = progress as UnlockHintBinaryProgress;
    return {
      templateId: template.templateId,
      text: template.text,
      tokens: { state: binaryProgress.state },
    };
  }
  const partialProgress = progress as UnlockHintPartialProgress;
  return {
    templateId: template.templateId,
    text: template.text,
    tokens: {
      progress01: partialProgress.progress01,
      current: partialProgress.current,
      target: partialProgress.target,
    },
  };
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
    hint: toHintPayload(unlock.id, progressMode, progress),
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
