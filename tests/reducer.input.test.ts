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

  const symbolicPiCancellationSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(0n),
      operationSlots: [
        { operator: "+", operand: { type: "constant", value: "pi" } },
        { operator: "-", operand: { type: "constant", value: "pi" } },
      ],
    },
  };
  const afterPiCancellation = applyKeyAction(symbolicPiCancellationSource, "=");
  assert.deepEqual(afterPiCancellation.calculator.total, r(0n), "symbolic pi cancellation resolves to exact rational");
  assert.equal(afterPiCancellation.calculator.rollEntries.at(-1)?.error, undefined, "rational symbolic simplification is not an error");
  assert.ok(afterPiCancellation.calculator.rollEntries.at(-1)?.symbolic, "rational symbolic simplification records symbolic payload");
  assert.equal(
    afterPiCancellation.calculator.rollEntries.at(-1)?.symbolic?.exprText,
    "((f_n(x)+pi)-pi)",
    "symbolic payload key tracks builder recurrence signature",
  );

  const symbolicECancellationSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(1n),
      operationSlots: [
        { operator: "*", operand: { type: "constant", value: "e" } },
        { operator: "/", operand: { type: "constant", value: "e" } },
      ],
    },
  };
  const afterECancellation = applyKeyAction(symbolicECancellationSource, "=");
  assert.deepEqual(afterECancellation.calculator.total, r(1n), "symbolic e cancellation resolves to exact rational");
  assert.equal(afterECancellation.calculator.rollEntries.at(-1)?.error, undefined, "exact symbolic rational stays non-error");
  assert.ok(afterECancellation.calculator.rollEntries.at(-1)?.symbolic, "exact symbolic rational still records symbolic payload");

  const symbolicNonRationalSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(1n),
      operationSlots: [{ operator: "+", operand: { type: "constant", value: "pi" } }],
    },
  };
  const afterNonRationalSymbolic = applyKeyAction(symbolicNonRationalSource, "=");
  assert.deepEqual(afterNonRationalSymbolic.calculator.total, toNanCalculatorValue(), "non-rational symbolic total is rejected in default visualizer");
  assert.equal(afterNonRationalSymbolic.calculator.rollEntries.at(-1)?.error?.code, "ALG", "non-rational symbolic result records ALG error");
  assert.ok(afterNonRationalSymbolic.calculator.rollEntries.at(-1)?.symbolic, "non-rational symbolic result records symbolic payload");
  assert.equal(
    afterNonRationalSymbolic.calculator.rollEntries.at(-1)?.symbolic?.renderText.includes("."),
    false,
    "symbolic render text never uses decimal notation",
  );

  const euclidDraftConstantBlocked = applyKeyAction(
    applyKeyAction(fullyUnlocked, "#"),
    "pi",
  );
  assert.equal(
    euclidDraftConstantBlocked.calculator.draftingSlot?.operandInput,
    "",
    "euclidean drafting only accepts numeric divisor input",
  );

  const moduloDraftNegBlocked = applyKeyAction(
    {
      ...fullyUnlocked,
      calculator: {
        ...fullyUnlocked.calculator,
        total: r(5n),
        draftingSlot: { operator: "\u27E1", operandInput: "3", isNegative: false },
      },
    },
    "NEG",
  );
  assert.equal(
    moduloDraftNegBlocked.calculator.draftingSlot?.isNegative,
    false,
    "modulo drafting ignores NEG so divisors stay natural",
  );
  assert.deepEqual(
    moduloDraftNegBlocked.calculator.total,
    r(5n),
    "rejected modulo NEG does not transfer negation to total",
  );
  assert.equal(
    moduloDraftNegBlocked.calculator.pendingNegativeTotal,
    false,
    "rejected modulo NEG does not toggle pending total sign",
  );

  const euclidCommittedNegBlocked = applyKeyAction(
    {
      ...fullyUnlocked,
      calculator: {
        ...fullyUnlocked.calculator,
        total: r(5n),
        operationSlots: [{ operator: "#", operand: 3n }],
      },
    },
    "NEG",
  );
  assert.deepEqual(
    euclidCommittedNegBlocked.calculator.operationSlots,
    [{ operator: "#", operand: 3n }],
    "euclidean committed divisor ignores NEG so divisors stay natural",
  );
  assert.deepEqual(
    euclidCommittedNegBlocked.calculator.total,
    r(5n),
    "rejected euclidean NEG does not transfer negation to total",
  );
  assert.equal(
    euclidCommittedNegBlocked.calculator.pendingNegativeTotal,
    false,
    "rejected euclidean NEG does not toggle pending total sign",
  );

  const euclidDigitRewriteNormalizesSign = applyKeyAction(
    {
      ...fullyUnlocked,
      calculator: {
        ...fullyUnlocked.calculator,
        operationSlots: [{ operator: "#", operand: -4n }],
      },
    },
    "7",
  );
  assert.deepEqual(
    euclidDigitRewriteNormalizesSign.calculator.operationSlots,
    [{ operator: "#", operand: 7n }],
    "digit rewrite on euclidean divisor always normalizes to natural number",
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
  const withBackspaceUnlocked: GameState = {
    ...fullyUnlocked,
    unlocks: {
      ...fullyUnlocked.unlocks,
      utilities: {
        ...fullyUnlocked.unlocks.utilities,
        "\u2190": true,
      },
    },
  };

  const backspaceLockedNoOp = applyKeyAction(initialState(), "\u2190");
  assert.deepEqual(backspaceLockedNoOp, initialState(), "locked backspace remains a no-op");

  const backspaceDraftingDelete: GameState = {
    ...withBackspaceUnlocked,
    calculator: {
      ...withBackspaceUnlocked.calculator,
      draftingSlot: { operator: "+", operandInput: "9", isNegative: false },
    },
  };
  const afterBackspaceDraftingDelete = applyKeyAction(backspaceDraftingDelete, "\u2190");
  assert.equal(
    afterBackspaceDraftingDelete.calculator.draftingSlot?.operandInput,
    "",
    "backspace removes last drafting operand digit",
  );

  const backspaceDraftingNegFlag: GameState = {
    ...withBackspaceUnlocked,
    calculator: {
      ...withBackspaceUnlocked.calculator,
      draftingSlot: { operator: "+", operandInput: "", isNegative: true },
    },
  };
  const afterBackspaceDraftingNegFlag = applyKeyAction(backspaceDraftingNegFlag, "\u2190");
  assert.equal(
    afterBackspaceDraftingNegFlag.calculator.draftingSlot?.isNegative,
    false,
    "backspace clears drafting negative flag when operand input is empty",
  );

  const backspaceSeedTrim: GameState = {
    ...withBackspaceUnlocked,
    calculator: {
      ...withBackspaceUnlocked.calculator,
      total: r(-42n),
      rollEntries: [],
      operationSlots: [],
      draftingSlot: null,
    },
  };
  const afterBackspaceSeedTrim = applyKeyAction(backspaceSeedTrim, "\u2190");
  assert.deepEqual(afterBackspaceSeedTrim.calculator.total, r(-4n), "backspace trims seed-entry magnitude and preserves sign");
  const afterBackspaceSeedToZero = applyKeyAction(afterBackspaceSeedTrim, "\u2190");
  assert.deepEqual(afterBackspaceSeedToZero.calculator.total, r(0n), "backspace turns single-digit seed magnitude into zero");

  const backspaceActiveRollNoOp: GameState = {
    ...withBackspaceUnlocked,
    calculator: {
      ...withBackspaceUnlocked.calculator,
      rollEntries: re(r(1n)),
    },
  };
  const afterBackspaceActiveRollNoOp = applyKeyAction(backspaceActiveRollNoOp, "\u2190");
  assert.deepEqual(afterBackspaceActiveRollNoOp.calculator, backspaceActiveRollNoOp.calculator, "backspace is no-op on active roll");

  const backspaceFunctionWalkStart: GameState = {
    ...withBackspaceUnlocked,
    calculator: {
      ...withBackspaceUnlocked.calculator,
      total: r(4n),
      operationSlots: [{ operator: "+", operand: 1n }],
      draftingSlot: { operator: "-", operandInput: "3", isNegative: false },
    },
  };
  const afterWalk1 = applyKeyAction(backspaceFunctionWalkStart, "\u2190");
  assert.equal(afterWalk1.calculator.draftingSlot?.operandInput, "", "walk 1 clears trailing operand digit");
  const afterWalk2 = applyKeyAction(afterWalk1, "\u2190");
  assert.equal(afterWalk2.calculator.draftingSlot?.operator, "+", "walk 2 removes current operator and restores previous slot operator");
  assert.equal(afterWalk2.calculator.draftingSlot?.operandInput, "1", "walk 2 restores previous slot operand");
  const afterWalk3 = applyKeyAction(afterWalk2, "\u2190");
  assert.equal(afterWalk3.calculator.draftingSlot?.operandInput, "", "walk 3 clears restored operand digit");
  const afterWalk4 = applyKeyAction(afterWalk3, "\u2190");
  assert.equal(afterWalk4.calculator.draftingSlot, null, "walk 4 removes restored operator");
  const afterWalk5 = applyKeyAction(afterWalk4, "\u2190");
  assert.deepEqual(afterWalk5.calculator.total, r(0n), "walk 5 trims seed total value");
};


