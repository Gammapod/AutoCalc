import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import type { Action } from "../src/domain/types.js";
import { executeCommand } from "../src/domain/commands.js";
import { buildReadModel } from "../src/domain/projections.js";
import { LONG_TRACE_FIXTURES } from "./contracts/fixtures/actionSequences.js";
import { PARITY_GOLDEN } from "./contracts/fixtures/parityGolden.js";
import { stableSerialize } from "./helpers/stableSerialize.js";

const expectedById = new Map<string, (typeof PARITY_GOLDEN.longTraces)[number]>(
  PARITY_GOLDEN.longTraces.map((entry) => [entry.id, entry]),
);

const runSequence = (actions: readonly Action[]) => {
  let state = initialState();
  for (const action of actions) {
    state = executeCommand(state, { type: "DispatchAction", action }).state;
  }
  return {
    state: stableSerialize(state),
    readModel: stableSerialize(buildReadModel(state)),
  };
};

export const runContractsParityLongTracesTests = (): void => {
  for (const fixture of LONG_TRACE_FIXTURES) {
    const expected = expectedById.get(fixture.id);
    assert.ok(expected, `missing golden fixture for ${fixture.id}`);
    const actual = runSequence(fixture.actions);
    assert.equal(actual.state, expected.state, `state mismatch for fixture ${fixture.id}`);
    assert.equal(actual.readModel, expected.readModel, `read-model mismatch for fixture ${fixture.id}`);
  }
};
