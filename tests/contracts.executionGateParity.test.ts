import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { executeCommand } from "../src/domain/commands.js";
import { reducer } from "../src/domain/reducer.js";
import { initialState } from "../src/domain/state.js";
import { compareParity } from "../src/compat/parityHarness.js";
import type { Action, GameState } from "../src/domain/types.js";
import { k, op } from "./support/keyCompat.js";

const runParityRejectionCase = (
  label: string,
  state: GameState,
  action: Action,
): void => {
  const reduced = reducer(state, action);
  const commandReduced = executeCommand(state, { type: "DispatchAction", action }).state;
  assert.deepEqual(
    reduced,
    state,
    `${label}: reducer path remains non-mutating for execution-gated rejection`,
  );
  assert.deepEqual(
    commandReduced,
    state,
    `${label}: command path remains non-mutating for execution-gated rejection`,
  );

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
  );
};
