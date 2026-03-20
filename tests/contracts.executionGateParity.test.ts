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
  options: { expectExecutionGateNonce: boolean },
): void => {
  const reduced = reducer(state, action);
  const commandReduced = executeCommand(state, { type: "DispatchAction", action }).state;
  assert.deepEqual(
    reduced.calculator,
    state.calculator,
    `${label}: reducer path preserves calculator state for execution-gated rejection`,
  );
  assert.deepEqual(
    commandReduced.calculator,
    state.calculator,
    `${label}: command path preserves calculator state for execution-gated rejection`,
  );
  if (options.expectExecutionGateNonce) {
    assert.equal(
      (reduced.ui.invalidExecutionGateNonce ?? 0),
      (state.ui.invalidExecutionGateNonce ?? 0) + 1,
      `${label}: reducer path increments rejection nonce`,
    );
    assert.equal(
      (commandReduced.ui.invalidExecutionGateNonce ?? 0),
      (state.ui.invalidExecutionGateNonce ?? 0) + 1,
      `${label}: command path increments rejection nonce`,
    );
  } else {
    assert.equal(
      (reduced.ui.invalidExecutionGateNonce ?? 0),
      (state.ui.invalidExecutionGateNonce ?? 0),
      `${label}: reducer path keeps rejection nonce stable`,
    );
    assert.equal(
      (commandReduced.ui.invalidExecutionGateNonce ?? 0),
      (state.ui.invalidExecutionGateNonce ?? 0),
      `${label}: command path keeps rejection nonce stable`,
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
  const activeRollState: GameState = [
    { type: "UNLOCK_ALL" } as const,
    { type: "PRESS_KEY", key: k("1") } as const,
    { type: "PRESS_KEY", key: op("+") } as const,
    { type: "PRESS_KEY", key: k("1") } as const,
    { type: "PRESS_KEY", key: k("=") } as const,
  ].reduce((state, action) => reducer(state, action), initialState());

  runParityRejectionCase(
    "active-roll digit rejection",
    activeRollState,
    { type: "PRESS_KEY", key: k("1") },
    { expectExecutionGateNonce: false },
  );

  const pausedStateSeed: GameState = {
    ...legacyInitialState(),
    unlocks: {
      ...legacyInitialState().unlocks,
      maxSlots: Math.max(legacyInitialState().unlocks.maxSlots, 1),
      valueExpression: {
        ...legacyInitialState().unlocks.valueExpression,
        [k("1")]: true,
      },
      slotOperators: {
        ...legacyInitialState().unlocks.slotOperators,
        [op("+")]: true,
      },
      utilities: {
        ...legacyInitialState().unlocks.utilities,
        [k("\u2190")]: true,
      },
      execution: {
        ...legacyInitialState().unlocks.execution,
        [KEY_ID.exec_play_pause]: true,
        [k("=")]: true,
      },
    },
    ui: {
      ...legacyInitialState().ui,
      keyLayout: [
        { kind: "key", key: KEY_ID.exec_play_pause, behavior: { type: "toggle_flag", flag: EXECUTION_PAUSE_FLAG } },
        { kind: "key", key: k("1") },
        { kind: "key", key: op("+") },
        { kind: "key", key: k("="), behavior: { type: "toggle_flag", flag: EXECUTION_PAUSE_EQUALS_FLAG } },
        { kind: "key", key: k("\u2190") },
      ],
      keypadColumns: 5,
      keypadRows: 1,
    },
    calculator: {
      ...legacyInitialState().calculator,
      total: { kind: "rational", value: { num: 3n, den: 1n } },
      draftingSlot: { operator: op("+"), operandInput: "1", isNegative: false },
      operationSlots: [{ operator: op("+"), operand: 2n }],
    },
  };
  const pausedState = reducer(pausedStateSeed, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_FLAG });

  runParityRejectionCase(
    "execution-pause digit rejection",
    pausedState,
    { type: "PRESS_KEY", key: k("1") },
    { expectExecutionGateNonce: true },
  );

  runParityRejectionCase(
    "execution-pause operator rejection",
    pausedState,
    { type: "PRESS_KEY", key: op("+") },
    { expectExecutionGateNonce: true },
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
    { type: "PRESS_KEY", key: k("\u2190") },
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
      operationSlots: [{ operator: op("+"), operand: 3n }, { operator: op("*"), operand: 2n }],
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
