import assert from "node:assert/strict";
import { applyKeyAction } from "../src/domain/reducer.input.js";
import { initialState } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import type { GameState } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });

export const runReducerInputTests = (): void => {
  const base = initialState();

  const afterDigit = applyKeyAction(base, "1");
  assert.deepEqual(afterDigit.calculator.total, r(1n), "digit key updates total");

  const unlocked = reducer(initialState(), { type: "UNLOCK_ALL" });
  const afterPlus = applyKeyAction(unlocked, "+");
  assert.equal(afterPlus.calculator.draftingSlot?.operator, "+", "operator key starts drafting when unlocked");

  const afterOperand = applyKeyAction(afterPlus, "1");
  assert.equal(afterOperand.calculator.draftingSlot?.operandInput, "1", "digit key fills drafting operand");

  const afterEquals = applyKeyAction(afterOperand, "=");
  assert.deepEqual(afterEquals.calculator.total, r(1n), "equals executes drafted operation sequence");
  assert.ok(afterEquals.calculator.roll.length > 0, "equals appends roll entries");

  const ceSource: GameState = {
    ...unlocked,
    calculator: {
      ...unlocked.calculator,
      roll: [r(1n), r(2n)],
      operationSlots: [{ operator: "+", operand: 1n }],
      draftingSlot: { operator: "-", operandInput: "1", isNegative: false },
    },
  };
  const afterCe = applyKeyAction(ceSource, "CE");
  assert.deepEqual(afterCe.calculator.roll, [], "CE clears roll");
  assert.deepEqual(afterCe.calculator.operationSlots, [], "CE clears operation slots");
  assert.equal(afterCe.calculator.draftingSlot, null, "CE clears drafting slot");

  const negSource: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      valueExpression: {
        ...base.unlocks.valueExpression,
        NEG: true,
      },
    },
  };
  const afterNeg = applyKeyAction(negSource, "NEG");
  assert.equal(afterNeg.calculator.pendingNegativeTotal, true, "NEG toggles pending sign on zero total");

  const freshBootNoSaveState: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      singleDigitInitialTotalEntry: true,
    },
  };
  const freshFirstDigit = applyKeyAction(freshBootNoSaveState, "1");
  assert.deepEqual(freshFirstDigit.calculator.total, r(1n), "fresh boot accepts one initial total digit");
  const freshBlockedSecondDigit = applyKeyAction(freshFirstDigit, "1");
  assert.deepEqual(
    freshBlockedSecondDigit.calculator.total,
    r(1n),
    "fresh boot blocks a second initial total digit",
  );

  const fullyUnlocked = reducer(initialState(), { type: "UNLOCK_ALL" });
  const firstFreshDigit = applyKeyAction(fullyUnlocked, "9");
  assert.deepEqual(firstFreshDigit.calculator.total, r(9n), "first total digit on fresh cleared save is accepted");
  const blockedFreshSecondDigit = applyKeyAction(firstFreshDigit, "8");
  assert.deepEqual(
    blockedFreshSecondDigit.calculator.total,
    r(9n),
    "second total digit on fresh cleared save is blocked by 1-digit cap",
  );

  const afterClear = applyKeyAction(fullyUnlocked, "C");
  const firstTotalDigit = applyKeyAction(afterClear, "9");
  assert.deepEqual(firstTotalDigit.calculator.total, r(9n), "first total digit after clear is accepted");
  const blockedSecondTotalDigit = applyKeyAction(firstTotalDigit, "8");
  assert.deepEqual(
    blockedSecondTotalDigit.calculator.total,
    r(9n),
    "second total digit after clear is blocked by 1-digit cap",
  );
};
