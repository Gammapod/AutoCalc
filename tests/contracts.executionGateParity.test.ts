import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { executeCommand } from "../src/domain/commands.js";
import { reducer } from "../src/domain/reducer.js";
import { EXECUTION_PAUSE_EQUALS_FLAG, EXECUTION_PAUSE_FLAG, initialState } from "../src/domain/state.js";
import { compareParity } from "../src/compat/parityHarness.js";
import type { Action, GameState } from "../src/domain/types.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { k, op } from "./support/keyCompat.js";
import { legacyInitialState } from "./support/legacyState.js";

const runParityRejectionCase = (
  label: string,
  state: GameState,
  action: Action,
  options: { expectRejectUiEffect: boolean },
): void => {
  const reduced = reducer(state, action);
  const commandResult = executeCommand(state, { type: "DispatchAction", action });
  const commandReduced = commandResult.state;
  assert.deepEqual(reduced, state, `${label}: reducer path is non-mutating for execution-gated rejection`);
  assert.deepEqual(commandReduced, state, `${label}: command path is non-mutating for execution-gated rejection`);
  assert.equal(
    commandResult.uiEffects.length,
    options.expectRejectUiEffect ? 1 : 0,
    `${label}: command emits expected reject UI effect count`,
  );
  if (options.expectRejectUiEffect) {
    assert.equal(commandResult.uiEffects[0]?.type, "execution_gate_rejected", `${label}: reject UI effect type is execution-gate`);
  }

  const parity = compareParity(reduced, commandReduced);
  assert.equal(
    parity.ok,
    true,
    `${label}: reducer and command outcomes stay parity-equivalent (${JSON.stringify(parity.mismatches)})`,
  );
};

export const runContractsExecutionGateParityTests = (): void => {
  const activeRollState: GameState = [
    { type: "UNLOCK_ALL" } as const,
    { type: "PRESS_KEY", key: k("digit_1") } as const,
    { type: "PRESS_KEY", key: op("op_add") } as const,
    { type: "PRESS_KEY", key: k("digit_1") } as const,
    { type: "PRESS_KEY", key: k("exec_equals") } as const,
  ].reduce((state, action) => reducer(state, action), initialState());

  runParityRejectionCase(
    "active-roll digit rejection",
    activeRollState,
    { type: "PRESS_KEY", key: k("digit_1") },
    { expectRejectUiEffect: false },
  );

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

  runParityAcceptedCase(
    "execution-pause equals-toggle interrupt",
    pausedState,
    { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_EQUALS_FLAG },
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
};

