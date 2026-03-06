import assert from "node:assert/strict";
import type { GameState, Key } from "../../src/domain/types.js";
import type { SlotInputScenario, SlotInputStateProjection } from "./slotInput.contractFixtures.js";

export type SlotInputRuntimeAdapter = {
  name: string;
  applyKeyAction: (state: GameState, key: Key) => GameState;
};

export type SlotInputScenarioResult = {
  adapterName: string;
  scenarioId: string;
  finalState: GameState;
  projection: SlotInputStateProjection;
};

const projectState = (state: GameState): SlotInputStateProjection => ({
  total: state.calculator.total,
  operationSlots: state.calculator.operationSlots,
  draftingSlot: state.calculator.draftingSlot,
  roll: state.calculator.roll,
  rollErrors: state.calculator.rollErrors,
  keyPressCounts: state.keyPressCounts,
});

export const runScenario = (
  runtimeAdapter: SlotInputRuntimeAdapter,
  scenario: Pick<SlotInputScenario, "id" | "initialState" | "keySequence">,
): SlotInputScenarioResult => {
  let next = scenario.initialState;
  for (const key of scenario.keySequence) {
    next = runtimeAdapter.applyKeyAction(next, key);
  }
  return {
    adapterName: runtimeAdapter.name,
    scenarioId: scenario.id,
    finalState: next,
    projection: projectState(next),
  };
};

const assertDefinedProjectionField = <K extends keyof SlotInputStateProjection>(
  result: SlotInputScenarioResult,
  field: K,
  expected: NonNullable<SlotInputStateProjection[K]>,
): void => {
  if (field === "keyPressCounts") {
    const actualCounts = result.projection.keyPressCounts ?? {};
    for (const [key, count] of Object.entries(expected as Partial<Record<Key, number>>)) {
      assert.equal(
        actualCounts[key as Key] ?? 0,
        count,
        `[${result.adapterName}] ${result.scenarioId} keyPressCounts.${key} mismatch`,
      );
    }
    return;
  }
  assert.deepEqual(
    result.projection[field],
    expected,
    `[${result.adapterName}] ${result.scenarioId} field ${field} mismatch`,
  );
};

export const assertScenarioResult = (
  result: SlotInputScenarioResult,
  expectedProjection: SlotInputStateProjection,
): void => {
  const entries = Object.entries(expectedProjection) as Array<[keyof SlotInputStateProjection, unknown]>;
  for (const [field, expected] of entries) {
    if (expected === undefined) {
      continue;
    }
    assertDefinedProjectionField(
      result,
      field,
      expected as NonNullable<SlotInputStateProjection[keyof SlotInputStateProjection]>,
    );
  }
};

