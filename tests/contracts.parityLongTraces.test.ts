import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import type { Action, GameState } from "../src/domain/types.js";
import { compareParity } from "../src_v2/compat/parityHarness.js";
import { executeCommand } from "../src_v2/domain/commands.js";
import { LONG_TRACE_FIXTURES } from "./contracts/fixtures/actionSequences.js";

const runParitySequence = (actions: Action[]): { legacy: GameState; v2: GameState } => {
  let legacy = initialState();
  let v2 = initialState();
  for (const action of actions) {
    legacy = reducer(legacy, action);
    v2 = executeCommand(v2, { type: "DispatchAction", action }).state;
  }
  return { legacy, v2 };
};

export const runContractsParityLongTracesTests = (): void => {
  for (const fixture of LONG_TRACE_FIXTURES) {
    const { legacy, v2 } = runParitySequence(fixture.actions);
    const parity = compareParity(legacy, v2);
    assert.equal(
      parity.ok,
      true,
      `long-trace parity failed for fixture ${fixture.id}: ${JSON.stringify(parity.mismatches)}`,
    );
  }
};
