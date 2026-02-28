import assert from "node:assert/strict";
import { analyzeUnlockPredicate } from "../src/domain/unlockEngine.js";
import { initialState } from "../src/domain/state.js";
import type { GameState, UnlockPredicate } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });

const assertCriteriaConsistency = (
  predicate: UnlockPredicate,
  state: GameState,
  message: string,
): void => {
  const analysis = analyzeUnlockPredicate(predicate, state);
  const allChecked = analysis.criteria.every((criterion) => criterion.checked);
  assert.equal(
    analysis.isMet,
    allChecked,
    `${message}: predicate boolean must match criteria completion`,
  );
};

export const runUnlockEngineTests = (): void => {
  const base = initialState();

  const totalEquals: UnlockPredicate = { type: "total_equals", value: 11n };
  assertCriteriaConsistency(
    totalEquals,
    {
      ...base,
      calculator: { ...base.calculator, total: r(11n) },
    },
    "total_equals met",
  );
  assertCriteriaConsistency(totalEquals, base, "total_equals unmet");

  const totalAtLeast: UnlockPredicate = { type: "total_at_least", value: 25n };
  assertCriteriaConsistency(
    totalAtLeast,
    {
      ...base,
      calculator: { ...base.calculator, total: r(25n) },
    },
    "total_at_least met",
  );
  assertCriteriaConsistency(totalAtLeast, base, "total_at_least unmet");

  const totalAtMost: UnlockPredicate = { type: "total_at_most", value: -1n };
  assertCriteriaConsistency(
    totalAtMost,
    {
      ...base,
      calculator: { ...base.calculator, total: r(-1n) },
    },
    "total_at_most met",
  );
  assertCriteriaConsistency(totalAtMost, base, "total_at_most unmet");

  const rollLength: UnlockPredicate = { type: "roll_length_at_least", length: 2 };
  assertCriteriaConsistency(
    rollLength,
    {
      ...base,
      calculator: { ...base.calculator, roll: [r(1n), r(2n)] },
    },
    "roll_length_at_least met",
  );
  assertCriteriaConsistency(rollLength, base, "roll_length_at_least unmet");

  const rollEndsWith: UnlockPredicate = { type: "roll_ends_with_sequence", sequence: [1n, 2n, 3n] };
  assertCriteriaConsistency(
    rollEndsWith,
    {
      ...base,
      calculator: { ...base.calculator, roll: [r(1n), r(2n), r(3n)] },
    },
    "roll_ends_with_sequence met",
  );
  assertCriteriaConsistency(
    rollEndsWith,
    {
      ...base,
      calculator: { ...base.calculator, roll: [r(1n), r(2n), r(4n)] },
    },
    "roll_ends_with_sequence unmet",
  );

  const rollContains: UnlockPredicate = { type: "roll_contains_value", value: 0n };
  assertCriteriaConsistency(
    rollContains,
    {
      ...base,
      calculator: { ...base.calculator, roll: [r(3n), r(0n), r(5n)] },
    },
    "roll_contains_value met",
  );
  assertCriteriaConsistency(
    rollContains,
    {
      ...base,
      calculator: { ...base.calculator, roll: [r(3n), r(4n), r(5n)] },
    },
    "roll_contains_value unmet",
  );

  const operationEquals: UnlockPredicate = {
    type: "operation_equals",
    slots: [{ operator: "+", operand: 1n }],
  };
  assertCriteriaConsistency(
    operationEquals,
    {
      ...base,
      calculator: {
        ...base.calculator,
        draftingSlot: { operator: "+", operandInput: "1", isNegative: false },
      },
    },
    "operation_equals met",
  );
  assertCriteriaConsistency(operationEquals, base, "operation_equals unmet");
};
