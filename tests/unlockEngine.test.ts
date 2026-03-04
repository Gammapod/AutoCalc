import assert from "node:assert/strict";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { analyzeUnlockPredicate } from "../src/domain/unlockEngine.js";
import { initialState, OVERFLOW_ERROR_SEEN_ID } from "../src/domain/state.js";
import type { GameState, UnlockPredicate } from "../src/domain/types.js";

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue(rv(num, den));

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

  const totalMagnitudeAtLeast: UnlockPredicate = { type: "total_magnitude_at_least", value: 10n };
  assertCriteriaConsistency(
    totalMagnitudeAtLeast,
    {
      ...base,
      calculator: { ...base.calculator, total: r(-10n) },
    },
    "total_magnitude_at_least met",
  );
  assertCriteriaConsistency(totalMagnitudeAtLeast, base, "total_magnitude_at_least unmet");

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

  const alternatingAbsRun: UnlockPredicate = {
    type: "roll_ends_with_alternating_sign_constant_abs_run",
    length: 7,
  };
  assertCriteriaConsistency(
    alternatingAbsRun,
    {
      ...base,
      calculator: { ...base.calculator, roll: [r(5n), r(-5n), r(5n), r(-5n), r(5n), r(-5n), r(5n)] },
    },
    "roll_ends_with_alternating_sign_constant_abs_run met",
  );
  assertCriteriaConsistency(
    alternatingAbsRun,
    {
      ...base,
      calculator: { ...base.calculator, roll: [r(5n), r(-5n), r(5n), r(0n), r(5n), r(-5n), r(5n)] },
    },
    "roll_ends_with_alternating_sign_constant_abs_run unmet on zero",
  );
  assertCriteriaConsistency(
    alternatingAbsRun,
    {
      ...base,
      calculator: { ...base.calculator, roll: [r(5n), r(-5n), r(5n), r(-6n), r(5n), r(-5n), r(5n)] },
    },
    "roll_ends_with_alternating_sign_constant_abs_run unmet on abs mismatch",
  );

  const constantStepRun: UnlockPredicate = {
    type: "roll_ends_with_constant_step_run",
    length: 7,
    minAbsStep: 2n,
  };
  assertCriteriaConsistency(
    constantStepRun,
    {
      ...base,
      calculator: { ...base.calculator, roll: [r(5n), r(12n), r(19n), r(26n), r(33n), r(40n), r(47n)] },
    },
    "roll_ends_with_constant_step_run met",
  );
  assertCriteriaConsistency(
    constantStepRun,
    {
      ...base,
      calculator: { ...base.calculator, roll: [r(5n), r(6n), r(7n), r(8n), r(9n), r(10n), r(11n)] },
    },
    "roll_ends_with_constant_step_run unmet on step 1",
  );
  assertCriteriaConsistency(
    constantStepRun,
    {
      ...base,
      calculator: { ...base.calculator, roll: [r(5n), r(12n), r(19n), r(26n), r(32n), r(40n), r(47n)] },
    },
    "roll_ends_with_constant_step_run unmet on non-constant step",
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

  const overflowSeen: UnlockPredicate = { type: "overflow_error_seen" };
  assertCriteriaConsistency(
    overflowSeen,
    {
      ...base,
      completedUnlockIds: [OVERFLOW_ERROR_SEEN_ID],
    },
    "overflow_error_seen met",
  );
  assertCriteriaConsistency(overflowSeen, base, "overflow_error_seen unmet");

  const divByZeroSeen: UnlockPredicate = { type: "division_by_zero_error_seen" };
  assertCriteriaConsistency(
    divByZeroSeen,
    {
      ...base,
      calculator: {
        ...base.calculator,
        rollErrors: [{ rollIndex: 0, code: "n/0", kind: "division_by_zero" }],
      },
    },
    "division_by_zero_error_seen met",
  );
  assertCriteriaConsistency(divByZeroSeen, base, "division_by_zero_error_seen unmet");

  const allocatorReturnSeen: UnlockPredicate = { type: "allocator_return_press_count_at_least", count: 1 };
  assertCriteriaConsistency(
    allocatorReturnSeen,
    {
      ...base,
      allocatorReturnPressCount: 1,
    },
    "allocator_return_press_count_at_least met",
  );
  assertCriteriaConsistency(allocatorReturnSeen, base, "allocator_return_press_count_at_least unmet");

  const allocatorAllocateSeen: UnlockPredicate = { type: "allocator_allocate_press_count_at_least", count: 1 };
  assertCriteriaConsistency(
    allocatorAllocateSeen,
    {
      ...base,
      allocatorAllocatePressCount: 1,
    },
    "allocator_allocate_press_count_at_least met",
  );
  assertCriteriaConsistency(allocatorAllocateSeen, base, "allocator_allocate_press_count_at_least unmet");
};
