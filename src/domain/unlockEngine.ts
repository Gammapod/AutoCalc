import { equalsBigInt, gteBigInt, isInteger, lteBigInt } from "../infra/math/rationalEngine.js";
import { calculatorValueToDisplayString, isRationalCalculatorValue } from "./calculatorValue.js";
import { executeSlotsValue } from "./engine.js";
import { expressionToDisplayString, slotOperandToExpression } from "./expression.js";
import { getOperationSnapshot } from "./slotDrafting.js";
import { LAMBDA_SPENT_POINTS_DROPPED_TO_ZERO_SEEN_ID, OVERFLOW_ERROR_SEEN_ID } from "./state.js";
import { KEY_ID } from "./keyPresentation.js";
import type {
  GameState,
  RollContainsDomainTypePredicate,
  AllocatorReturnPressCountAtLeastPredicate,
  AllocatorAllocatePressCountAtLeastPredicate,
  DivisionByZeroErrorSeenPredicate,
  SymbolicErrorSeenPredicate,
  OverflowErrorSeenPredicate,
  KeyPressCountAtLeastPredicate,
  OperationFirstEuclidEquivalentModuloPredicate,
  OperationEqualsPredicate,
  RollEndsWithAlternatingSignConstantAbsRunPredicate,
  RollEndsWithConstantStepRunPredicate,
  RollContainsValuePredicate,
  RollEndsWithEqualRunPredicate,
  RollEndsWithIncrementingRunPredicate,
  RollEndsWithSequencePredicate,
  RollLengthAtLeastPredicate,
  TotalAtLeastPredicate,
  TotalAtMostPredicate,
  TotalMagnitudeAtLeastPredicate,
  TotalEqualsPredicate,
  KeypadKeySlotsAtLeastPredicate,
  LambdaSpentPointsDroppedToZeroSeenPredicate,
  UnlockPredicate,
} from "./types.js";

export type UnlockCriterion = {
  label: string;
  checked: boolean;
};

export type UnlockPredicateAnalysis = {
  isMet: boolean;
  criteria: UnlockCriterion[];
};

type PredicateAnalyzer<T extends UnlockPredicate> = (predicate: T, state: GameState) => UnlockPredicateAnalysis;

const getRollValues = (state: GameState): GameState["calculator"]["total"][] =>
  state.calculator.rollEntries.map((entry) => entry.y);

const getProgressiveRollSequenceMatches = (roll: GameState["calculator"]["total"][], required: bigint[]): number => {
  const maxCandidate = Math.min(roll.length, required.length);
  for (let candidate = maxCandidate; candidate >= 0; candidate -= 1) {
    const rollSuffix = roll.slice(roll.length - candidate);
    const requiredPrefix = required.slice(0, candidate);
    const isMatch = rollSuffix.every(
      (value, index) => isRationalCalculatorValue(value) && isInteger(value.value) && value.value.num === requiredPrefix[index],
    );
    if (isMatch) {
      return candidate;
    }
  }
  return 0;
};

const analyzeTotalEquals: PredicateAnalyzer<TotalEqualsPredicate> = (predicate, state) => {
  const isMet = isRationalCalculatorValue(state.calculator.total) && equalsBigInt(state.calculator.total.value, predicate.value);
  return {
    isMet,
    criteria: [{ label: predicate.value.toString(), checked: isMet }],
  };
};

const analyzeTotalAtLeast: PredicateAnalyzer<TotalAtLeastPredicate> = (predicate, state) => {
  const isMet = isRationalCalculatorValue(state.calculator.total) && gteBigInt(state.calculator.total.value, predicate.value);
  return {
    isMet,
    criteria: [{ label: predicate.value.toString(), checked: isMet }],
  };
};

const analyzeTotalAtMost: PredicateAnalyzer<TotalAtMostPredicate> = (predicate, state) => {
  const isMet = isRationalCalculatorValue(state.calculator.total) && lteBigInt(state.calculator.total.value, predicate.value);
  return {
    isMet,
    criteria: [{ label: predicate.value.toString(), checked: isMet }],
  };
};

const analyzeTotalMagnitudeAtLeast: PredicateAnalyzer<TotalMagnitudeAtLeastPredicate> = (predicate, state) => {
  const isMet =
    isRationalCalculatorValue(state.calculator.total) &&
    gteBigInt(
      {
        num:
          state.calculator.total.value.num < 0n
            ? -state.calculator.total.value.num
            : state.calculator.total.value.num,
        den: state.calculator.total.value.den,
      },
      predicate.value,
    );
  return {
    isMet,
    criteria: [{ label: `|x| >= ${predicate.value.toString()}`, checked: isMet }],
  };
};

