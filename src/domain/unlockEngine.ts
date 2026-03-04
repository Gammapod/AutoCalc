import { equalsBigInt, gteBigInt, isInteger, lteBigInt } from "../infra/math/rationalEngine.js";
import { isRationalCalculatorValue } from "./calculatorValue.js";
import { getOperationSnapshot } from "./slotDrafting.js";
import { OVERFLOW_ERROR_SEEN_ID } from "./state.js";
import type {
  GameState,
  AllocatorReturnPressCountAtLeastPredicate,
  AllocatorAllocatePressCountAtLeastPredicate,
  OverflowErrorSeenPredicate,
  KeyPressCountAtLeastPredicate,
  OperationEqualsPredicate,
  RollContainsValuePredicate,
  RollEndsWithEqualRunPredicate,
  RollEndsWithIncrementingRunPredicate,
  RollEndsWithSequencePredicate,
  RollLengthAtLeastPredicate,
  TotalAtLeastPredicate,
  TotalAtMostPredicate,
  TotalMagnitudeAtLeastPredicate,
  TotalEqualsPredicate,
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

const getProgressiveRollSequenceMatches = (roll: GameState["calculator"]["roll"], required: bigint[]): number => {
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
  const matchedCount = getProgressiveRollSequenceMatches(state.calculator.roll, predicate.sequence);
  return {
    isMet: matchedCount === predicate.sequence.length,
    criteria: predicate.sequence.map((value, index) => ({
      label: value.toString(),
      checked: index < matchedCount,
    })),
  };
};

const analyzeRollContainsValue: PredicateAnalyzer<RollContainsValuePredicate> = (predicate, state) => {
  const isMet = state.calculator.roll.some(
    (value) => isRationalCalculatorValue(value) && isInteger(value.value) && value.value.num === predicate.value,
  );
  return {
    isMet,
    criteria: [{ label: predicate.value.toString(), checked: isMet }],
  };
};

const readIntegerSuffix = (roll: GameState["calculator"]["roll"], length: number): bigint[] | null => {
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
  const suffix = readIntegerSuffix(state.calculator.roll, predicate.length);
  const isMet = !!suffix && suffix.every((value) => value === suffix[0]);
  return {
    isMet,
    criteria: [{ label: `equal run x${predicate.length.toString()}`, checked: isMet }],
  };
};

const analyzeRollEndsWithIncrementingRun: PredicateAnalyzer<RollEndsWithIncrementingRunPredicate> = (predicate, state) => {
  const step = predicate.step ?? 1n;
  const suffix = readIntegerSuffix(state.calculator.roll, predicate.length);
  const isMet =
    !!suffix &&
    suffix.every((value, index) => index === 0 || value === suffix[index - 1] + step);
  return {
    isMet,
    criteria: [{ label: `run +${step.toString()} x${predicate.length.toString()}`, checked: isMet }],
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
    || state.calculator.rollErrors.some((entry) => entry.kind === "overflow");
  return {
    isMet,
    criteria: [{ label: "overflow error observed", checked: isMet }],
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
  const isMet =
    slots.length === predicate.slots.length &&
    slots.every(
      (slot, index) =>
        slot.operator === predicate.slots[index].operator && slot.operand === predicate.slots[index].operand,
    );

  const requiredTokens = predicate.slots.flatMap((slot) => [slot.operator, slot.operand.toString()]);
  const currentTokens = slots.flatMap((slot) => [slot.operator, slot.operand.toString()]);
  return {
    isMet,
    criteria: requiredTokens.map((token, index) => ({
      label: token,
      checked: currentTokens[index] === token,
    })),
  };
};

const analyzeRollLengthAtLeast: PredicateAnalyzer<RollLengthAtLeastPredicate> = (predicate, state) => {
  const isMet = state.calculator.roll.length >= predicate.length;
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
  operation_equals: analyzeOperationEquals,
  roll_length_at_least: analyzeRollLengthAtLeast,
  roll_ends_with_equal_run: analyzeRollEndsWithEqualRun,
  roll_ends_with_incrementing_run: analyzeRollEndsWithIncrementingRun,
  key_press_count_at_least: analyzeKeyPressCountAtLeast,
  overflow_error_seen: analyzeOverflowErrorSeen,
  allocator_return_press_count_at_least: analyzeAllocatorReturnPressCountAtLeast,
  allocator_allocate_press_count_at_least: analyzeAllocatorAllocatePressCountAtLeast,
} as const;

export const analyzeUnlockPredicate = (predicate: UnlockPredicate, state: GameState): UnlockPredicateAnalysis =>
  analyzers[predicate.type](predicate as never, state);

export const evaluateUnlockPredicate = (predicate: UnlockPredicate, state: GameState): boolean =>
  analyzeUnlockPredicate(predicate, state).isMet;

export const buildUnlockCriteria = (predicate: UnlockPredicate, state: GameState): UnlockCriterion[] =>
  analyzeUnlockPredicate(predicate, state).criteria;
