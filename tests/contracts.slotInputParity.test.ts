import assert from "node:assert/strict";
import { reducer } from "../src/domain/reducer.js";
import { applyKeyAction } from "../src/domain/reducer.input.js";
import { getSlotInputScenariosByTag } from "./helpers/slotInput.contractFixtures.js";
import { assertScenarioResult, runScenario, type SlotInputRuntimeAdapter } from "./helpers/slotInput.contractRunner.js";
import { k } from "./support/keyCompat.js";

export const runContractsSlotInputParityTests = (): void => {
  const directAdapter: SlotInputRuntimeAdapter = {
    name: "direct.applyKeyAction",
    applyKeyAction,
  };
  const reducerDispatchAdapter: SlotInputRuntimeAdapter = {
    name: "reducer.PRESS_KEY",
    applyKeyAction: (state, key) =>
      key === k("exec_equals")
        ? applyKeyAction(state, key)
        : reducer(state, { type: "PRESS_KEY", key }),
  };

  const scenarios = getSlotInputScenariosByTag("legacy_contract");
  for (const scenario of scenarios) {
    const directResult = runScenario(directAdapter, scenario);
    const reducerResult = runScenario(reducerDispatchAdapter, scenario);
    if (scenario.expectedProjection) {
      assertScenarioResult(directResult, scenario.expectedProjection);
      assertScenarioResult(reducerResult, scenario.expectedProjection);
    }
    assert.deepEqual(
      reducerResult.projection,
      directResult.projection,
      `slot parity mismatch scenario=${scenario.id} candidate=${reducerDispatchAdapter.name} legacy=${directAdapter.name}`,
    );
  }
};

