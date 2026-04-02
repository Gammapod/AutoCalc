import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { executeCommand } from "../src/domain/commands.js";
import { executePlanIR, executePlanIRLegacyPath } from "../src/domain/engine.js";
import { buildExecutionPlanIR } from "../src/domain/executionPlanIR.js";
import { toNanCalculatorValue } from "../src/domain/calculatorValue.js";
import { reducer } from "../src/domain/reducer.js";
import { EXECUTION_PAUSE_EQUALS_FLAG, EXECUTION_PAUSE_FLAG, initialState } from "../src/domain/state.js";
import { normalizeRuntimeStateInvariants } from "../src/domain/runtimeStateInvariants.js";
import { compareParity } from "../src/compat/parityHarness.js";
import type { Action, GameState } from "../src/domain/types.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { k, op } from "./support/keyCompat.js";
import { legacyInitialState } from "./support/legacyState.js";

const runParityRejectionCase = (
  label: string,
  state: GameState,
  action: Action,
  options: { expectRejectUiEffect: boolean; expectStateMutation?: boolean },
): void => {
  const reduced = reducer(state, action);
  const commandResult = executeCommand(state, { type: "DispatchAction", action });
  const commandReduced = commandResult.state;
  if (options.expectStateMutation) {
    assert.notDeepEqual(reduced, state, `${label}: reducer path mutates due pre-dispatch normalization semantics`);
    assert.notDeepEqual(commandReduced, state, `${label}: command path mutates due pre-dispatch normalization semantics`);
  } else {
    assert.deepEqual(reduced, state, `${label}: reducer path is non-mutating for execution-gated rejection`);
    assert.deepEqual(commandReduced, state, `${label}: command path is non-mutating for execution-gated rejection`);
  }
  const inputFeedback = commandResult.uiEffects.find((effect) => effect.type === "input_feedback");
  assert.ok(inputFeedback, `${label}: command emits input feedback effect`);
  assert.equal(
    inputFeedback?.outcome,
    options.expectStateMutation ? "accepted" : "rejected",
    `${label}: input feedback outcome matches mutation semantics`,
  );
  if (options.expectRejectUiEffect) {
    assert.ok(
      commandResult.uiEffects.some((effect) => effect.type === "execution_gate_rejected"),
      `${label}: reject UI effect type is execution-gate`,
    );
  }

  const parity = compareParity(reduced, commandReduced);
  assert.equal(
    parity.ok,
    true,
    `${label}: reducer and command outcomes stay parity-equivalent (${JSON.stringify(parity.mismatches)})`,
  );
};

