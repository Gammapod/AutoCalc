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
  assert.deepEqual(afterIncrement.calculator.seedSnapshot, r(0n), "first increment captures pre-roll seed snapshot");
  assert.deepEqual(afterIncrement.calculator.total, r(1n), "increment updates total");
  assert.deepEqual(afterIncrement.calculator.rollEntries, re(r(1n)), "increment appends new total to roll");
  const afterSecondIncrement = applyKeyAction(afterIncrement, "++");
  assert.deepEqual(afterSecondIncrement.calculator.seedSnapshot, r(0n), "subsequent increments preserve original seed snapshot");

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
  assert.deepEqual(afterDecrement.calculator.seedSnapshot, r(0n), "first decrement captures pre-roll seed snapshot");
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

  const moduloExecutionSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(10n),
      operationSlots: [{ operator: "\u27E1", operand: 4n }],
    },
  };
  const afterModuloExecution = applyKeyAction(moduloExecutionSource, "=");
  assert.deepEqual(afterModuloExecution.calculator.seedSnapshot, r(10n), "first equals captures current seed snapshot");
  assert.deepEqual(afterModuloExecution.calculator.total, r(2n), "modulo execution sets total to the modulo component");
  assert.deepEqual(
    afterModuloExecution.calculator.rollEntries.at(-1)?.remainder,
    { num: 2n, den: 1n },
    "modulo execution records the modulo component as roll remainder",
  );

  const clearSeedSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      seedSnapshot: r(7n),
      total: r(9n),
      rollEntries: re(r(9n)),
    },
  };
  const afterCe = applyKeyAction(clearSeedSource, "CE");
  assert.equal(afterCe.calculator.seedSnapshot, undefined, "CE clears seed snapshot");

  const afterC = applyKeyAction(clearSeedSource, "C");
  assert.equal(afterC.calculator.seedSnapshot, undefined, "C clears seed snapshot");

  const undoSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      seedSnapshot: r(5n),
      total: r(6n),
      rollEntries: re(r(6n)),
    },
  };
  const afterUndo = applyKeyAction(undoSource, "UNDO");
  assert.deepEqual(afterUndo.calculator.seedSnapshot, r(5n), "UNDO keeps seed snapshot when roll becomes empty");

  const memoryCycleLocked = initialState();
  const afterLockedMemoryCycle = applyKeyAction(memoryCycleLocked, "α,β,γ");
  assert.equal(afterLockedMemoryCycle.ui.memoryVariable, "α", "locked memory-cycle key does not change selected variable");

  const memoryCycleUnlocked: GameState = {
    ...initialState(),
    unlocks: {
      ...initialState().unlocks,
      memory: {
        ...initialState().unlocks.memory,
        "α,β,γ": true,
      },
    },
  };
  const afterFirstMemoryCycle = applyKeyAction(memoryCycleUnlocked, "α,β,γ");
  assert.equal(afterFirstMemoryCycle.ui.memoryVariable, "β", "memory-cycle key advances α to β");
  const afterSecondMemoryCycle = applyKeyAction(afterFirstMemoryCycle, "α,β,γ");
  assert.equal(afterSecondMemoryCycle.ui.memoryVariable, "γ", "memory-cycle key advances β to γ");
  const afterThirdMemoryCycle = applyKeyAction(afterSecondMemoryCycle, "α,β,γ");
  assert.equal(afterThirdMemoryCycle.ui.memoryVariable, "α", "memory-cycle key wraps γ to α");

  const memoryPlusBase = initialState();
  const memoryPlusUnlocked: GameState = {
    ...memoryPlusBase,
    allocator: {
      ...memoryPlusBase.allocator,
      maxPoints: 2,
    },
    unlocks: {
      ...memoryPlusBase.unlocks,
      memory: {
        ...memoryPlusBase.unlocks.memory,
        "M+": true,
      },
    },
  };
  const plusAlpha = applyKeyAction({ ...memoryPlusUnlocked, ui: { ...memoryPlusUnlocked.ui, memoryVariable: "α" } }, "M+");
  assert.equal(plusAlpha.ui.keypadColumns, 2, "M+ with α increases keypad columns");
  const plusBeta = applyKeyAction({ ...memoryPlusUnlocked, ui: { ...memoryPlusUnlocked.ui, memoryVariable: "β" } }, "M+");
  assert.equal(plusBeta.ui.keypadRows, 2, "M+ with β increases keypad rows");
  const plusGamma = applyKeyAction({ ...memoryPlusUnlocked, ui: { ...memoryPlusUnlocked.ui, memoryVariable: "γ" } }, "M+");
  assert.equal(plusGamma.unlocks.maxSlots, 1, "M+ with γ increases operation slot count");

  const memoryMinusBase = initialState();
  const memoryMinusUnlocked: GameState = {
    ...memoryMinusBase,
    allocator: {
      ...memoryMinusBase.allocator,
      maxPoints: 3,
      allocations: {
        ...memoryMinusBase.allocator.allocations,
        width: 1,
        height: 1,
        slots: 1,
      },
    },
    unlocks: {
      ...memoryMinusBase.unlocks,
      memory: {
        ...memoryMinusBase.unlocks.memory,
        "M–": true,
      },
    },
    ui: {
      ...memoryMinusBase.ui,
      keypadColumns: 2,
      keypadRows: 2,
    },
  };
  const minusAlpha = applyKeyAction({ ...memoryMinusUnlocked, ui: { ...memoryMinusUnlocked.ui, memoryVariable: "α" } }, "M–");
  assert.equal(minusAlpha.ui.keypadColumns, 1, "M– with α decreases keypad columns");
  const minusBeta = applyKeyAction({ ...memoryMinusUnlocked, ui: { ...memoryMinusUnlocked.ui, memoryVariable: "β" } }, "M–");
  assert.equal(minusBeta.ui.keypadRows, 1, "M– with β decreases keypad rows");
  const minusGamma = applyKeyAction({ ...memoryMinusUnlocked, ui: { ...memoryMinusUnlocked.ui, memoryVariable: "γ" } }, "M–");
  assert.equal(minusGamma.unlocks.maxSlots, 0, "M– with γ decreases operation slot count");
};