const analyzeRollEndsWithSequence: PredicateAnalyzer<RollEndsWithSequencePredicate> = (predicate, state) => {
  const matchedCount = getProgressiveRollSequenceMatches(getRollValues(state), predicate.sequence);
  return {
    isMet: matchedCount === predicate.sequence.length,
    criteria: predicate.sequence.map((value, index) => ({
      label: value.toString(),
      checked: index < matchedCount,
    })),
  };
};

const analyzeRollContainsValue: PredicateAnalyzer<RollContainsValuePredicate> = (predicate, state) => {
  const isMet = getRollValues(state).some(
    (value) => isRationalCalculatorValue(value) && isInteger(value.value) && value.value.num === predicate.value,
  );
  return {
    isMet,
    criteria: [{ label: predicate.value.toString(), checked: isMet }],
  };
};

const readIntegerSuffix = (roll: GameState["calculator"]["total"][], length: number): bigint[] | null => {
  if (length <= 0 || roll.length < length) {
    return null;
  }
  const suffix = roll.slice(-length);
  const numbers: bigint[] = [];
  for (const value of suffix) {
    if (!isRationalCalculatorValue(value) || !isInteger(value.value)) {
      return null;
    }
    numbers.push(value.value.num);
  }
  return numbers;
};

const analyzeRollEndsWithEqualRun: PredicateAnalyzer<RollEndsWithEqualRunPredicate> = (predicate, state) => {
  const suffix = readIntegerSuffix(getRollValues(state), predicate.length);
  const isMet = !!suffix && suffix.every((value) => value === suffix[0]);
  return {
    isMet,
    criteria: [{ label: `equal run x${predicate.length.toString()}`, checked: isMet }],
  };
};

const analyzeRollEndsWithIncrementingRun: PredicateAnalyzer<RollEndsWithIncrementingRunPredicate> = (predicate, state) => {
  const step = predicate.step ?? 1n;
  const suffix = readIntegerSuffix(getRollValues(state), predicate.length);
  const isMet =
    !!suffix &&
    suffix.every((value, index) => index === 0 || value === suffix[index - 1] + step);
  return {
    isMet,
    criteria: [{ label: `run +${step.toString()} x${predicate.length.toString()}`, checked: isMet }],
  };
};

const analyzeRollContainsDomainType: PredicateAnalyzer<RollContainsDomainTypePredicate> = (predicate, state) => {
  const isMet = state.calculator.rollEntries.some((entry) => {
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
  });
  return {
    isMet,
    criteria: [{ label: predicate.domainType, checked: isMet }],
  };
};

const absBigInt = (value: bigint): bigint => (value < 0n ? -value : value);

const analyzeRollEndsWithAlternatingSignConstantAbsRun: PredicateAnalyzer<RollEndsWithAlternatingSignConstantAbsRunPredicate> = (
  predicate,
  state,
) => {
  const suffix = readIntegerSuffix(getRollValues(state), predicate.length);
  const isMet =
    !!suffix &&
    suffix.length > 0 &&
    suffix[0] !== 0n &&
    suffix.every((value, index) =>
      value !== 0n
      && absBigInt(value) === absBigInt(suffix[0])
      && (index === 0 || (value > 0n) !== (suffix[index - 1] > 0n)),
    );
  return {
    isMet,
    criteria: [{ label: `alt ±|x| run x${predicate.length.toString()}`, checked: isMet }],
  };
};

const analyzeRollEndsWithConstantStepRun: PredicateAnalyzer<RollEndsWithConstantStepRunPredicate> = (predicate, state) => {
  const suffix = readIntegerSuffix(getRollValues(state), predicate.length);
  let isMet = Boolean(suffix && suffix.length >= 2);
  let step = 0n;
  if (suffix && suffix.length >= 2) {
    step = suffix[1] - suffix[0];
    isMet = suffix.every((value, index) => index === 0 || value - suffix[index - 1] === step);
    if (isMet && predicate.minAbsStep != null) {
      isMet = absBigInt(step) >= predicate.minAbsStep;
    }
    if (isMet && predicate.requirePositiveStep) {
      isMet = step > 0n;
    }
    if (isMet && predicate.requireNegativeStep) {
      isMet = step < 0n;
    }
  }
  return {
    isMet,
    criteria: [{ label: `const step run x${predicate.length.toString()}`, checked: isMet }],
  };
};

