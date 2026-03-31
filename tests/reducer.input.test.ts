import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { applyKeyAction } from "../src/domain/reducer.input.js";
import {
  calculatorValuesEquivalent,
  OVERFLOW_ERROR_CODE,
  toComplexCalculatorValue,
  toNanCalculatorValue,
  toRationalCalculatorValue,
  toRationalScalarValue,
} from "../src/domain/calculatorValue.js";
import { MAX_ROLL_ENTRIES } from "../src/domain/rollEntries.js";
import { getRollYDomain } from "../src/domain/rollDerived.js";
import { DELTA_RANGE_CLAMP_FLAG, EXECUTION_PAUSE_EQUALS_FLAG, EXECUTION_PAUSE_FLAG, MOD_ZERO_TO_DELTA_FLAG, initialState } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import { normalizeRuntimeStateInvariants } from "../src/domain/runtimeStateInvariants.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import type { GameState, RollEntry } from "../src/domain/types.js";
import { legacyInitialState } from "./support/legacyState.js";

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue(rv(num, den));
const re = (...values: RollEntry["y"][]): RollEntry[] => values.map((y) => ({ y }));
const analysisRows = (entries: RollEntry[]): RollEntry[] => entries.filter((entry) => !entry.analysisIgnored);
const assertTotalEquivalent = (actual: GameState["calculator"]["total"], expected: GameState["calculator"]["total"], message: string): void => {
  assert.equal(calculatorValuesEquivalent(actual, expected), true, message);
};
const assertValueEquivalent = (
  actual: GameState["calculator"]["total"] | null | undefined,
  expected: GameState["calculator"]["total"],
  message: string,
): void => {
  assert.equal(Boolean(actual), true, `${message} (actual exists)`);
  assert.equal(calculatorValuesEquivalent(actual ?? toNanCalculatorValue(), expected), true, message);
};
const assertRollSequenceEquivalent = (
  actual: GameState["calculator"]["rollEntries"],
  expected: GameState["calculator"]["total"][],
  message: string,
): void => {
  assert.equal(actual.length, expected.length, `${message} (length)`);
  for (let index = 0; index < expected.length; index += 1) {
    assertValueEquivalent(actual[index]?.y, expected[index], `${message} (index ${index})`);
  }
};
const assertValueSequenceEquivalent = (
  actual: GameState["calculator"]["total"][],
  expected: GameState["calculator"]["total"][],
  message: string,
): void => {
  assert.equal(actual.length, expected.length, `${message} (length)`);
  for (let index = 0; index < expected.length; index += 1) {
    assert.equal(calculatorValuesEquivalent(actual[index], expected[index]), true, `${message} (index ${index})`);
  }
};

