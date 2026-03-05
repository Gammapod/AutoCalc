import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import type { Action, GameState } from "../src/domain/types.js";
import { executeCommand } from "../src_v2/domain/commands.js";
import { LONG_TRACE_FIXTURES } from "./contracts/fixtures/actionSequences.js";

const reduceSequence = (base: GameState, actions: Action[]): GameState => actions.reduce((state, action) => reducer(state, action), base);

const commandSequence = (base: GameState, actions: Action[]): GameState =>
  actions.reduce((state, action) => executeCommand(state, { type: "DispatchAction", action }).state, base);

export const runContractsUiDomainTests = (): void => {
  for (const fixture of LONG_TRACE_FIXTURES) {
    const baseA = initialState();
    const baseB = initialState();
    const reducedA = reduceSequence(baseA, fixture.actions);
    const reducedB = reduceSequence(baseB, fixture.actions);
    assert.deepEqual(reducedA, reducedB, `reducer deterministic for fixture ${fixture.id}`);

    const commandedA = commandSequence(initialState(), fixture.actions);
    const commandedB = commandSequence(initialState(), fixture.actions);
    assert.deepEqual(commandedA, commandedB, `command engine deterministic for fixture ${fixture.id}`);
  }
};