const analyzeKeyPressCountAtLeast: PredicateAnalyzer<KeyPressCountAtLeastPredicate> = (predicate, state) => {
  const currentCount = state.keyPressCounts[predicate.key] ?? 0;
  const isMet = currentCount >= predicate.count;
  return {
    isMet,
    criteria: [{ label: `${predicate.key} >= ${predicate.count.toString()}`, checked: isMet }],
  };
};

const analyzeOverflowErrorSeen: PredicateAnalyzer<OverflowErrorSeenPredicate> = (_predicate, state) => {
  const isMet =
    state.completedUnlockIds.includes(OVERFLOW_ERROR_SEEN_ID)
    || state.calculator.rollEntries.some((entry) => entry.error?.kind === "overflow");
  return {
    isMet,
    criteria: [{ label: "overflow error observed", checked: isMet }],
  };
};

const analyzeDivisionByZeroErrorSeen: PredicateAnalyzer<DivisionByZeroErrorSeenPredicate> = (_predicate, state) => {
  const isMet = state.calculator.rollEntries.some((entry) => entry.error?.kind === "division_by_zero");
  return {
    isMet,
    criteria: [{ label: "division by zero observed", checked: isMet }],
  };
};

const analyzeSymbolicErrorSeen: PredicateAnalyzer<SymbolicErrorSeenPredicate> = (_predicate, state) => {
  const isMet = state.calculator.rollEntries.some((entry) => entry.error?.kind === "symbolic_result");
  return {
    isMet,
    criteria: [{ label: "symbolic result observed", checked: isMet }],
  };
};

const analyzeAllocatorReturnPressCountAtLeast: PredicateAnalyzer<AllocatorReturnPressCountAtLeastPredicate> = (
  predicate,
  state,
) => {
  const currentCount = state.allocatorReturnPressCount ?? 0;
  const isMet = currentCount >= predicate.count;
  return {
    isMet,
    criteria: [{ label: `RETURN >= ${predicate.count.toString()}`, checked: isMet }],
  };
};

const analyzeAllocatorAllocatePressCountAtLeast: PredicateAnalyzer<AllocatorAllocatePressCountAtLeastPredicate> = (
  predicate,
  state,
) => {
  const currentCount = state.allocatorAllocatePressCount ?? 0;
  const isMet = currentCount >= predicate.count;
  return {
    isMet,
    criteria: [{ label: `ALLOCATE >= ${predicate.count.toString()}`, checked: isMet }],
  };
};

const analyzeOperationEquals: PredicateAnalyzer<OperationEqualsPredicate> = (predicate, state) => {
  const slots = getOperationSnapshot(state.calculator, predicate.includeDrafting ?? true);
  const slotText = (slot: typeof slots[number]): string =>
    slot.kind === "unary"
      ? slot.operator
      : `${slot.operator}:${typeof slot.operand === "bigint" ? slot.operand.toString() : expressionToDisplayString(slotOperandToExpression(slot.operand))}`;
  const isMet =
    slots.length === predicate.slots.length &&
    slots.every(
      (slot, index) =>
        slotText(slot) === slotText(predicate.slots[index]),
    );

  const requiredTokens = predicate.slots.map(slotText);
  const currentTokens = slots.map(slotText);
  return {
    isMet,
    criteria: requiredTokens.map((token, index) => ({
      label: token,
      checked: currentTokens[index] === token,
    })),
  };
};

const analyzeKeypadKeySlotsAtLeast: PredicateAnalyzer<KeypadKeySlotsAtLeastPredicate> = (predicate, state) => {
  const currentColumns = state.ui.keypadColumns ?? 0;
  const currentRows = state.ui.keypadRows ?? 0;
  const currentSlots = currentColumns * currentRows;
  const isMet = currentSlots >= predicate.slots;
  return {
    isMet,
    criteria: [{ label: `key slots >= ${predicate.slots.toString()}`, checked: isMet }],
  };
};

