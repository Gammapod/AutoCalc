import assert from "node:assert/strict";
import { applyKeyAction } from "../src/domain/reducer.input.js";
import { toNanCalculatorValue, toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { initialState } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import type { GameState } from "../src/domain/types.js";

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue(rv(num, den));

export const runReducerInputTests = (): void => {
  const base = initialState();

  const afterDigit = applyKeyAction(base, "1");
  assert.deepEqual(afterDigit.calculator.total, r(0n), "digit 1 is locked at start");

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

  const undoRollSource: GameState = {
    ...unlocked,
    calculator: {
      ...unlocked.calculator,
      total: r(9n),
      roll: [r(3n), r(5n), r(9n)],
      euclidRemainders: [
        { rollIndex: 1, value: rv(2n) },
        { rollIndex: 2, value: rv(4n) },
      ],
    },
  };
  const afterUndoRoll = applyKeyAction(undoRollSource, "UNDO");
  assert.deepEqual(afterUndoRoll.calculator.roll, [r(3n), r(5n)], "UNDO removes the latest roll entry");
  assert.deepEqual(afterUndoRoll.calculator.total, r(5n), "UNDO restores total to previous roll value");
  assert.deepEqual(
    afterUndoRoll.calculator.euclidRemainders,
    [{ rollIndex: 1, value: rv(2n) }],
    "UNDO drops euclid remainders attached to removed roll entries",
  );

  const undoCeFallbackSource: GameState = {
    ...unlocked,
    calculator: {
      ...unlocked.calculator,
      total: r(7n),
      roll: [],
      euclidRemainders: [],
      operationSlots: [{ operator: "+", operand: 3n }],
      draftingSlot: { operator: "-", operandInput: "2", isNegative: false },
    },
    unlocks: {
      ...unlocked.unlocks,
      utilities: {
        ...unlocked.unlocks.utilities,
        CE: false,
      },
    },
  };
  const afterUndoCeFallback = applyKeyAction(undoCeFallbackSource, "UNDO");
  assert.deepEqual(afterUndoCeFallback.calculator.total, r(7n), "UNDO CE-fallback preserves total");
  assert.deepEqual(afterUndoCeFallback.calculator.roll, [], "UNDO CE-fallback clears roll");
  assert.deepEqual(afterUndoCeFallback.calculator.operationSlots, [], "UNDO CE-fallback clears operation slots");
  assert.equal(afterUndoCeFallback.calculator.draftingSlot, null, "UNDO CE-fallback clears drafting slot");

  const undoCFallbackSource: GameState = {
    ...unlocked,
    calculator: {
      ...unlocked.calculator,
      total: r(7n),
      roll: [],
      euclidRemainders: [],
      operationSlots: [],
      draftingSlot: null,
    },
    unlocks: {
      ...unlocked.unlocks,
      utilities: {
        ...unlocked.unlocks.utilities,
        C: false,
      },
    },
    completedUnlockIds: [],
  };
  const afterUndoCFallback = applyKeyAction(undoCFallbackSource, "UNDO");
  assert.deepEqual(afterUndoCFallback.calculator.total, r(0n), "UNDO C-fallback resets total");
  assert.equal(
    afterUndoCFallback.calculator.singleDigitInitialTotalEntry,
    true,
    "UNDO C-fallback applies full clear-entry state",
  );
  assert.equal(
    afterUndoCFallback.completedUnlockIds.includes("unlock_checklist_on_first_c_press"),
    true,
    "UNDO C-fallback applies checklist unlock side effect",
  );

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
    unlocks: {
      ...base.unlocks,
      valueExpression: {
        ...base.unlocks.valueExpression,
        "1": true,
      },
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

  const divByZeroSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(10n),
      operationSlots: [{ operator: "/", operand: 0n }],
    },
  };
  const afterDivByZero = applyKeyAction(divByZeroSource, "=");
  assert.deepEqual(afterDivByZero.calculator.total, toNanCalculatorValue(), "division by zero sets total to NaN");
  assert.equal(afterDivByZero.calculator.roll.at(-1)?.kind, "nan", "division by zero appends NaN roll row");
  assert.equal(afterDivByZero.calculator.rollErrors.at(-1)?.code, "n/0, ∴ NaN", "division by zero records roll error code");

  const nanInputSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: toNanCalculatorValue(),
    },
  };
  const afterNanEquals = applyKeyAction(nanInputSource, "=");
  assert.deepEqual(afterNanEquals.calculator.total, toNanCalculatorValue(), "executing on NaN keeps NaN total");
  assert.equal(afterNanEquals.calculator.rollErrors.at(-1)?.code, "NaN, ∴ NaN", "NaN execution records NaN error code");

  const overflowSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(99n),
      operationSlots: [{ operator: "+", operand: 1n }],
    },
  };
  const afterOverflow = applyKeyAction(overflowSource, "=");
  assert.deepEqual(afterOverflow.calculator.total, r(99n), "overflow clamps to boundary value");
  assert.equal(
    afterOverflow.calculator.rollErrors.at(-1)?.code,
    "x∉[-R,R] ∴ |x|=R×⌊x/R⌋",
    "overflow records overflow error code",
  );
};
