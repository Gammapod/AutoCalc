import assert from "node:assert/strict";
import { applyKeyAction } from "../src/domain/reducer.input.js";
import { OVERFLOW_ERROR_CODE, toNanCalculatorValue, toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { initialState } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import type { GameState, RollEntry } from "../src/domain/types.js";

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue(rv(num, den));
const re = (...values: RollEntry["y"][]): RollEntry[] => values.map((y) => ({ y }));

export const runReducerInputTests = (): void => {
  const base = initialState();

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
        "0": true,
        "1": true,
        "2": true,
      },
    },
  };
  const freshFirstDigit = applyKeyAction(freshBootNoSaveState, "1");
  assert.deepEqual(freshFirstDigit.calculator.total, r(1n), "fresh boot accepts one initial total digit");
  assert.equal(
    freshFirstDigit.calculator.singleDigitInitialTotalEntry,
    false,
    "entering a seed digit marks seed as present",
  );
  const freshBlockedSecondDigit = applyKeyAction(freshFirstDigit, "2");
  assert.deepEqual(
    freshBlockedSecondDigit.calculator.total,
    r(2n),
    "fresh boot replaces a second initial total digit",
  );

  const freshZeroSeed = applyKeyAction(freshBootNoSaveState, "0");
  assert.deepEqual(freshZeroSeed.calculator.total, r(0n), "fresh boot accepts zero seed input");
  assert.equal(
    freshZeroSeed.calculator.singleDigitInitialTotalEntry,
    false,
    "entering seed zero marks seed as present (not placeholder)",
  );

  const fullyUnlocked = reducer(initialState(), { type: "UNLOCK_ALL" });
  const firstFreshDigit = applyKeyAction(fullyUnlocked, "9");
  assert.deepEqual(firstFreshDigit.calculator.total, r(9n), "first total digit on fresh cleared save is accepted");
  const blockedFreshSecondDigit = applyKeyAction(firstFreshDigit, "8");
  assert.deepEqual(
    blockedFreshSecondDigit.calculator.total,
    r(8n),
    "second total digit on fresh cleared save replaces first seed digit",
  );

  const afterClear = applyKeyAction(fullyUnlocked, "C");
  const firstTotalDigit = applyKeyAction(afterClear, "9");
  assert.deepEqual(firstTotalDigit.calculator.total, r(9n), "first total digit after clear is accepted");
  const blockedSecondTotalDigit = applyKeyAction(firstTotalDigit, "8");
  assert.deepEqual(
    blockedSecondTotalDigit.calculator.total,
    r(8n),
    "second total digit after clear replaces first seed digit",
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
  assert.equal(afterDivByZero.calculator.rollEntries.at(-1)?.y.kind, "nan", "division by zero appends NaN roll row");
  assert.equal(afterDivByZero.calculator.rollEntries.at(-1)?.error?.code, "n/0", "division by zero records roll error code");

  const nanInputSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: toNanCalculatorValue(),
    },
  };
  const afterNanEquals = applyKeyAction(nanInputSource, "=");
  assert.deepEqual(afterNanEquals.calculator.total, toNanCalculatorValue(), "executing on NaN keeps NaN total");
  assert.equal(afterNanEquals.calculator.rollEntries.at(-1)?.error?.code, "NaN", "NaN execution records NaN error code");

  const overflowSource: GameState = {
    ...fullyUnlocked,
    unlocks: {
      ...fullyUnlocked.unlocks,
      maxTotalDigits: 2,
    },
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(99n),
      operationSlots: [{ operator: "+", operand: 1n }],
    },
  };
  const afterOverflow = applyKeyAction(overflowSource, "=");
  assert.deepEqual(afterOverflow.calculator.total, r(99n), "overflow clamps to boundary value");
  assert.equal(
    afterOverflow.calculator.rollEntries.at(-1)?.error?.code,
    OVERFLOW_ERROR_CODE,
    "overflow records overflow error code",
  );

  const incrementSource = initialState();
  const afterIncrement = applyKeyAction(incrementSource, "++");
  assert.deepEqual(afterIncrement.calculator.total, r(1n), "increment updates total");
  assert.deepEqual(afterIncrement.calculator.rollEntries, re(r(1n)), "increment appends new total to roll");

  const decrementSource: GameState = {
    ...initialState(),
    unlocks: {
      ...initialState().unlocks,
      execution: {
        ...initialState().unlocks.execution,
        "--": true,
      },
    },
  };
  const afterDecrement = applyKeyAction(decrementSource, "--");
  assert.deepEqual(afterDecrement.calculator.total, r(-1n), "decrement updates total");
  assert.deepEqual(afterDecrement.calculator.rollEntries, re(r(-1n)), "decrement appends new total to roll");

  const activeRollDigitNoOp: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(5n),
      rollEntries: re(r(5n)),
    },
  };
  const afterActiveRollDigit = applyKeyAction(activeRollDigitNoOp, "1");
  assert.deepEqual(afterActiveRollDigit, activeRollDigitNoOp, "digit key is no-op while roll is active");
};