export const runReducerInputTests = (): void => {
  const base = legacyInitialState();

  const freshBootNoSaveState: GameState = {
    ...base,
    ui: {
      ...base.ui,
      keyLayout: [keyCell("digit_1"), keyCell("digit_2"), keyCell("digit_0")],
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
        [k("digit_0")]: true,
        [k("digit_1")]: true,
        [k("digit_2")]: true,
      },
      valueExpression: {
        ...base.unlocks.valueExpression,
        [k("digit_0")]: true,
        [k("digit_1")]: true,
        [k("digit_2")]: true,
      },
    },
  };
  const freshFirstDigit = applyKeyAction(freshBootNoSaveState, "digit_1");
  assertTotalEquivalent(freshFirstDigit.calculator.total, r(1n), "fresh boot accepts one initial total digit");
  assert.equal(
    freshFirstDigit.calculator.singleDigitInitialTotalEntry,
    false,
    "entering a seed digit marks seed as present",
  );
  const freshBlockedSecondDigit = applyKeyAction(freshFirstDigit, "digit_2");
  assert.deepEqual(
    freshBlockedSecondDigit.calculator.total,
    r(2n),
    "fresh boot replaces a second initial total digit",
  );

  const freshZeroSeed = applyKeyAction(freshBootNoSaveState, "digit_0");
  assertTotalEquivalent(freshZeroSeed.calculator.total, r(0n), "fresh boot accepts zero seed input");
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
        [k("digit_1")]: true,
      },
      slotOperators: {
        ...base.unlocks.slotOperators,
        [op("op_add")]: true,
      },
      utilities: {
        ...base.unlocks.utilities,
        [k("util_backspace")]: true,
      },
      execution: {
        ...base.unlocks.execution,
        [KEY_ID.exec_play_pause]: true,
        [k("exec_equals")]: true,
      },
    },
    ui: {
      ...base.ui,
      keyLayout: [
        { kind: "key", key: KEY_ID.exec_play_pause, behavior: { type: "toggle_flag", flag: EXECUTION_PAUSE_FLAG } },
        { kind: "key", key: k("digit_1") },
        { kind: "key", key: op("op_add") },
        { kind: "key", key: k("util_backspace") },
        { kind: "key", key: k("exec_equals"), behavior: { type: "toggle_flag", flag: EXECUTION_PAUSE_EQUALS_FLAG } },
      ],
      keypadColumns: 5,
      keypadRows: 1,
      buttonFlags: {},
    },
    calculator: {
      ...base.calculator,
      total: r(5n),
      draftingSlot: { operator: op("op_add"), operandInput: "9", isNegative: false },
      operationSlots: [{ operator: op("op_add"), operand: 1n }],
    },
  };
  const withPauseOn = reducer(executionGateBase, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_FLAG });
  assert.equal(Boolean(withPauseOn.ui.buttonFlags[EXECUTION_PAUSE_FLAG]), true, "play/pause toggle turns execution pause on");
  const withPauseOff = reducer(withPauseOn, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_FLAG });
  assert.equal(Boolean(withPauseOff.ui.buttonFlags[EXECUTION_PAUSE_FLAG]), false, "play/pause toggle turns execution pause off");

  const digitRejectedWhilePaused = reducer(withPauseOn, { type: "PRESS_KEY", key: k("digit_1") });
  assert.deepEqual(digitRejectedWhilePaused, withPauseOn, "digit input rejection is non-mutating while execution pause is active");

  const operatorRejectedWhilePaused = reducer(withPauseOn, { type: "PRESS_KEY", key: op("op_add") });
  assert.deepEqual(
    operatorRejectedWhilePaused,
    withPauseOn,
    "operator input rejection is non-mutating while execution pause is active",
  );

  const backspaceInterruptsAndClearsPause = reducer(withPauseOn, { type: "PRESS_KEY", key: k("util_backspace") });
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
      operationSlots: [{ operator: op("op_add"), operand: 3n }],
      rollEntries: [],
    },
  };
  const afterEqualsAutoTick = reducer(equalsAutoStepSource, { type: "AUTO_STEP_TICK" });
  assert.equal(Boolean(afterEqualsAutoTick.ui.buttonFlags[EXECUTION_PAUSE_EQUALS_FLAG]), false, "equals toggle auto-clears after terminal auto-step roll update");
  assert.equal(afterEqualsAutoTick.calculator.rollEntries.length > 0, true, "equals toggle terminal auto-step commits roll update");

  const firstFreshDigit = applyKeyAction(fullyUnlocked, "digit_9");
  assertTotalEquivalent(firstFreshDigit.calculator.total, r(9n), "first total digit on fresh cleared save is accepted");
  const blockedFreshSecondDigit = applyKeyAction(firstFreshDigit, "digit_8");
  assert.deepEqual(
    blockedFreshSecondDigit.calculator.total,
    r(8n),
    "second total digit on fresh cleared save replaces first seed digit",
  );

  const afterClear = applyKeyAction(fullyUnlocked, "util_clear_all");
  const firstTotalDigit = applyKeyAction(afterClear, "digit_9");
  assertTotalEquivalent(firstTotalDigit.calculator.total, r(9n), "first total digit after clear is accepted");
  const blockedSecondTotalDigit = applyKeyAction(firstTotalDigit, "digit_8");
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
      operationSlots: [{ operator: op("op_div"), operand: 0n }],
    },
  };
  const afterDivByZero = applyKeyAction(divByZeroSource, "exec_equals");
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
  const afterNanEquals = applyKeyAction(nanInputSource, "exec_equals");
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
      operationSlots: [{ operator: op("op_add"), operand: 1n }],
    },
  };
  const afterOverflow = applyKeyAction(overflowSource, "exec_equals");
  assertTotalEquivalent(afterOverflow.calculator.total, r(99n), "overflow clamps to boundary value");
  assert.equal(
    afterOverflow.calculator.rollEntries.at(-1)?.error?.code,
    OVERFLOW_ERROR_CODE,
    "overflow records overflow error code",
  );

  const wrapSource: GameState = {
    ...overflowSource,
    settings: {
      ...overflowSource.settings,
      wrapper: "delta_range_clamp",
    },
  };
  const afterWrap = applyKeyAction(wrapSource, "exec_equals");
  assertTotalEquivalent(afterWrap.calculator.total, r(-98n), "delta-wrap toggle maps 100 to -98 for maxDigits=2");
  assert.equal(afterWrap.calculator.rollEntries.at(-1)?.error, undefined, "delta-wrap path does not emit overflow error");

  const wrapAtUpperEdgeSource: GameState = {
    ...wrapSource,
    calculator: {
      ...wrapSource.calculator,
      total: r(98n),
      operationSlots: [{ operator: op("op_add"), operand: 1n }],
    },
  };
  const afterUpperEdgeWrap = applyKeyAction(wrapAtUpperEdgeSource, "exec_equals");
  assertTotalEquivalent(afterUpperEdgeWrap.calculator.total, r(-99n), "delta-wrap toggle maps 98 + 1 to -99 for maxDigits=2");

  const modWrapSource: GameState = {
    ...overflowSource,
    settings: {
      ...overflowSource.settings,
      wrapper: "mod_zero_to_delta",
    },
  };
  const afterModWrap = applyKeyAction(modWrapSource, "exec_equals");
  assertTotalEquivalent(afterModWrap.calculator.total, r(1n), "mod-wrap toggle maps 100 to 1 for maxDigits=2");
  assert.equal(afterModWrap.calculator.rollEntries.at(-1)?.error, undefined, "mod-wrap path does not emit overflow error");

  const equalsSource: GameState = {
    ...legacyInitialState(),
    unlocks: {
      ...legacyInitialState().unlocks,
      execution: {
        ...legacyInitialState().unlocks.execution,
        [k("exec_equals")]: true,
      },
    },
  };
  const afterEquals = applyKeyAction(equalsSource, "exec_equals");
  assertTotalEquivalent(afterEquals.calculator.total, r(0n), "equals with no operations keeps total unchanged");
  assertRollSequenceEquivalent(afterEquals.calculator.rollEntries, [r(0n), r(0n)], "equals stores seed then first step in roll");
  assert.equal(afterEquals.calculator.rollEntries[1]?.factorization, undefined, "zero roll result omits factorization payload");
  const afterSecondEquals = applyKeyAction(afterEquals, "exec_equals");
  assertValueEquivalent(afterSecondEquals.calculator.rollEntries[0]?.y, r(0n), "subsequent equals preserve seed at index 0");

  const unaryIExecutionSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(3n),
      operationSlots: [{ kind: "unary", operator: uop("unary_i") }],
    },
  };
  const afterUnaryI = applyKeyAction(unaryIExecutionSource, "exec_equals");
  assert.deepEqual(
    afterUnaryI.calculator.total,
    toComplexCalculatorValue(
      toRationalScalarValue({ num: 0n, den: 1n }),
      toRationalScalarValue({ num: 3n, den: 1n }),
    ),
    "equals with unary-i maps real input to pure-imaginary complex result",
  );
  assert.equal(afterUnaryI.calculator.rollEntries.at(-1)?.error, undefined, "unary-i execution does not emit error");
  assert.equal(
    getRollYDomain(afterUnaryI.calculator.rollEntries.at(-1)?.y ?? toNanCalculatorValue()),
    "\u{1D540}(\u2119)",
    "pure-imaginary prime result projects to I(P)",
  );

  const afterUnaryITwice = applyKeyAction(afterUnaryI, "exec_equals");
  assertTotalEquivalent(afterUnaryITwice.calculator.total, r(-3n), "applying unary-i twice rotates back to negative real");
  assert.equal(
    getRollYDomain(afterUnaryITwice.calculator.rollEntries.at(-1)?.y ?? toNanCalculatorValue()),
    "\u2124",
    "second unary-i result projects to integer domain",
  );

  const rollInverseRejectEmpty: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(0n),
      rollEntries: [],
    },
  };
  assert.deepEqual(
    applyKeyAction(rollInverseRejectEmpty, "exec_roll_inverse"),
    rollInverseRejectEmpty,
    "roll-inverse rejects when roll is empty",
  );

  const rollInverseRejectLengthOne: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(5n),
      rollEntries: re(r(5n)),
    },
  };
  assert.deepEqual(
    applyKeyAction(rollInverseRejectLengthOne, "exec_roll_inverse"),
    rollInverseRejectLengthOne,
    "roll-inverse rejects when roll length is 1",
  );

  const rollInverseSeedMatchAllowed: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(5n),
      rollEntries: re(r(5n), r(7n), r(5n)),
    },
  };
  const afterRollInverseSeedMatch = applyKeyAction(rollInverseSeedMatchAllowed, "exec_roll_inverse");
  assert.deepEqual(
    afterRollInverseSeedMatch.calculator.total,
    r(7n),
    "roll-inverse allows current=seed and appends predecessor of first matched instance in scan range",
  );
  assertValueEquivalent(afterRollInverseSeedMatch.calculator.rollEntries.at(-1)?.y, r(7n), "roll-inverse appends predecessor when current equals seed");

  const rollInverseRejectError: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(4n),
      rollEntries: [
        { y: r(1n) },
        { y: toNanCalculatorValue(), error: { code: "NaN", kind: "nan_input" } },
        { y: r(4n) },
      ],
    },
  };
  assert.deepEqual(
    applyKeyAction(rollInverseRejectError, "exec_roll_inverse"),
    rollInverseRejectError,
    "roll-inverse rejects when any roll row has error",
  );

  const rollInverseRejectAtCap: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(4999n),
      rollEntries: Array.from({ length: MAX_ROLL_ENTRIES }, (_, index) => ({ y: r(BigInt(index)) })),
    },
  };
  assert.deepEqual(
    applyKeyAction(rollInverseRejectAtCap, "exec_roll_inverse"),
    rollInverseRejectAtCap,
    "roll-inverse rejects when roll length has reached pruning cap",
  );

  const rollInverseCurrentOnlyMatch: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(3n),
      rollEntries: re(r(1n), r(2n), r(3n)),
    },
  };
  const afterRollInverseCurrentOnly = applyKeyAction(rollInverseCurrentOnlyMatch, "exec_roll_inverse");
  assertTotalEquivalent(afterRollInverseCurrentOnly.calculator.total, r(2n), "roll-inverse appends immediate previous row when current is first match");
  assertValueEquivalent(afterRollInverseCurrentOnly.calculator.rollEntries.at(-1)?.y, r(2n), "roll-inverse appends expected predecessor value");

  const rollInverseIndexOneMatch: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(7n),
      rollEntries: re(r(5n), r(7n), r(9n), r(7n)),
    },
  };
  const afterRollInverseIndexOne = applyKeyAction(rollInverseIndexOneMatch, "exec_roll_inverse");
  assertTotalEquivalent(afterRollInverseIndexOne.calculator.total, r(5n), "roll-inverse can return seed when earliest match is at index 1");
  assertValueEquivalent(afterRollInverseIndexOne.calculator.rollEntries.at(-1)?.y, r(5n), "roll-inverse appends seed predecessor for index-1 match");

  const rollInverseMultipleMatch: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(8n),
      rollEntries: re(r(4n), r(8n), r(6n), r(8n), r(8n)),
    },
  };
  const afterRollInverseMultiple = applyKeyAction(rollInverseMultipleMatch, "exec_roll_inverse");
  assertTotalEquivalent(afterRollInverseMultiple.calculator.total, r(4n), "roll-inverse uses predecessor of earliest match in scan range");
  assertValueEquivalent(afterRollInverseMultiple.calculator.rollEntries.at(-1)?.y, r(4n), "roll-inverse appends predecessor of earliest match");

  const forwardOnlySource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(0n),
      operationSlots: [{ operator: op("op_add"), operand: 1n }],
      rollEntries: [],
      rollAnalysis: { stopReason: "none", cycle: null },
    },
  };
  const forwardEq1 = applyKeyAction(forwardOnlySource, "exec_equals");
  const forwardEq2 = applyKeyAction(forwardEq1, "exec_equals");
  assertRollSequenceEquivalent(forwardEq2.calculator.rollEntries, [r(0n), r(1n), r(2n)], "setup path builds [0,1,2]");

  const forwardInv1 = applyKeyAction(forwardEq2, "exec_roll_inverse");
  assertRollSequenceEquivalent(forwardInv1.calculator.rollEntries, [r(0n), r(1n), r(2n), r(1n)], "inverse appends visible predecessor row");
  assert.equal(Boolean(forwardInv1.calculator.rollEntries[2]?.analysisIgnored), true, "inverse marks exited tail row ignored");
  assert.equal(Boolean(forwardInv1.calculator.rollEntries[3]?.analysisIgnored), true, "inverse row is ignored for analysis");
  assertValueSequenceEquivalent(
    analysisRows(forwardInv1.calculator.rollEntries).map((entry) => entry.y),
    [r(0n), r(1n)],
    "analysis projection treats inverse as undo-like rewind",
  );

  const forwardEq3 = applyKeyAction(forwardInv1, "exec_equals");
  const forwardEq4 = applyKeyAction(forwardEq3, "exec_equals");
  assertValueSequenceEquivalent(
    analysisRows(forwardEq4.calculator.rollEntries).map((entry) => entry.y),
    [r(0n), r(1n), r(2n), r(3n)],
    "analysis projection regrows on forward equals rows",
  );

  const forwardInv2 = applyKeyAction(forwardEq4, "exec_roll_inverse");
  assert.equal(Boolean(forwardInv2.calculator.rollEntries[5]?.analysisIgnored), true, "second inverse marks prior forward tail ignored");
  assert.equal(Boolean(forwardInv2.calculator.rollEntries[6]?.analysisIgnored), true, "second inverse appended row is ignored");

  const forwardUndo = applyKeyAction(forwardInv2, "util_undo");
  assertValueSequenceEquivalent(
    analysisRows(forwardUndo.calculator.rollEntries).map((entry) => entry.y),
    [r(0n), r(1n), r(2n), r(3n)],
    "undo after inverse recomputes ignored flags and restores forward-only projection",
  );

  const forwardEq5 = applyKeyAction(forwardUndo, "exec_equals");
  const forwardInv3 = applyKeyAction(forwardEq5, "exec_roll_inverse");
  const forwardEq6 = applyKeyAction(forwardInv3, "exec_equals");
  const forwardEq7 = applyKeyAction(forwardEq6, "exec_equals");
  assertValueSequenceEquivalent(
    analysisRows(forwardEq7.calculator.rollEntries).map((entry) => entry.y),
    [r(0n), r(1n), r(2n), r(3n), r(4n), r(5n)],
    "forward-only analysis path ignores inverse detours and remains monotonic",
  );
  assert.equal(forwardEq7.calculator.rollAnalysis.stopReason, "none", "forward-only path does not falsely lock cycle analysis");
  assert.equal(forwardEq7.calculator.rollAnalysis.cycle, null, "forward-only path keeps cycle metadata clear");

  const stepThroughSource: GameState = {
    ...fullyUnlocked,
    calculators: undefined,
    calculatorOrder: undefined,
    activeCalculatorId: undefined,
    perCalculatorCompletedUnlockIds: undefined,
    sessionControlProfiles: undefined,
    ui: {
      ...fullyUnlocked.ui,
      keyLayout: [{ kind: "key", key: k("exec_step_through") }],
      keypadColumns: 1,
      keypadRows: 1,
    },
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(1n),
      operationSlots: [{ operator: op("op_add"), operand: 2n }, { operator: op("op_mul"), operand: 3n }],
    },
  };
  const afterFirstStep = applyKeyAction(stepThroughSource, "exec_step_through");
  assert.equal(afterFirstStep.calculator.stepProgress.active, true, "first step-through press starts step session");
  assert.equal(afterFirstStep.calculator.stepProgress.nextSlotIndex, 1, "first step-through advances cursor by one slot");
  assert.equal(afterFirstStep.calculator.rollEntries.length, 0, "intermediate step-through does not append roll entries");
  assertTotalEquivalent(afterFirstStep.calculator.total, r(1n), "intermediate step-through leaves total unchanged");
  assertValueEquivalent(afterFirstStep.calculator.stepProgress.currentTotal, r(3n), "first step-through stores per-step result");

  const afterSecondStep = applyKeyAction(afterFirstStep, "exec_step_through");
  assert.equal(afterSecondStep.calculator.stepProgress.active, false, "terminal step-through clears session");
  assertTotalEquivalent(afterSecondStep.calculator.total, r(9n), "terminal step-through commits final total");
  assert.equal(afterSecondStep.calculator.rollEntries.length, 2, "terminal step-through appends seed and final step exactly once");

  const autoStepSeed: GameState = {
    ...fullyUnlocked,
    calculators: undefined,
    calculatorOrder: undefined,
    activeCalculatorId: undefined,
    perCalculatorCompletedUnlockIds: undefined,
    sessionControlProfiles: undefined,
    keyPressCounts: { [k("digit_1")]: 3 },
    ui: {
      ...fullyUnlocked.ui,
      keyLayout: [{ kind: "key", key: k("exec_equals") }],
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
      operationSlots: [{ operator: op("op_add"), operand: 3n }, { operator: op("op_mul"), operand: 4n }],
    },
  };
  const autoStepTick1 = reducer(autoStepSeed, { type: "AUTO_STEP_TICK" });
  assert.equal(autoStepTick1.calculator.stepProgress.active, true, "AUTO_STEP_TICK starts step progress with no step key on keypad");
  assertTotalEquivalent(autoStepTick1.calculator.total, r(2n), "first AUTO_STEP_TICK keeps preview-only total");
  assert.equal(autoStepTick1.calculator.rollEntries.length, 0, "first AUTO_STEP_TICK does not append roll rows");
  assert.deepEqual(autoStepTick1.keyPressCounts, autoStepSeed.keyPressCounts, "AUTO_STEP_TICK does not increment key press counts");

  const autoStepTick2 = reducer(autoStepTick1, { type: "AUTO_STEP_TICK" });
  assert.equal(autoStepTick2.calculator.stepProgress.active, false, "terminal AUTO_STEP_TICK clears step progress");
  assertTotalEquivalent(autoStepTick2.calculator.total, r(20n), "terminal AUTO_STEP_TICK commits final total");
  assert.equal(autoStepTick2.calculator.rollEntries.length, 2, "terminal AUTO_STEP_TICK commits seed and final step exactly once");
  assert.equal(
    autoStepTick2.calculator.rollEntries.length - autoStepTick1.calculator.rollEntries.length,
    2,
    "terminal AUTO_STEP_TICK appends exactly one completion pair (seed + terminal result)",
  );
  assert.deepEqual(autoStepTick2.keyPressCounts, autoStepSeed.keyPressCounts, "AUTO_STEP_TICK terminal commit still does not increment key press counts");

  const autoStepIdleSource: GameState = {
    ...autoStepTick2,
    ui: {
      ...autoStepTick2.ui,
      buttonFlags: {
        ...autoStepTick2.ui.buttonFlags,
        [EXECUTION_PAUSE_FLAG]: true,
        [EXECUTION_PAUSE_EQUALS_FLAG]: false,
      },
    },
    calculator: {
      ...autoStepTick2.calculator,
      operationSlots: [],
      draftingSlot: null,
    },
  };
  const autoStepIdle = reducer(autoStepIdleSource, { type: "AUTO_STEP_TICK" });
  assert.deepEqual(autoStepIdle.calculator.total, autoStepIdleSource.calculator.total, "AUTO_STEP_TICK idle path preserves total when no runnable step path exists");
  assert.deepEqual(autoStepIdle.calculator.rollEntries, autoStepIdleSource.calculator.rollEntries, "AUTO_STEP_TICK idle path preserves roll entries when no runnable step path exists");
  assert.deepEqual(autoStepIdle.keyPressCounts, autoStepIdleSource.keyPressCounts, "AUTO_STEP_TICK idle path preserves key-press counts");

  const equalsFromPartial = applyKeyAction(afterFirstStep, "exec_equals");
  assertTotalEquivalent(equalsFromPartial.calculator.total, r(9n), "equals during partial step continues from cursor");
  assert.equal(equalsFromPartial.calculator.stepProgress.active, false, "equals from partial clears step session");

  const absentStepKeyState: GameState = {
    ...afterFirstStep,
    ui: {
      ...afterFirstStep.ui,
      keyLayout: [{ kind: "key", key: k("exec_equals") }],
      keypadColumns: 1,
      keypadRows: 1,
    },
  };
  const afterAbsentStepKeyEquals = applyKeyAction(absentStepKeyState, "exec_equals");
  assert.equal(afterAbsentStepKeyEquals.calculator.stepProgress.active, false, "session clears when step key is absent on keypad");

  const stepNoSlots = applyKeyAction(
    {
      ...fullyUnlocked,
      ui: {
        ...fullyUnlocked.ui,
        keyLayout: [{ kind: "key", key: k("exec_step_through") }],
      },
      calculator: {
        ...fullyUnlocked.calculator,
        operationSlots: [],
      },
    },
    "exec_step_through",
  );
  assert.equal(stepNoSlots.calculator.stepProgress.active, false, "step-through with no slots is a no-op");

  let longRollState: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(0n),
      operationSlots: [{ operator: op("op_add"), operand: 1n }],
    },
  };
  const rollIterations = MAX_ROLL_ENTRIES + 5;
  for (let index = 0; index < rollIterations; index += 1) {
    longRollState = applyKeyAction(longRollState, "exec_equals");
  }
  assert.equal(longRollState.calculator.rollEntries.length, MAX_ROLL_ENTRIES, "roll pruning caps total entry count");
  assertValueEquivalent(longRollState.calculator.rollEntries[0]?.y, r(0n), "roll pruning keeps seed row untouched");
  assertValueEquivalent(
    longRollState.calculator.rollEntries[1]?.y,
    r(7n),
    "roll pruning drops oldest step rows once cap is exceeded",
  );
  assertValueEquivalent(
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
  const afterActiveRollDigit = applyKeyAction(activeRollDigitNoOp, "digit_1");
  assert.deepEqual(afterActiveRollDigit, activeRollDigitNoOp, "digit key is no-op while roll is active");

  const lockedUnaryFromKeypad = applyKeyAction(legacyInitialState(), "unary_inc");
  assert.equal(lockedUnaryFromKeypad.keyPressCounts[uop("unary_inc")] ?? 0, 1, "locked keypad-installed unary key still counts as a press");

  const unaryPlus = applyKeyAction(fullyUnlocked, "unary_inc");
  assert.deepEqual(unaryPlus.calculator.operationSlots, [{ kind: "unary", operator: uop("unary_inc") }], "++ appends unary slot");
  assert.equal(unaryPlus.calculator.draftingSlot, null, "++ does not create drafting slot");

  const unaryMinus = applyKeyAction(fullyUnlocked, "unary_dec");
  assert.deepEqual(unaryMinus.calculator.operationSlots, [{ kind: "unary", operator: uop("unary_dec") }], "-- appends unary slot");

  const unaryNegate = applyKeyAction(fullyUnlocked, "unary_neg");
  assert.deepEqual(unaryNegate.calculator.operationSlots, [{ kind: "unary", operator: uop("unary_neg") }], "-n appends unary slot");

  const unaryAfterFilledDrafting = applyKeyAction(
    applyKeyAction(
      applyKeyAction(fullyUnlocked, "digit_5"),
      "op_sub",
    ),
    "digit_2",
  );
  const unaryAfterFilledDraftingResult = applyKeyAction(unaryAfterFilledDrafting, "unary_inc");
  assert.deepEqual(
    unaryAfterFilledDraftingResult.calculator.operationSlots,
    [{ kind: "binary", operator: op("op_sub"), operand: 2n }, { kind: "unary", operator: uop("unary_inc") }],
    "unary after filled draft commits binary draft first, then appends unary slot",
  );
  assert.equal(unaryAfterFilledDraftingResult.calculator.draftingSlot, null, "unary after filled draft clears drafting slot");

  const unaryAfterEmptyDrafting = applyKeyAction(
    applyKeyAction(fullyUnlocked, "digit_5"),
    "op_sub",
  );
  const unaryAfterEmptyDraftingResult = applyKeyAction(unaryAfterEmptyDrafting, "unary_inc");
  assert.deepEqual(
    unaryAfterEmptyDraftingResult.calculator.operationSlots,
    [{ kind: "unary", operator: uop("unary_inc") }],
    "unary after empty draft discards draft and appends unary slot",
  );
  const digitAfterUnaryWithNoDraft = applyKeyAction(unaryAfterEmptyDraftingResult, "digit_2");
  assert.deepEqual(
    digitAfterUnaryWithNoDraft.calculator.total,
    r(5n),
    "digit after unary without drafting does not edit seed total",
  );
  assert.deepEqual(
    digitAfterUnaryWithNoDraft.calculator.operationSlots,
    [{ kind: "unary", operator: uop("unary_inc") }],
    "digit after unary without drafting keeps unary slot unchanged",
  );

  const activeRollUnarySource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(5n),
      rollEntries: re(r(5n)),
      operationSlots: [{ operator: op("op_add"), operand: 9n }],
      draftingSlot: { operator: op("op_sub"), operandInput: "2", isNegative: false },
    },
  };
  const activeRollUnary = applyKeyAction(activeRollUnarySource, "unary_inc");
  assert.equal(activeRollUnary.calculator.rollEntries.length, 0, "unary key clears active roll before insertion");
  assert.deepEqual(
    activeRollUnary.calculator.operationSlots,
    [{ kind: "unary", operator: uop("unary_inc") }],
    "unary key appends unary slot after roll clear",
  );

  const moduloExecutionSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(10n),
      operationSlots: [{ operator: op("op_mod"), operand: 4n }],
    },
  };
  const afterModuloExecution = applyKeyAction(moduloExecutionSource, "exec_equals");
  assertValueEquivalent(afterModuloExecution.calculator.rollEntries[0]?.y, r(10n), "first equals stores current seed at index 0");
  assertTotalEquivalent(afterModuloExecution.calculator.total, r(2n), "modulo execution sets total to the modulo component");
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
      operationSlots: [{ operator: op("op_rotate_left"), operand: -2n }],
    },
  };
  const afterRotateExecution = applyKeyAction(rotateExecutionSource, "exec_equals");
  assertTotalEquivalent(afterRotateExecution.calculator.total, r(45123n), "rotate-left supports negative shift as right rotation");

  const gcdExecutionSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(12n),
      operationSlots: [{ operator: op("op_gcd"), operand: 18n }],
    },
  };
  const afterGcdExecution = applyKeyAction(gcdExecutionSource, "exec_equals");
  assertTotalEquivalent(afterGcdExecution.calculator.total, r(6n), "gcd operator returns greatest common divisor");

  const lcmExecutionSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(12n),
      operationSlots: [{ operator: op("op_lcm"), operand: 18n }],
    },
  };
  const afterLcmExecution = applyKeyAction(lcmExecutionSource, "exec_equals");
  assertTotalEquivalent(afterLcmExecution.calculator.total, r(36n), "lcm operator returns least common multiple");

  const sigmaExecutionSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(6n),
      operationSlots: [{ kind: "unary", operator: uop("unary_sigma") }],
    },
  };
  const afterSigmaExecution = applyKeyAction(sigmaExecutionSource, "exec_equals");
  assertTotalEquivalent(afterSigmaExecution.calculator.total, r(12n), "sigma unary returns sum of divisors");

  const phiExecutionSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(13n),
      operationSlots: [{ kind: "unary", operator: uop("unary_phi") }],
    },
  };
  const afterPhiExecution = applyKeyAction(phiExecutionSource, "exec_equals");
  assertTotalEquivalent(afterPhiExecution.calculator.total, r(12n), "phi unary returns Euler totient");

  const omegaExecutionSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(153n),
      operationSlots: [{ kind: "unary", operator: uop("unary_omega") }],
    },
  };
  const afterOmegaExecution = applyKeyAction(omegaExecutionSource, "exec_equals");
  assertTotalEquivalent(afterOmegaExecution.calculator.total, r(3n), "omega unary returns prime factors with multiplicity");

  const sigmaZeroExecutionSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(0n),
      operationSlots: [{ kind: "unary", operator: uop("unary_sigma") }],
    },
  };
  const afterSigmaZeroExecution = applyKeyAction(sigmaZeroExecutionSource, "exec_equals");
  assert.deepEqual(afterSigmaZeroExecution.calculator.total, toNanCalculatorValue(), "sigma at zero returns NaN");
  assert.equal(afterSigmaZeroExecution.calculator.rollEntries.at(-1)?.error?.code, "NaN", "sigma at zero records NaN input error");

  const symbolicPiCancellationSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(0n),
      operationSlots: [
        { operator: op("op_add"), operand: { type: "constant", value: "pi" } },
        { operator: op("op_sub"), operand: { type: "constant", value: "pi" } },
      ],
    },
  };
  const afterPiCancellation = applyKeyAction(symbolicPiCancellationSource, "exec_equals");
  assertTotalEquivalent(afterPiCancellation.calculator.total, r(0n), "symbolic pi cancellation resolves to exact rational");
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
        { operator: op("op_mul"), operand: { type: "constant", value: "e" } },
        { operator: op("op_div"), operand: { type: "constant", value: "e" } },
      ],
    },
  };
  const afterECancellation = applyKeyAction(symbolicECancellationSource, "exec_equals");
  assert.notEqual(afterECancellation.calculator.total.kind, "nan", "symbolic e cancellation remains exact/non-NaN");
  assert.equal(afterECancellation.calculator.rollEntries.at(-1)?.error, undefined, "exact symbolic rational stays non-error");

  const symbolicNonRationalSource: GameState = {
    ...fullyUnlocked,
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(1n),
      operationSlots: [{ operator: op("op_add"), operand: { type: "constant", value: "pi" } }],
    },
  };
  const afterNonRationalSymbolic = applyKeyAction(symbolicNonRationalSource, "exec_equals");
  assert.deepEqual(afterNonRationalSymbolic.calculator.total, toNanCalculatorValue(), "non-rational symbolic total is rejected in default visualizer");
  assert.equal(afterNonRationalSymbolic.calculator.rollEntries.at(-1)?.error?.code, "ALG", "non-rational symbolic result records ALG error");
  assert.ok(afterNonRationalSymbolic.calculator.rollEntries.at(-1)?.symbolic, "non-rational symbolic result records symbolic payload");
  assert.equal(
    afterNonRationalSymbolic.calculator.rollEntries.at(-1)?.symbolic?.renderText.includes("."),
    false,
    "symbolic render text never uses decimal notation",
  );

  const euclidDraftConstantBlocked = applyKeyAction(
    applyKeyAction(fullyUnlocked, "op_euclid_div"),
    "const_pi",
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
        operationSlots: [{ operator: op("op_euclid_div"), operand: -4n }],
      },
    },
    "digit_7",
  );
  assert.deepEqual(
    euclidDigitRewriteNormalizesSign.calculator.operationSlots,
    [{ operator: op("op_euclid_div"), operand: 7n }],
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
  const afterC = applyKeyAction(clearSeedSource, "util_clear_all");
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
  const afterUndo = applyKeyAction(undoSource, "util_undo");
  assertTotalEquivalent(afterUndo.calculator.total, r(5n), "UNDO restores prior trajectory value");
  assertRollSequenceEquivalent(afterUndo.calculator.rollEntries, [r(5n)], "UNDO removes last step and keeps seed row");
  assert.equal(afterUndo.calculator.stepProgress.active, false, "UNDO cancels active step session");

  const memoryCycleLocked = legacyInitialState();
  const afterLockedMemoryCycle = applyKeyAction(memoryCycleLocked, "memory_cycle_variable");
  assert.equal(afterLockedMemoryCycle.ui.selectedControlField, "alpha", "locked memory-cycle key does not change selected variable");

  const memoryCycleUnlocked: GameState = {
    ...legacyInitialState(),
    unlocks: {
      ...legacyInitialState().unlocks,
      memory: {
        ...legacyInitialState().unlocks.memory,
        [k("memory_cycle_variable")]: true,
      },
    },
  };
  const afterFirstMemoryCycle = applyKeyAction(memoryCycleUnlocked, "memory_cycle_variable");
  assert.equal(afterFirstMemoryCycle.ui.selectedControlField, "beta", "memory-cycle key advances alpha to beta");
  const afterSecondMemoryCycle = applyKeyAction(afterFirstMemoryCycle, "memory_cycle_variable");
  assert.equal(afterSecondMemoryCycle.ui.selectedControlField, "gamma", "memory-cycle key advances beta to gamma");
  const afterThirdMemoryCycle = applyKeyAction(afterSecondMemoryCycle, "memory_cycle_variable");
  assert.equal(afterThirdMemoryCycle.ui.selectedControlField, "alpha", "memory-cycle key wraps gamma to alpha");

  const precedenceUsesLegacyFallback = normalizeRuntimeStateInvariants({
    ...legacyInitialState(),
    ui: {
      ...legacyInitialState().ui,
      selectedControlField: "epsilon",
      memoryVariable: "β",
    },
  });
  assert.equal(
    precedenceUsesLegacyFallback.ui.selectedControlField,
    "beta",
    "selected-control normalization falls back to legacy memory variable when selected field is invalid",
  );
  const precedenceKeepsValidSelected = normalizeRuntimeStateInvariants({
    ...legacyInitialState(),
    ui: {
      ...legacyInitialState().ui,
      selectedControlField: "gamma",
      memoryVariable: "β",
    },
  });
  assert.equal(
    precedenceKeepsValidSelected.ui.selectedControlField,
    "gamma",
    "selected-control normalization keeps valid selected field even when legacy memory variable differs",
  );

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
        [k("memory_adjust_plus")]: true,
      },
    },
  };
  const plusAlpha = applyKeyAction({ ...memoryPlusUnlocked, ui: { ...memoryPlusUnlocked.ui, selectedControlField: "alpha" } }, "memory_adjust_plus");
  assert.equal(plusAlpha.ui.keypadColumns, memoryPlusBaseColumns + 1, "M+ with alpha increases keypad columns");
  const plusBeta = applyKeyAction({ ...memoryPlusUnlocked, ui: { ...memoryPlusUnlocked.ui, selectedControlField: "beta" } }, "memory_adjust_plus");
  assert.equal(plusBeta.ui.keypadRows, memoryPlusBaseRows + 1, "M+ with beta increases keypad rows");
  const plusGamma = applyKeyAction({ ...memoryPlusUnlocked, ui: { ...memoryPlusUnlocked.ui, selectedControlField: "gamma" } }, "memory_adjust_plus");
  assert.equal(plusGamma.unlocks.maxSlots, memoryPlusBaseSlots + 1, "M+ with gamma increases operation slot count");

  const memoryMinusBase = legacyInitialState();
  const memoryMinusUnlocked: GameState = {
    ...memoryMinusBase,
    lambdaControl: {
      ...memoryMinusBase.lambdaControl,
      maxPoints: 8,
      alpha: 3,
      beta: 3,
      gamma: 1,
      gammaMinRaised: true,
    },
    allocator: {
      ...memoryMinusBase.allocator,
      maxPoints: 8,
      allocations: {
        ...memoryMinusBase.allocator.allocations,
        width: 3,
        height: 3,
        slots: 1,
      },
    },
    unlocks: {
      ...memoryMinusBase.unlocks,
      memory: {
        ...memoryMinusBase.unlocks.memory,
        [k("memory_adjust_minus")]: true,
      },
    },
    ui: {
      ...memoryMinusBase.ui,
      keypadColumns: 3,
      keypadRows: 3,
    },
  };
  const minusAlpha = applyKeyAction({ ...memoryMinusUnlocked, ui: { ...memoryMinusUnlocked.ui, selectedControlField: "alpha" } }, "memory_adjust_minus");
  assert.equal(minusAlpha.ui.keypadColumns, 2, "M- with alpha decreases keypad columns");
  const minusBeta = applyKeyAction({ ...memoryMinusUnlocked, ui: { ...memoryMinusUnlocked.ui, selectedControlField: "beta" } }, "memory_adjust_minus");
  assert.equal(minusBeta.ui.keypadRows, 2, "M- with beta decreases keypad rows");
  const minusGamma = applyKeyAction({ ...memoryMinusUnlocked, ui: { ...memoryMinusUnlocked.ui, selectedControlField: "gamma" } }, "memory_adjust_minus");
  assert.equal(minusGamma.unlocks.maxSlots, 1, "M- with gamma respects gamma minimum once gamma has been raised");
  const withBackspaceUnlocked: GameState = {
    ...fullyUnlocked,
    unlocks: {
      ...fullyUnlocked.unlocks,
      utilities: {
        ...fullyUnlocked.unlocks.utilities,
        [k("util_backspace")]: true,
      },
    },
  };

  const backspaceLockedNoOp = applyKeyAction(legacyInitialState(), "util_backspace");
  assert.deepEqual(backspaceLockedNoOp, legacyInitialState(), "locked backspace remains a no-op");

  const backspaceDraftingDelete: GameState = {
    ...withBackspaceUnlocked,
    calculator: {
      ...withBackspaceUnlocked.calculator,
      draftingSlot: { operator: op("op_add"), operandInput: "9", isNegative: false },
    },
  };
  const afterBackspaceDraftingDelete = applyKeyAction(backspaceDraftingDelete, "util_backspace");
  assert.equal(
    afterBackspaceDraftingDelete.calculator.draftingSlot?.operandInput,
    "",
    "backspace removes last drafting operand digit",
  );

  const backspaceDraftingNegFlag: GameState = {
    ...withBackspaceUnlocked,
    calculator: {
      ...withBackspaceUnlocked.calculator,
      draftingSlot: { operator: op("op_add"), operandInput: "", isNegative: true },
    },
  };
  const afterBackspaceDraftingNegFlag = applyKeyAction(backspaceDraftingNegFlag, "util_backspace");
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
  const afterBackspaceSeedTrim = applyKeyAction(backspaceSeedTrim, "util_backspace");
  assertTotalEquivalent(afterBackspaceSeedTrim.calculator.total, r(-4n), "backspace trims seed-entry magnitude and preserves sign");
  const afterBackspaceSeedToZero = applyKeyAction(afterBackspaceSeedTrim, "util_backspace");
  assertTotalEquivalent(afterBackspaceSeedToZero.calculator.total, r(0n), "backspace turns single-digit seed magnitude into zero");

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
  const afterBackspaceActiveRollNoOp = applyKeyAction(backspaceActiveRollNoOp, "util_backspace");
  assert.equal(afterBackspaceActiveRollNoOp.calculator.stepProgress.active, false, "backspace cancels active step session");
  assert.deepEqual(afterBackspaceActiveRollNoOp.calculator.rollEntries, backspaceActiveRollNoOp.calculator.rollEntries, "backspace remains no-op on active roll entries");

  const backspaceFunctionWalkStart: GameState = {
    ...withBackspaceUnlocked,
    calculator: {
      ...withBackspaceUnlocked.calculator,
      total: r(4n),
      operationSlots: [{ operator: op("op_add"), operand: 1n }],
      draftingSlot: { operator: op("op_sub"), operandInput: "3", isNegative: false },
    },
  };
  const afterWalk1 = applyKeyAction(backspaceFunctionWalkStart, "util_backspace");
  assert.equal(afterWalk1.calculator.draftingSlot?.operandInput, "", "walk 1 clears trailing operand digit");
  const afterWalk2 = applyKeyAction(afterWalk1, "util_backspace");
  assert.equal(afterWalk2.calculator.draftingSlot?.operator, op("op_add"), "walk 2 removes current operator and restores previous slot operator");
  assert.equal(afterWalk2.calculator.draftingSlot?.operandInput, "1", "walk 2 restores previous slot operand");
  const afterWalk3 = applyKeyAction(afterWalk2, "util_backspace");
  assert.equal(afterWalk3.calculator.draftingSlot?.operandInput, "", "walk 3 clears restored operand digit");
  const afterWalk4 = applyKeyAction(afterWalk3, "util_backspace");
  assert.equal(afterWalk4.calculator.draftingSlot, null, "walk 4 removes restored operator");
  const afterWalk5 = applyKeyAction(afterWalk4, "util_backspace");
  assertTotalEquivalent(afterWalk5.calculator.total, r(0n), "walk 5 trims seed total value");
};