const analyzeLambdaSpentPointsDroppedToZeroSeen: PredicateAnalyzer<LambdaSpentPointsDroppedToZeroSeenPredicate> = (
  _predicate,
  state,
) => {
  const isMet = state.completedUnlockIds.includes(LAMBDA_SPENT_POINTS_DROPPED_TO_ZERO_SEEN_ID);
  return {
    isMet,
    criteria: [{ label: "lambda spent points transitioned 1 -> 0", checked: isMet }],
  };
};

const analyzeOperationFirstEuclidEquivalentModulo: PredicateAnalyzer<OperationFirstEuclidEquivalentModuloPredicate> = (
  _predicate,
  state,
) => {
  const slots = getOperationSnapshot(state.calculator, false);
  const firstSlot = slots[0] ?? null;
  const firstIsEuclid = firstSlot != null && "operand" in firstSlot && firstSlot.operator === KEY_ID.op_euclid_div;

  let evaluationsSucceeded = false;
  let resultMatchesModuloBaseline = false;
  if (firstIsEuclid) {
    const combined = executeSlotsValue(state.calculator.total, slots);
    const baseline = executeSlotsValue(state.calculator.total, [{ kind: "binary", operator: KEY_ID.op_mod, operand: firstSlot.operand }]);
    evaluationsSucceeded = combined.ok && baseline.ok;
    if (combined.ok && baseline.ok) {
      resultMatchesModuloBaseline = calculatorValueToDisplayString(combined.total) === calculatorValueToDisplayString(baseline.total);
    }
  }

  return {
    isMet: firstIsEuclid && evaluationsSucceeded && resultMatchesModuloBaseline,
    criteria: [
      { label: "first op is #", checked: firstIsEuclid },
      { label: "equivalence evaluated", checked: evaluationsSucceeded },
      { label: "combined equals a\u27E1b", checked: resultMatchesModuloBaseline },
    ],
  };
};

const analyzeRollLengthAtLeast: PredicateAnalyzer<RollLengthAtLeastPredicate> = (predicate, state) => {
  const isMet = state.calculator.rollEntries.length >= predicate.length;
  return {
    isMet,
    criteria: [{ label: `len >= ${predicate.length.toString()}`, checked: isMet }],
  };
};

const analyzers = {
  total_equals: analyzeTotalEquals,
  total_at_least: analyzeTotalAtLeast,
  total_at_most: analyzeTotalAtMost,
  total_magnitude_at_least: analyzeTotalMagnitudeAtLeast,
  roll_ends_with_sequence: analyzeRollEndsWithSequence,
  roll_contains_value: analyzeRollContainsValue,
  roll_contains_domain_type: analyzeRollContainsDomainType,
  operation_equals: analyzeOperationEquals,
  operation_first_euclid_equivalent_modulo: analyzeOperationFirstEuclidEquivalentModulo,
  roll_length_at_least: analyzeRollLengthAtLeast,
  roll_ends_with_equal_run: analyzeRollEndsWithEqualRun,
  roll_ends_with_incrementing_run: analyzeRollEndsWithIncrementingRun,
  roll_ends_with_alternating_sign_constant_abs_run: analyzeRollEndsWithAlternatingSignConstantAbsRun,
  roll_ends_with_constant_step_run: analyzeRollEndsWithConstantStepRun,
  key_press_count_at_least: analyzeKeyPressCountAtLeast,
  overflow_error_seen: analyzeOverflowErrorSeen,
  division_by_zero_error_seen: analyzeDivisionByZeroErrorSeen,
  symbolic_error_seen: analyzeSymbolicErrorSeen,
  allocator_return_press_count_at_least: analyzeAllocatorReturnPressCountAtLeast,
  allocator_allocate_press_count_at_least: analyzeAllocatorAllocatePressCountAtLeast,
  keypad_key_slots_at_least: analyzeKeypadKeySlotsAtLeast,
  lambda_spent_points_dropped_to_zero_seen: analyzeLambdaSpentPointsDroppedToZeroSeen,
} as const;

export const analyzeUnlockPredicate = (predicate: UnlockPredicate, state: GameState): UnlockPredicateAnalysis =>
  analyzers[predicate.type](predicate as never, state);

export const evaluateUnlockPredicate = (predicate: UnlockPredicate, state: GameState): boolean =>
  analyzeUnlockPredicate(predicate, state).isMet;

export const buildUnlockCriteria = (predicate: UnlockPredicate, state: GameState): UnlockCriterion[] =>
  analyzeUnlockPredicate(predicate, state).criteria;