export const runContractsExecutionGateParityTests = (): void => {
  const baseActive = initialState();
  const activeRollState: GameState = normalizeRuntimeStateInvariants({
    ...baseActive,
    ui: {
      ...baseActive.ui,
      buttonFlags: {},
      keyLayout: [{ kind: "key", key: KEY_ID.exec_step_through }],
      keypadColumns: 1,
      keypadRows: 1,
    },
    calculator: {
      ...baseActive.calculator,
      total: { kind: "rational", value: { num: 2n, den: 1n } },
      rollEntries: [
        { y: { kind: "rational", value: { num: 1n, den: 1n } } },
        { y: { kind: "rational", value: { num: 2n, den: 1n } } },
      ],
    },
  });

  runParityRejectionCase(
    "active-roll digit rejection",
    activeRollState,
    { type: "PRESS_KEY", key: k("digit_1") },
    { expectRejectUiEffect: false, expectStateMutation: true },
  );

  const rollInverseRejectedState: GameState = {
    ...legacyInitialState(),
    unlocks: {
      ...legacyInitialState().unlocks,
      execution: {
        ...legacyInitialState().unlocks.execution,
        [k("exec_roll_inverse")]: true,
      },
    },
    ui: {
      ...legacyInitialState().ui,
      keyLayout: [{ kind: "key", key: k("exec_roll_inverse") }],
      keypadColumns: 1,
      keypadRows: 1,
    },
    calculator: {
      ...legacyInitialState().calculator,
      total: { kind: "rational", value: { num: 1n, den: 1n } },
      rollEntries: [{ y: { kind: "rational", value: { num: 1n, den: 1n } } }],
    },
  };
  {
    const action: Action = { type: "PRESS_KEY", key: k("exec_roll_inverse") };
    const reduced = reducer(rollInverseRejectedState, action);
    const commandResult = executeCommand(rollInverseRejectedState, { type: "DispatchAction", action });
    assert.ok(
      commandResult.uiEffects.some((effect) => effect.type === "execution_gate_rejected"),
      "roll-inverse semantic rejection uses execution-gate reject effect",
    );
    assert.ok(
      commandResult.uiEffects.some((effect) => effect.type === "input_feedback"),
      "roll-inverse semantic rejection emits input feedback",
    );
    assert.deepEqual(reduced.calculator, rollInverseRejectedState.calculator, "roll-inverse semantic rejection preserves calculator state");
    assert.deepEqual(commandResult.state.calculator, rollInverseRejectedState.calculator, "command path preserves calculator state on roll-inverse reject");
    const parity = compareParity(reduced, commandResult.state);
    assert.equal(
      parity.ok,
      true,
      `roll-inverse reject parity remains equivalent (${JSON.stringify(parity.mismatches)})`,
    );
  }
  const pausedStateSeed: GameState = {
    ...legacyInitialState(),
    unlocks: {
      ...legacyInitialState().unlocks,
      maxSlots: Math.max(legacyInitialState().unlocks.maxSlots, 1),
      valueExpression: {
        ...legacyInitialState().unlocks.valueExpression,
        [k("digit_1")]: true,
      },
      slotOperators: {
        ...legacyInitialState().unlocks.slotOperators,
        [op("op_add")]: true,
      },
      utilities: {
        ...legacyInitialState().unlocks.utilities,
        [k("util_backspace")]: true,
      },
      execution: {
        ...legacyInitialState().unlocks.execution,
        [KEY_ID.exec_play_pause]: true,
        [k("exec_equals")]: true,
      },
    },
    ui: {
      ...legacyInitialState().ui,
      keyLayout: [
        { kind: "key", key: KEY_ID.exec_play_pause, behavior: { type: "toggle_flag", flag: EXECUTION_PAUSE_FLAG } },
        { kind: "key", key: k("digit_1") },
        { kind: "key", key: op("op_add") },
        { kind: "key", key: k("exec_equals"), behavior: { type: "toggle_flag", flag: EXECUTION_PAUSE_EQUALS_FLAG } },
        { kind: "key", key: k("util_backspace") },
      ],
      keypadColumns: 5,
      keypadRows: 1,
    },
    calculator: {
      ...legacyInitialState().calculator,
      total: { kind: "rational", value: { num: 3n, den: 1n } },
      draftingSlot: { operator: op("op_add"), operandInput: "digit_1", isNegative: false },
      operationSlots: [{ operator: op("op_add"), operand: 2n }],
    },
  };
  const pausedState = reducer(pausedStateSeed, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_FLAG });
  const nanLockedState: GameState = {
    ...pausedStateSeed,
    calculator: {
      ...pausedStateSeed.calculator,
      total: toNanCalculatorValue(),
      rollEntries: [
        { y: { kind: "rational", value: { num: 1n, den: 1n } } },
        { y: toNanCalculatorValue(), error: { code: "seed_nan", kind: "nan_input" } },
      ],
    },
  };

  runParityRejectionCase(
    "execution-pause digit rejection",
    pausedState,
    { type: "PRESS_KEY", key: k("digit_1") },
    { expectRejectUiEffect: true },
  );

  runParityRejectionCase(
    "execution-pause operator rejection",
    pausedState,
    { type: "PRESS_KEY", key: op("op_add") },
    { expectRejectUiEffect: true },
  );
  runParityRejectionCase(
    "execution-pause keypad resize rejection",
    pausedState,
    { type: "SET_KEYPAD_DIMENSIONS", columns: 4, rows: 2 },
    { expectRejectUiEffect: true },
  );
  runParityRejectionCase(
    "execution-pause keypad row-upgrade rejection",
    pausedState,
    { type: "UPGRADE_KEYPAD_ROW" },
    { expectRejectUiEffect: true },
  );
  runParityRejectionCase(
    "execution-pause keypad column-upgrade rejection",
    pausedState,
    { type: "UPGRADE_KEYPAD_COLUMN" },
    { expectRejectUiEffect: true },
  );
  runParityRejectionCase(
    "execution-pause active-surface move rejection",
    pausedState,
    { type: "MOVE_LAYOUT_CELL", fromSurface: "keypad", fromIndex: 0, toSurface: "storage", toIndex: 0 },
    { expectRejectUiEffect: true },
  );
  runParityRejectionCase(
    "execution-pause active-surface swap rejection",
    pausedState,
    { type: "SWAP_LAYOUT_CELLS", fromSurface: "keypad", fromIndex: 0, toSurface: "storage", toIndex: 0 },
    { expectRejectUiEffect: true },
  );
  runParityRejectionCase(
    "nan-lock equals-toggle rejection",
    nanLockedState,
    { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_EQUALS_FLAG },
    { expectRejectUiEffect: true, expectStateMutation: true },
  );
  runParityRejectionCase(
    "nan-lock play/pause rejection",
    nanLockedState,
    { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_FLAG },
    { expectRejectUiEffect: true, expectStateMutation: true },
  );
  runParityRejectionCase(
    "nan-lock step-through rejection",
    nanLockedState,
    { type: "PRESS_KEY", key: KEY_ID.exec_step_through },
    { expectRejectUiEffect: true, expectStateMutation: true },
  );
  runParityRejectionCase(
    "nan-lock roll-inverse rejection",
    nanLockedState,
    { type: "PRESS_KEY", key: KEY_ID.exec_roll_inverse },
    { expectRejectUiEffect: true, expectStateMutation: true },
  );

  const runParityAcceptedCase = (label: string, state: GameState, action: Action): void => {
    const reduced = reducer(state, action);
    const commandReduced = executeCommand(state, { type: "DispatchAction", action }).state;
    assert.notDeepEqual(reduced, state, `${label}: reducer path should execute interrupting action`);
    assert.notDeepEqual(commandReduced, state, `${label}: command path should execute interrupting action`);
    const parity = compareParity(reduced, commandReduced);
    assert.equal(parity.ok, true, `${label}: reducer and command outcomes stay parity-equivalent (${JSON.stringify(parity.mismatches)})`);
  };

  runParityAcceptedCase(
    "execution-pause utility interrupt",
    pausedState,
    { type: "PRESS_KEY", key: k("util_backspace") },
  );

  const pausedStateWithMemoryCycle: GameState = {
    ...pausedState,
    unlocks: {
      ...pausedState.unlocks,
      memory: {
        ...pausedState.unlocks.memory,
        [KEY_ID.memory_cycle_variable]: true,
      },
    },
    ui: {
      ...pausedState.ui,
      keyLayout: [
        { kind: "key", key: KEY_ID.exec_play_pause, behavior: { type: "toggle_flag", flag: EXECUTION_PAUSE_FLAG } },
        { kind: "key", key: KEY_ID.memory_cycle_variable },
        { kind: "key", key: k("digit_1") },
      ],
      keypadColumns: 3,
      keypadRows: 1,
    },
  };
  runParityAcceptedCase(
    "execution-pause memory-key interrupt",
    pausedStateWithMemoryCycle,
    { type: "PRESS_KEY", key: KEY_ID.memory_cycle_variable },
  );

  runParityAcceptedCase(
    "execution-pause equals-toggle interrupt",
    pausedState,
    { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_EQUALS_FLAG },
  );

  const captureCalculatorAndProgression = (state: GameState) => ({
    calculator: state.calculator,
    unlocks: state.unlocks,
    keyPressCounts: state.keyPressCounts,
    completedUnlockIds: state.completedUnlockIds,
    perCalculatorCompletedUnlockIds: state.perCalculatorCompletedUnlockIds,
    allocatorAllocatePressCount: state.allocatorAllocatePressCount,
    allocatorReturnPressCount: state.allocatorReturnPressCount,
  });

  const pausedActionMatrix: Array<{
    label: string;
    state: GameState;
    action: Action;
    expected: "reject" | "interrupt";
  }> = [
    { label: "matrix: paused digit rejected", state: pausedState, action: { type: "PRESS_KEY", key: k("digit_1") }, expected: "reject" },
    { label: "matrix: paused operator rejected", state: pausedState, action: { type: "PRESS_KEY", key: op("op_add") }, expected: "reject" },
    { label: "matrix: paused keypad-dimensions rejected", state: pausedState, action: { type: "SET_KEYPAD_DIMENSIONS", columns: 4, rows: 2 }, expected: "reject" },
    { label: "matrix: paused row upgrade rejected", state: pausedState, action: { type: "UPGRADE_KEYPAD_ROW" }, expected: "reject" },
    { label: "matrix: paused col upgrade rejected", state: pausedState, action: { type: "UPGRADE_KEYPAD_COLUMN" }, expected: "reject" },
    { label: "matrix: paused backspace interrupts", state: pausedState, action: { type: "PRESS_KEY", key: k("util_backspace") }, expected: "interrupt" },
    {
      label: "matrix: paused memory-cycle interrupts",
      state: pausedStateWithMemoryCycle,
      action: { type: "PRESS_KEY", key: KEY_ID.memory_cycle_variable },
      expected: "interrupt",
    },
    { label: "matrix: paused equals-toggle interrupts", state: pausedState, action: { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_EQUALS_FLAG }, expected: "interrupt" },
  ];

  for (const row of pausedActionMatrix) {
    const reduced = reducer(row.state, row.action);
    const commandResult = executeCommand(row.state, { type: "DispatchAction", action: row.action });
    const commandReduced = commandResult.state;
    const parity = compareParity(reduced, commandReduced);
    assert.equal(parity.ok, true, `${row.label}: reducer and command outcomes stay parity-equivalent (${JSON.stringify(parity.mismatches)})`);
    if (row.expected === "reject") {
      assert.deepEqual(
        captureCalculatorAndProgression(reduced),
        captureCalculatorAndProgression(row.state),
        `${row.label}: reducer path keeps calculator/progression non-mutating`,
      );
      assert.deepEqual(
        captureCalculatorAndProgression(commandReduced),
        captureCalculatorAndProgression(row.state),
        `${row.label}: command path keeps calculator/progression non-mutating`,
      );
      assert.equal(Boolean(reduced.ui.buttonFlags[EXECUTION_PAUSE_FLAG]), true, `${row.label}: pause flag remains set on reducer rejection`);
      assert.equal(Boolean(commandReduced.ui.buttonFlags[EXECUTION_PAUSE_FLAG]), true, `${row.label}: pause flag remains set on command rejection`);
    } else {
      assert.notDeepEqual(reduced, row.state, `${row.label}: reducer path mutates when interrupting`);
      assert.notDeepEqual(commandReduced, row.state, `${row.label}: command path mutates when interrupting`);
      assert.equal(Boolean(reduced.ui.buttonFlags[EXECUTION_PAUSE_FLAG]), false, `${row.label}: interrupt clears reducer pause flag`);
      assert.equal(Boolean(commandReduced.ui.buttonFlags[EXECUTION_PAUSE_FLAG]), false, `${row.label}: interrupt clears command pause flag`);
      assert.equal(
        commandResult.uiEffects.some((effect) => effect.type === "execution_gate_rejected"),
        false,
        `${row.label}: command interrupt emits no reject UI effect`,
      );
      assert.ok(
        commandResult.uiEffects.some((effect) => effect.type === "input_feedback" && effect.outcome === "accepted"),
        `${row.label}: command interrupt emits accepted input feedback`,
      );
    }
  }

  const rollInverseAcceptedSeed: GameState = {
    ...pausedState,
    unlocks: {
      ...pausedState.unlocks,
      execution: {
        ...pausedState.unlocks.execution,
        [k("exec_roll_inverse")]: true,
      },
    },
    ui: {
      ...pausedState.ui,
      buttonFlags: {},
      keyLayout: [{ kind: "key", key: k("exec_roll_inverse") }],
      keypadColumns: 1,
      keypadRows: 1,
    },
    calculator: {
      ...pausedState.calculator,
      total: { kind: "rational", value: { num: 3n, den: 1n } },
      rollEntries: [
        { y: { kind: "rational", value: { num: 1n, den: 1n } } },
        { y: { kind: "rational", value: { num: 2n, den: 1n } } },
        { y: { kind: "rational", value: { num: 3n, den: 1n } } },
      ],
    },
  };
  const rollInverseAcceptedAction: Action = { type: "PRESS_KEY", key: k("exec_roll_inverse") };
  const acceptedReducer = reducer(rollInverseAcceptedSeed, rollInverseAcceptedAction);
  const acceptedCommand = executeCommand(rollInverseAcceptedSeed, { type: "DispatchAction", action: rollInverseAcceptedAction });
  assert.notDeepEqual(acceptedReducer, rollInverseAcceptedSeed, "roll-inverse accepted path mutates reducer state");
  assert.notDeepEqual(acceptedCommand.state, rollInverseAcceptedSeed, "roll-inverse accepted path mutates command state");
  assert.equal(
    acceptedCommand.uiEffects.some((effect) => effect.type === "execution_gate_rejected"),
    false,
    "roll-inverse accepted path emits no reject UI effect",
  );
  assert.ok(
    acceptedCommand.uiEffects.some((effect) => effect.type === "input_feedback" && effect.outcome === "accepted"),
    "roll-inverse accepted path emits accepted input feedback",
  );
  const acceptedParity = compareParity(acceptedReducer, acceptedCommand.state);
  assert.equal(
    acceptedParity.ok,
    true,
    `roll-inverse accepted parity remains equivalent (${JSON.stringify(acceptedParity.mismatches)})`,
  );

  const autoStepSeed: GameState = {
    ...pausedState,
    calculator: {
      ...pausedState.calculator,
      total: { kind: "rational", value: { num: 2n, den: 1n } },
      rollEntries: [],
      operationSlots: [{ operator: op("op_add"), operand: 3n }, { operator: op("op_mul"), operand: 2n }],
      stepProgress: {
        active: false,
        seedTotal: null,
        currentTotal: null,
        nextSlotIndex: 0,
        executedSlotResults: [],
      },
    },
  };
  const autoStepReduced = reducer(autoStepSeed, { type: "AUTO_STEP_TICK" });
  const autoStepCommandReduced = executeCommand(autoStepSeed, { type: "DispatchAction", action: { type: "AUTO_STEP_TICK" } }).state;
  const autoStepParity = compareParity(autoStepReduced, autoStepCommandReduced);
  assert.equal(
    autoStepParity.ok,
    true,
    `auto-step tick parity remains equivalent (${JSON.stringify(autoStepParity.mismatches)})`,
  );

  const policyParityTotal = { kind: "rational" as const, value: { num: 5n, den: 1n } };
  const policyParitySlots = [{ operator: op("op_div"), operand: 0n }];
  const built = buildExecutionPlanIR(policyParityTotal, policyParitySlots);
  assert.deepEqual(
    executePlanIR(built.plan),
    executePlanIRLegacyPath(built.plan),
    "execution-gate suite: execution policy routing remains parity-equivalent for error payloads",
  );
};

