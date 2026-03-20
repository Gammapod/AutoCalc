import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { applyKeyAction } from "../src/domain/reducer.input.js";
import { OVERFLOW_ERROR_CODE, toNanCalculatorValue, toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { MAX_ROLL_ENTRIES } from "../src/domain/rollEntries.js";
import { DELTA_RANGE_CLAMP_FLAG, EXECUTION_PAUSE_EQUALS_FLAG, EXECUTION_PAUSE_FLAG, MOD_ZERO_TO_DELTA_FLAG, initialState } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import type { GameState, RollEntry } from "../src/domain/types.js";
import { legacyInitialState } from "./support/legacyState.js";

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue(rv(num, den));
const re = (...values: RollEntry["y"][]): RollEntry[] => values.map((y) => ({ y }));

export const runReducerInputTests = (): void => {
  const base = legacyInitialState();

  const freshBootNoSaveState: GameState = {
    ...base,
    ui: {
      ...base.ui,
      keyLayout: [keyCell("1"), keyCell("2"), keyCell("0")],
      keypadColumns: 3,
      keypadRows: 1,
    },
    calculator: {
      ...base.calculator,
      singleDigitInitialTotalEntry: true,
    },
    unlocks: {
      ...base.unlocks,
      valueAtoms: {
        ...base.unlocks.valueAtoms,
        [k("0")]: true,
        [k("1")]: true,
        [k("2")]: true,
      },
      valueExpression: {
        ...base.unlocks.valueExpression,
        [k("0")]: true,
        [k("1")]: true,
        [k("2")]: true,
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

  const fullyUnlocked = reducer(legacyInitialState(), { type: "UNLOCK_ALL" });
  const executionGateBase: GameState = {
    ...base,
    calculators: undefined,
    calculatorOrder: undefined,
    activeCalculatorId: undefined,
    perCalculatorCompletedUnlockIds: undefined,
    sessionControlProfiles: undefined,
    unlocks: {
      ...base.unlocks,
      maxSlots: Math.max(base.unlocks.maxSlots, 1),
      valueExpression: {
        ...base.unlocks.valueExpression,
        [k("1")]: true,
      },
      slotOperators: {
        ...base.unlocks.slotOperators,
        [op("+")]: true,
      },
      utilities: {
        ...base.unlocks.utilities,
        [k("\u2190")]: true,
      },
      execution: {
        ...base.unlocks.execution,
        [KEY_ID.exec_play_pause]: true,
        [k("=")]: true,
      },
    },
    ui: {
      ...base.ui,
      keyLayout: [
        { kind: "key", key: KEY_ID.exec_play_pause, behavior: { type: "toggle_flag", flag: EXECUTION_PAUSE_FLAG } },
        { kind: "key", key: k("1") },
        { kind: "key", key: op("+") },
        { kind: "key", key: k("\u2190") },
        { kind: "key", key: k("="), behavior: { type: "toggle_flag", flag: EXECUTION_PAUSE_EQUALS_FLAG } },
      ],
      keypadColumns: 5,
      keypadRows: 1,
      buttonFlags: {},
    },
    calculator: {
      ...base.calculator,
      total: r(5n),
      draftingSlot: { operator: op("+"), operandInput: "9", isNegative: false },
      operationSlots: [{ operator: op("+"), operand: 1n }],
    },
  };
  const withPauseOn = reducer(executionGateBase, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_FLAG });
  assert.equal(Boolean(withPauseOn.ui.buttonFlags[EXECUTION_PAUSE_FLAG]), true, "play/pause toggle turns execution pause on");
  const withPauseOff = reducer(withPauseOn, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_FLAG });
  assert.equal(Boolean(withPauseOff.ui.buttonFlags[EXECUTION_PAUSE_FLAG]), false, "play/pause toggle turns execution pause off");

  const digitRejectedWhilePaused = reducer(withPauseOn, { type: "PRESS_KEY", key: k("1") });
  assert.deepEqual(digitRejectedWhilePaused, withPauseOn, "digit input rejection is non-mutating while execution pause is active");

  const operatorRejectedWhilePaused = reducer(withPauseOn, { type: "PRESS_KEY", key: op("+") });
  assert.deepEqual(
    operatorRejectedWhilePaused,
    withPauseOn,
    "operator input rejection is non-mutating while execution pause is active",
  );

  const backspaceInterruptsAndClearsPause = reducer(withPauseOn, { type: "PRESS_KEY", key: k("\u2190") });
  assert.equal(Boolean(backspaceInterruptsAndClearsPause.ui.buttonFlags[EXECUTION_PAUSE_FLAG]), false, "utility key press clears execution pause");
  assert.notDeepEqual(backspaceInterruptsAndClearsPause.calculator, withPauseOn.calculator, "utility key still executes after clearing pause");

  const withEqualsPauseOn = reducer(executionGateBase, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_EQUALS_FLAG });
  assert.equal(Boolean(withEqualsPauseOn.ui.buttonFlags[EXECUTION_PAUSE_EQUALS_FLAG]), true, "equals toggle turns equals auto-step flag on");
  const withEqualsPauseOff = reducer(withEqualsPauseOn, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_EQUALS_FLAG });
  assert.equal(Boolean(withEqualsPauseOff.ui.buttonFlags[EXECUTION_PAUSE_EQUALS_FLAG]), false, "equals toggle turns equals auto-step flag off");

  const equalsAutoStepSource: GameState = {
    ...withEqualsPauseOn,
    calculator: {
      ...withEqualsPauseOn.calculator,
      total: r(2n),
      draftingSlot: null,
      operationSlots: [{ operator: op("+"), operand: 3n }],
      rollEntries: [],
    },
  };
  const afterEqualsAutoTick = reducer(equalsAutoStepSource, { type: "AUTO_STEP_TICK" });
  assert.equal(Boolean(afterEqualsAutoTick.ui.buttonFlags[EXECUTION_PAUSE_EQUALS_FLAG]), false, "equals toggle auto-clears after terminal auto-step roll update");
  assert.equal(afterEqualsAutoTick.calculator.rollEntries.length > 0, true, "equals toggle terminal auto-step commits roll update");

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
      operationSlots: [{ operator: op("/"), operand: 0n }],
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
      operationSlots: [{ operator: op("+"), operand: 1n }],
    },
  };
  const afterOverflow = applyKeyAction(overflowSource, "=");
  assert.deepEqual(afterOverflow.calculator.total, r(99n), "overflow clamps to boundary value");
  assert.equal(
    afterOverflow.calculator.rollEntries.at(-1)?.error?.code,
    OVERFLOW_ERROR_CODE,
    "overflow records overflow error code",
  );

  const wrapSource: GameState = {
    ...overflowSource,
    ui: {
      ...overflowSource.ui,
      buttonFlags: {
        ...overflowSource.ui.buttonFlags,
        [DELTA_RANGE_CLAMP_FLAG]: true,
      },
    },
  };
  const afterWrap = applyKeyAction(wrapSource, "=");
  assert.deepEqual(afterWrap.calculator.total, r(-98n), "delta-wrap toggle maps 100 to -98 for maxDigits=2");
  assert.equal(afterWrap.calculator.rollEntries.at(-1)?.error, undefined, "delta-wrap path does not emit overflow error");

  const wrapAtUpperEdgeSource: GameState = {
    ...wrapSource,
    calculator: {
      ...wrapSource.calculator,
      total: r(98n),
      operationSlots: [{ operator: op("+"), operand: 1n }],
    },
  };
  const afterUpperEdgeWrap = applyKeyAction(wrapAtUpperEdgeSource, "=");
  assert.deepEqual(afterUpperEdgeWrap.calculator.total, r(-99n), "delta-wrap toggle maps 98 + 1 to -99 for maxDigits=2");

  const modWrapSource: GameState = {
    ...overflowSource,
    ui: {
      ...overflowSource.ui,
      buttonFlags: {
        ...overflowSource.ui.buttonFlags,
        [MOD_ZERO_TO_DELTA_FLAG]: true,
      },
    },
  };
  const afterModWrap = applyKeyAction(modWrapSource, "=");
  assert.deepEqual(afterModWrap.calculator.total, r(1n), "mod-wrap toggle maps 100 to 1 for maxDigits=2");
  assert.equal(afterModWrap.calculator.rollEntries.at(-1)?.error, undefined, "mod-wrap path does not emit overflow error");

  const equalsSource: GameState = {
    ...legacyInitialState(),
    unlocks: {
      ...legacyInitialState().unlocks,
      execution: {
        ...legacyInitialState().unlocks.execution,
        [k("=")]: true,
      },
    },
  };
  const afterEquals = applyKeyAction(equalsSource, "=");
  assert.deepEqual(afterEquals.calculator.total, r(0n), "equals with no operations keeps total unchanged");
  assert.deepEqual(
    afterEquals.calculator.rollEntries.map((entry) => entry.y),
    [r(0n), r(0n)],
    "equals stores seed then first step in roll",
  );
  assert.equal(afterEquals.calculator.rollEntries[1]?.factorization, undefined, "zero roll result omits factorization payload");
  const afterSecondEquals = applyKeyAction(afterEquals, "=");
  assert.deepEqual(afterSecondEquals.calculator.rollEntries[0]?.y, r(0n), "subsequent equals preserve seed at index 0");

  const stepThroughSource: GameState = {
    ...fullyUnlocked,
    calculators: undefined,
    calculatorOrder: undefined,
    activeCalculatorId: undefined,
    perCalculatorCompletedUnlockIds: undefined,
    sessionControlProfiles: undefined,
    ui: {
      ...fullyUnlocked.ui,
      keyLayout: [{ kind: "key", key: k("\u25BB") }],
      keypadColumns: 1,
      keypadRows: 1,
    },
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(1n),
      operationSlots: [{ operator: op("+"), operand: 2n }, { operator: op("*"), operand: 3n }],
    },
  };
  const afterFirstStep = applyKeyAction(stepThroughSource, "\u25BB");
  assert.equal(afterFirstStep.calculator.stepProgress.active, true, "first step-through press starts step session");
  assert.equal(afterFirstStep.calculator.stepProgress.nextSlotIndex, 1, "first step-through advances cursor by one slot");
  assert.equal(afterFirstStep.calculator.rollEntries.length, 0, "intermediate step-through does not append roll entries");
  assert.deepEqual(afterFirstStep.calculator.total, r(1n), "intermediate step-through leaves total unchanged");
  assert.deepEqual(afterFirstStep.calculator.stepProgress.currentTotal, r(3n), "first step-through stores per-step result");

  const afterSecondStep = applyKeyAction(afterFirstStep, "\u25BB");
  assert.equal(afterSecondStep.calculator.stepProgress.active, false, "terminal step-through clears session");
  assert.deepEqual(afterSecondStep.calculator.total, r(9n), "terminal step-through commits final total");
  assert.equal(afterSecondStep.calculator.rollEntries.length, 2, "terminal step-through appends seed and final step exactly once");

  const autoStepSeed: GameState = {
    ...fullyUnlocked,
    calculators: undefined,
    calculatorOrder: undefined,
    activeCalculatorId: undefined,
    perCalculatorCompletedUnlockIds: undefined,
    sessionControlProfiles: undefined,
    keyPressCounts: { [k("1")]: 3 },
    ui: {
      ...fullyUnlocked.ui,
      keyLayout: [{ kind: "key", key: k("=") }],
      keypadColumns: 1,
      keypadRows: 1,
      buttonFlags: {
        ...fullyUnlocked.ui.buttonFlags,
        [EXECUTION_PAUSE_FLAG]: true,
      },
    },
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(2n),
      operationSlots: [{ operator: op("+"), operand: 3n }, { operator: op("*"), operand: 4n }],
    },
  };
  const autoStepTick1 = reducer(autoStepSeed, { type: "AUTO_STEP_TICK" });
  assert.equal(autoStepTick1.calculator.stepProgress.active, true, "AUTO_STEP_TICK starts step progress with no step key on keypad");
  assert.deepEqual(autoStepTick1.calculator.total, r(2n), "first AUTO_STEP_TICK keeps preview-only total");
  assert.equal(autoStepTick1.calculator.rollEntries.length, 0, "first AUTO_STEP_TICK does not append roll rows");
  assert.deepEqual(autoStepTick1.keyPressCounts, autoStepSeed.keyPressCounts, "AUTO_STEP_TICK does not increment key press counts");

  const autoStepTick2 = reducer(autoStepTick1, { type: "AUTO_STEP_TICK" });
  assert.equal(autoStepTick2.calculator.stepProgress.active, false, "terminal AUTO_STEP_TICK clears step progress");
  assert.deepEqual(autoStepTick2.calculator.total, r(20n), "terminal AUTO_STEP_TICK commits final total");
  assert.equal(autoStepTick2.calculator.rollEntries.length, 2, "terminal AUTO_STEP_TICK commits seed and final step exactly once");
  assert.deepEqual(autoStepTick2.keyPressCounts, autoStepSeed.keyPressCounts, "AUTO_STEP_TICK terminal commit still does not increment key press counts");

  const autoStepIdleSource: GameState = {
    ...autoStepTick2,
    ui: {
      ...autoStepTick2.ui,
      buttonFlags: {
        ...autoStepTick2.ui.buttonFlags,
        [EXECUTION_PAUSE_FLAG]: true,
      },
    },
    calculator: {
      ...autoStepTick2.calculator,
      operationSlots: [],
      draftingSlot: null,
    },
  };
  const autoStepIdle = reducer(autoStepIdleSource, { type: "AUTO_STEP_TICK" });
  assert.deepEqual(autoStepIdle.calculator, autoStepIdleSource.calculator, "AUTO_STEP_TICK is idempotent when no runnable step path exists");
  assert.deepEqual(autoStepIdle.keyPressCounts, autoStepIdleSource.keyPressCounts, "AUTO_STEP_TICK idle path preserves key-press counts");

  const equalsFromPartial = applyKeyAction(afterFirstStep, "=");
  assert.deepEqual(equalsFromPartial.calculator.total, r(9n), "equals during partial step continues from cursor");
  assert.equal(equalsFromPartial.calculator.stepProgress.active, false, "equals from partial clears step session");

  const absentStepKeyState: GameState = {
    ...afterFirstStep,
    ui: {
      ...afterFirstStep.ui,
      keyLayout: [{ kind: "key", key: k("=") }],
      keypadColumns: 1,
      keypadRows: 1,
    },
  };
  const afterAbsentStepKeyEquals = applyKeyAction(absentStepKeyState, "=");
  assert.equal(afterAbsentStepKeyEquals.calculator.stepProgress.active, false, "session clears when step key is absent on keypad");

  const stepNoSlots = applyKeyAction(
    {
      ...fullyUnlocked,
      ui: {
        ...fullyUnlocked.ui,
        keyLayout: [{ kind: "key", key: k("\u25BB") }],
      },
      calculator: {
        ...fullyUnlocked.calculator,
        operationSlots: [],
      },
    },
    "\u25BB",
  );
  assert.equal(stepNoSlots.calculator.stepProgress.active, false, "step-through with no slots is a no-op");

  let longRollState: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(0n),
      operationSlots: [{ operator: op("+"), operand: 1n }],
    },
  };
  const rollIterations = MAX_ROLL_ENTRIES + 5;
  for (let index = 0; index < rollIterations; index += 1) {
    longRollState = applyKeyAction(longRollState, "=");
  }
  assert.equal(longRollState.calculator.rollEntries.length, MAX_ROLL_ENTRIES, "roll pruning caps total entry count");
  assert.deepEqual(longRollState.calculator.rollEntries[0]?.y, r(0n), "roll pruning keeps seed row untouched");
  assert.deepEqual(
    longRollState.calculator.rollEntries[1]?.y,
    r(7n),
    "roll pruning drops oldest step rows once cap is exceeded",
  );
  assert.deepEqual(
    longRollState.calculator.rollEntries.at(-1)?.y,
    r(BigInt(rollIterations)),
    "roll pruning preserves most recent step row",
  );

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

  const lockedUnaryFromKeypad = applyKeyAction(legacyInitialState(), "++");
  assert.equal(lockedUnaryFromKeypad.keyPressCounts[uop("++")] ?? 0, 1, "locked keypad-installed unary key still counts as a press");

  const unaryPlus = applyKeyAction(fullyUnlocked, "++");
  assert.deepEqual(unaryPlus.calculator.operationSlots, [{ kind: "unary", operator: uop("++") }], "++ appends unary slot");
  assert.equal(unaryPlus.calculator.draftingSlot, null, "++ does not create drafting slot");

  const unaryMinus = applyKeyAction(fullyUnlocked, "--");
  assert.deepEqual(unaryMinus.calculator.operationSlots, [{ kind: "unary", operator: uop("--") }], "-- appends unary slot");

  const unaryNegate = applyKeyAction(fullyUnlocked, "-n");
  assert.deepEqual(unaryNegate.calculator.operationSlots, [{ kind: "unary", operator: uop("-n") }], "-n appends unary slot");

  const unaryAfterFilledDrafting = applyKeyAction(
    applyKeyAction(
      applyKeyAction(fullyUnlocked, "5"),
      "-",
    ),
    "2",
  );
  const unaryAfterFilledDraftingResult = applyKeyAction(unaryAfterFilledDrafting, "++");
  assert.deepEqual(
    unaryAfterFilledDraftingResult.calculator.operationSlots,
    [{ kind: "binary", operator: op("-"), operand: 2n }, { kind: "unary", operator: uop("++") }],
    "unary after filled draft commits binary draft first, then appends unary slot",
  );
  assert.equal(unaryAfterFilledDraftingResult.calculator.draftingSlot, null, "unary after filled draft clears drafting slot");

  const unaryAfterEmptyDrafting = applyKeyAction(
    applyKeyAction(fullyUnlocked, "5"),
    "-",
  );
  const unaryAfterEmptyDraftingResult = applyKeyAction(unaryAfterEmptyDrafting, "++");
  assert.deepEqual(
    unaryAfterEmptyDraftingResult.calculator.operationSlots,
    [{ kind: "unary", operator: uop("++") }],
    "unary after empty draft discards draft and appends unary slot",
  );
  const digitAfterUnaryWithNoDraft = applyKeyAction(unaryAfterEmptyDraftingResult, "2");
  assert.deepEqual(
    digitAfterUnaryWithNoDraft.calculator.total,
    r(5n),
    "digit after unary without drafting does not edit seed total",
  );
  assert.deepEqual(
    digitAfterUnaryWithNoDraft.calculator.operationSlots,
    [{ kind: "unary", operator: uop("++") }],
    "digit after unary without drafting keeps unary slot unchanged",
  );

  const activeRollUnarySource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(5n),
      rollEntries: re(r(5n)),
      operationSlots: [{ operator: op("+"), operand: 9n }],
      draftingSlot: { operator: op("-"), operandInput: "2", isNegative: false },
    },
  };
  const activeRollUnary = applyKeyAction(activeRollUnarySource, "++");
  assert.equal(activeRollUnary.calculator.rollEntries.length, 0, "unary key clears active roll before insertion");
  assert.deepEqual(
    activeRollUnary.calculator.operationSlots,
    [{ kind: "unary", operator: uop("++") }],
    "unary key appends unary slot after roll clear",
  );

  const moduloExecutionSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(10n),
      operationSlots: [{ operator: op("\u27E1"), operand: 4n }],
    },
  };
  const afterModuloExecution = applyKeyAction(moduloExecutionSource, "=");
  assert.deepEqual(afterModuloExecution.calculator.rollEntries[0]?.y, r(10n), "first equals stores current seed at index 0");
  assert.deepEqual(afterModuloExecution.calculator.total, r(2n), "modulo execution sets total to the modulo component");
  assert.deepEqual(
    afterModuloExecution.calculator.rollEntries.at(-1)?.remainder,
    { num: 2n, den: 1n },
    "modulo execution records the modulo component as roll remainder",
  );
  assert.deepEqual(
    afterModuloExecution.calculator.rollEntries.at(-1)?.factorization,
    { sign: 1, numerator: [{ prime: 2n, exponent: 1 }], denominator: [] },
    "rational roll result stores factorization payload",
  );

  const rotateExecutionSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(12345n),
      operationSlots: [{ operator: op("\u21BA"), operand: -2n }],
    },
  };
  const afterRotateExecution = applyKeyAction(rotateExecutionSource, "=");
  assert.deepEqual(afterRotateExecution.calculator.total, r(45123n), "rotate-left supports negative shift as right rotation");

  const gcdExecutionSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(12n),
      operationSlots: [{ operator: op("\u2A51"), operand: 18n }],
    },
  };
  const afterGcdExecution = applyKeyAction(gcdExecutionSource, "=");
  assert.deepEqual(afterGcdExecution.calculator.total, r(6n), "gcd operator returns greatest common divisor");

  const lcmExecutionSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(12n),
      operationSlots: [{ operator: op("\u2A52"), operand: 18n }],
    },
  };
  const afterLcmExecution = applyKeyAction(lcmExecutionSource, "=");
  assert.deepEqual(afterLcmExecution.calculator.total, r(36n), "lcm operator returns least common multiple");

  const sigmaExecutionSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(6n),
      operationSlots: [{ kind: "unary", operator: uop("\u03C3") }],
    },
  };
  const afterSigmaExecution = applyKeyAction(sigmaExecutionSource, "=");
  assert.deepEqual(afterSigmaExecution.calculator.total, r(12n), "sigma unary returns sum of divisors");

  const phiExecutionSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(13n),
      operationSlots: [{ kind: "unary", operator: uop("\u03C6") }],
    },
  };
  const afterPhiExecution = applyKeyAction(phiExecutionSource, "=");
  assert.deepEqual(afterPhiExecution.calculator.total, r(12n), "phi unary returns Euler totient");

  const omegaExecutionSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(153n),
      operationSlots: [{ kind: "unary", operator: uop("\u03A9") }],
    },
  };
  const afterOmegaExecution = applyKeyAction(omegaExecutionSource, "=");
  assert.deepEqual(afterOmegaExecution.calculator.total, r(3n), "omega unary returns prime factors with multiplicity");

  const sigmaZeroExecutionSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(0n),
      operationSlots: [{ kind: "unary", operator: uop("\u03C3") }],
    },
  };
  const afterSigmaZeroExecution = applyKeyAction(sigmaZeroExecutionSource, "=");
  assert.deepEqual(afterSigmaZeroExecution.calculator.total, toNanCalculatorValue(), "sigma at zero returns NaN");
  assert.equal(afterSigmaZeroExecution.calculator.rollEntries.at(-1)?.error?.code, "NaN", "sigma at zero records NaN input error");

  const symbolicPiCancellationSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(0n),
      operationSlots: [
        { operator: op("+"), operand: { type: "constant", value: "pi" } },
        { operator: op("-"), operand: { type: "constant", value: "pi" } },
      ],
    },
  };
  const afterPiCancellation = applyKeyAction(symbolicPiCancellationSource, "=");
  assert.deepEqual(afterPiCancellation.calculator.total, r(0n), "symbolic pi cancellation resolves to exact rational");
  assert.equal(afterPiCancellation.calculator.rollEntries.at(-1)?.error, undefined, "rational symbolic simplification is not an error");
  assert.ok(afterPiCancellation.calculator.rollEntries.at(-1)?.symbolic, "rational symbolic simplification records symbolic payload");
  assert.equal(
    afterPiCancellation.calculator.rollEntries.at(-1)?.symbolic?.exprText,
    "((f_n(x)op_addpi)op_subpi)",
    "symbolic payload key tracks builder recurrence signature",
  );

  const symbolicECancellationSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(1n),
      operationSlots: [
        { operator: op("*"), operand: { type: "constant", value: "e" } },
        { operator: op("/"), operand: { type: "constant", value: "e" } },
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
      operationSlots: [{ operator: op("+"), operand: { type: "constant", value: "pi" } }],
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

  const euclidDigitRewriteNormalizesSign = applyKeyAction(
    {
      ...fullyUnlocked,
      calculator: {
        ...fullyUnlocked.calculator,
        operationSlots: [{ operator: op("#"), operand: -4n }],
      },
    },
    "7",
  );
  assert.deepEqual(
    euclidDigitRewriteNormalizesSign.calculator.operationSlots,
    [{ operator: op("#"), operand: 7n }],
    "digit rewrite on euclidean divisor always normalizes to natural number",
  );

  const clearSeedSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(9n),
      rollEntries: re(r(9n)),
    },
  };
  const afterC = applyKeyAction(clearSeedSource, "C");
  assert.equal(afterC.calculator.rollEntries.length, 0, "C clears roll entries");
  assert.equal(afterC.calculator.rollAnalysis.stopReason, "none", "C resets roll analysis state");

  const undoSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(6n),
      rollEntries: re(r(5n), r(6n)),
      stepProgress: {
        active: true,
        seedTotal: r(5n),
        currentTotal: r(6n),
        nextSlotIndex: 1,
        executedSlotResults: [r(6n)],
      },
    },
  };
  const afterUndo = applyKeyAction(undoSource, "UNDO");
  assert.deepEqual(afterUndo.calculator.total, r(5n), "UNDO restores prior trajectory value");
  assert.deepEqual(afterUndo.calculator.rollEntries, re(r(5n)), "UNDO removes last step and keeps seed row");
  assert.equal(afterUndo.calculator.stepProgress.active, false, "UNDO cancels active step session");

  const memoryCycleLocked = legacyInitialState();
  const afterLockedMemoryCycle = applyKeyAction(memoryCycleLocked, "α,β,γ");
  assert.equal(afterLockedMemoryCycle.ui.memoryVariable, "α", "locked memory-cycle key does not change selected variable");

  const memoryCycleUnlocked: GameState = {
    ...legacyInitialState(),
    unlocks: {
      ...legacyInitialState().unlocks,
      memory: {
        ...legacyInitialState().unlocks.memory,
        [k("α,β,γ")]: true,
      },
    },
  };
  const afterFirstMemoryCycle = applyKeyAction(memoryCycleUnlocked, "α,β,γ");
  assert.equal(afterFirstMemoryCycle.ui.memoryVariable, "β", "memory-cycle key advances α to β");
  const afterSecondMemoryCycle = applyKeyAction(afterFirstMemoryCycle, "α,β,γ");
  assert.equal(afterSecondMemoryCycle.ui.memoryVariable, "γ", "memory-cycle key advances β to γ");
  const afterThirdMemoryCycle = applyKeyAction(afterSecondMemoryCycle, "α,β,γ");
  assert.equal(afterThirdMemoryCycle.ui.memoryVariable, "α", "memory-cycle key wraps γ to α");

  const memoryPlusBase = legacyInitialState();
  const memoryPlusBaseColumns = memoryPlusBase.ui.keypadColumns;
  const memoryPlusBaseRows = memoryPlusBase.ui.keypadRows;
  const memoryPlusBaseSlots = memoryPlusBase.unlocks.maxSlots;
  const memoryPlusUnlocked: GameState = {
    ...memoryPlusBase,
    lambdaControl: {
      ...memoryPlusBase.lambdaControl,
      maxPoints: 8,
    },
    allocator: {
      ...memoryPlusBase.allocator,
      maxPoints: 8,
    },
    unlocks: {
      ...memoryPlusBase.unlocks,
      memory: {
        ...memoryPlusBase.unlocks.memory,
        [k("M+")]: true,
      },
    },
  };
  const plusAlpha = applyKeyAction({ ...memoryPlusUnlocked, ui: { ...memoryPlusUnlocked.ui, memoryVariable: "α" } }, "M+");
  assert.equal(plusAlpha.ui.keypadColumns, memoryPlusBaseColumns + 1, "M+ with α increases keypad columns");
  const plusBeta = applyKeyAction({ ...memoryPlusUnlocked, ui: { ...memoryPlusUnlocked.ui, memoryVariable: "β" } }, "M+");
  assert.equal(plusBeta.ui.keypadRows, memoryPlusBaseRows + 1, "M+ with β increases keypad rows");
  const plusGamma = applyKeyAction({ ...memoryPlusUnlocked, ui: { ...memoryPlusUnlocked.ui, memoryVariable: "γ" } }, "M+");
  assert.equal(plusGamma.unlocks.maxSlots, memoryPlusBaseSlots + 1, "M+ with γ increases operation slot count");

  const memoryMinusBase = legacyInitialState();
  const memoryMinusUnlocked: GameState = {
    ...memoryMinusBase,
    lambdaControl: {
      ...memoryMinusBase.lambdaControl,
      maxPoints: 5,
      alpha: 2,
      beta: 2,
      gamma: 1,
      gammaMinRaised: true,
    },
    allocator: {
      ...memoryMinusBase.allocator,
      maxPoints: 5,
      allocations: {
        ...memoryMinusBase.allocator.allocations,
        width: 2,
        height: 2,
        slots: 1,
      },
    },
    unlocks: {
      ...memoryMinusBase.unlocks,
      memory: {
        ...memoryMinusBase.unlocks.memory,
        [k("M–")]: true,
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
  assert.equal(minusGamma.unlocks.maxSlots, 1, "M– with γ respects gamma minimum once gamma has been raised");
  const withBackspaceUnlocked: GameState = {
    ...fullyUnlocked,
    unlocks: {
      ...fullyUnlocked.unlocks,
      utilities: {
        ...fullyUnlocked.unlocks.utilities,
        [k("\u2190")]: true,
      },
    },
  };

  const backspaceLockedNoOp = applyKeyAction(legacyInitialState(), "\u2190");
  assert.deepEqual(backspaceLockedNoOp, legacyInitialState(), "locked backspace remains a no-op");

  const backspaceDraftingDelete: GameState = {
    ...withBackspaceUnlocked,
    calculator: {
      ...withBackspaceUnlocked.calculator,
      draftingSlot: { operator: op("+"), operandInput: "9", isNegative: false },
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
      draftingSlot: { operator: op("+"), operandInput: "", isNegative: true },
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
      stepProgress: {
        active: true,
        seedTotal: r(1n),
        currentTotal: r(2n),
        nextSlotIndex: 1,
        executedSlotResults: [r(2n)],
      },
    },
  };
  const afterBackspaceActiveRollNoOp = applyKeyAction(backspaceActiveRollNoOp, "\u2190");
  assert.equal(afterBackspaceActiveRollNoOp.calculator.stepProgress.active, false, "backspace cancels active step session");
  assert.deepEqual(afterBackspaceActiveRollNoOp.calculator.rollEntries, backspaceActiveRollNoOp.calculator.rollEntries, "backspace remains no-op on active roll entries");

  const backspaceFunctionWalkStart: GameState = {
    ...withBackspaceUnlocked,
    calculator: {
      ...withBackspaceUnlocked.calculator,
      total: r(4n),
      operationSlots: [{ operator: op("+"), operand: 1n }],
      draftingSlot: { operator: op("-"), operandInput: "3", isNegative: false },
    },
  };
  const afterWalk1 = applyKeyAction(backspaceFunctionWalkStart, "\u2190");
  assert.equal(afterWalk1.calculator.draftingSlot?.operandInput, "", "walk 1 clears trailing operand digit");
  const afterWalk2 = applyKeyAction(afterWalk1, "\u2190");
  assert.equal(afterWalk2.calculator.draftingSlot?.operator, op("+"), "walk 2 removes current operator and restores previous slot operator");
  assert.equal(afterWalk2.calculator.draftingSlot?.operandInput, "1", "walk 2 restores previous slot operand");
  const afterWalk3 = applyKeyAction(afterWalk2, "\u2190");
  assert.equal(afterWalk3.calculator.draftingSlot?.operandInput, "", "walk 3 clears restored operand digit");
  const afterWalk4 = applyKeyAction(afterWalk3, "\u2190");
  assert.equal(afterWalk4.calculator.draftingSlot, null, "walk 4 removes restored operator");
  const afterWalk5 = applyKeyAction(afterWalk4, "\u2190");
  assert.deepEqual(afterWalk5.calculator.total, r(0n), "walk 5 trims seed total value");
};









