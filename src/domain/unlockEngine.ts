import { equalsBigInt, gteBigInt, isInteger, lteBigInt } from "../infra/math/rationalEngine.js";
import { getOperationSnapshot } from "./slotDrafting.js";
import type {
  GameState,
  OperationEqualsPredicate,
  RollEndsWithSequencePredicate,
  RollLengthAtLeastPredicate,
  TotalAtLeastPredicate,
  TotalAtMostPredicate,
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
    const isMatch = rollSuffix.every((value, index) => isInteger(value) && value.num === requiredPrefix[index]);
    if (isMatch) {
      return candidate;
    }
  }
  return 0;
};

const analyzeTotalEquals: PredicateAnalyzer<TotalEqualsPredicate> = (predicate, state) => {
  const isMet = equalsBigInt(state.calculator.total, predicate.value);
  return {
    isMet,
    criteria: [{ label: predicate.value.toString(), checked: isMet }],
  };
};

const analyzeTotalAtLeast: PredicateAnalyzer<TotalAtLeastPredicate> = (predicate, state) => {
  const isMet = gteBigInt(state.calculator.total, predicate.value);
  return {
    isMet,
    criteria: [{ label: predicate.value.toString(), checked: isMet }],
  };
};

const analyzeTotalAtMost: PredicateAnalyzer<TotalAtMostPredicate> = (predicate, state) => {
  const isMet = lteBigInt(state.calculator.total, predicate.value);
  return {
    isMet,
    criteria: [{ label: predicate.value.toString(), checked: isMet }],
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
  roll_ends_with_sequence: analyzeRollEndsWithSequence,
  operation_equals: analyzeOperationEquals,
  roll_length_at_least: analyzeRollLengthAtLeast,
} as const;

export const analyzeUnlockPredicate = (predicate: UnlockPredicate, state: GameState): UnlockPredicateAnalysis =>
  analyzers[predicate.type](predicate as never, state);

export const evaluateUnlockPredicate = (predicate: UnlockPredicate, state: GameState): boolean =>
  analyzeUnlockPredicate(predicate, state).isMet;

export const buildUnlockCriteria = (predicate: UnlockPredicate, state: GameState): UnlockCriterion[] =>
  analyzeUnlockPredicate(predicate, state).criteria;
