import assert from "node:assert/strict";
import { resolveKeyId, type KeyId } from "../../src/domain/keyPresentation.js";
import type { GameState, KeyInput } from "../../src/domain/types.js";
import type { SlotInputScenario, SlotInputStateProjection } from "./slotInput.contractFixtures.js";

export type SlotInputRuntimeAdapter = {
  name: string;
  applyKeyAction: (state: GameState, key: KeyInput) => GameState;
};

export type SlotInputScenarioResult = {
  adapterName: string;
  scenarioId: string;
  finalState: GameState;
  projection: SlotInputStateProjection;
};

const projectState = (state: GameState): SlotInputStateProjection => ({
  // Contract projections preserve legacy "roll means post-seed trajectory" semantics.
  // Runtime stores seed at index 0.
  // For compatibility, project only post-seed rows when a seeded trajectory is present.
  // A single-row roll is projected as-is to avoid dropping legacy one-step fixtures.
  ...(() => {
    const projectedRows = state.calculator.rollEntries.length <= 1
      ? state.calculator.rollEntries
      : state.calculator.rollEntries.slice(1);
    return {
      roll: projectedRows.map((entry) => entry.y),
      rollErrors: projectedRows.flatMap((entry, rollIndex) =>
        entry.error ? [{ rollIndex, code: entry.error.code, kind: entry.error.kind }] : []),
    };
  })(),
  total: state.calculator.total,
  operationSlots: state.calculator.operationSlots,
  draftingSlot: state.calculator.draftingSlot,
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
    for (const [key, count] of Object.entries(expected as Partial<Record<KeyId, number>>)) {
      const keyId = resolveKeyId(key as KeyId);
      assert.equal(
        actualCounts[keyId] ?? 0,
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

