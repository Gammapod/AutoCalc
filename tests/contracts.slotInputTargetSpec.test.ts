import { applyKeyAction } from "../src/domain/reducer.input.js";
import { getSlotInputScenariosByTag } from "./helpers/slotInput.contractFixtures.js";
import { assertScenarioResult, runScenario, type SlotInputRuntimeAdapter } from "./helpers/slotInput.contractRunner.js";

export const runContractsSlotInputTargetSpecTests = (): void => {
  const runtimeAdapter: SlotInputRuntimeAdapter = {
    name: "builder.applyKeyAction",
    applyKeyAction,
  };

  const scenarios = getSlotInputScenariosByTag("target_spec");
  for (const scenario of scenarios) {
    const result = runScenario(runtimeAdapter, scenario);
    if (scenario.targetProjection) {
      assertScenarioResult(result, scenario.targetProjection);
    }
  }
};

