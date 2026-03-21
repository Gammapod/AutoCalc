import assert from "node:assert/strict";
import { LONG_TRACE_FIXTURES } from "./contracts/fixtures/actionSequences.js";
import { initialState } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import { executeCommand } from "../src/domain/commands.js";
import type { GameState } from "../src/domain/types.js";
import { compareParity } from "../src/compat/parityHarness.js";

export const runContractsParityLongTracesTests = (): void => {
  assert.ok(LONG_TRACE_FIXTURES.length > 0, "parity long-trace fixtures remain registered");
  for (const fixture of LONG_TRACE_FIXTURES) {
    let legacy: GameState = initialState();
    let v2: GameState = initialState();
    for (const action of fixture.actions) {
      legacy = reducer(legacy, action);
      v2 = executeCommand(v2, { type: "DispatchAction", action }).state;
    }
    const parity = compareParity(legacy, v2);
    assert.equal(parity.ok, true, `long-trace parity mismatch fixture=${fixture.id}`);
  }
};

