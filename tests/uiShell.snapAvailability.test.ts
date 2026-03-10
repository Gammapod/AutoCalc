import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { buildShellViewModel } from "../src/ui/renderAdapter.js";
import type { GameState } from "../src/domain/types.js";

export const runUiShellSnapAvailabilityTests = (): void => {
  const baseline = initialState();
  const baselineModel = buildShellViewModel(baseline);
  assert.deepEqual(baselineModel.availableSnaps, ["middle", "bottom"], "default shell exposes storage snap when available");
  const baselineModifyModel = buildShellViewModel(baseline);
  assert.deepEqual(
    baselineModifyModel.availableSnaps,
    ["middle", "bottom"],
    "bottom snap is always available in shell model",
  );

  const withStorage: GameState = {
    ...baseline,
    unlocks: {
      ...baseline.unlocks,
      uiUnlocks: {
        ...baseline.unlocks.uiUnlocks,
        storageVisible: true,
      },
    },
  };
  const withStorageModel = buildShellViewModel(withStorage);
  assert.deepEqual(withStorageModel.availableSnaps, ["middle", "bottom"], "storage unlock keeps bottom snap available");

  const withStorageModifyModel = buildShellViewModel(withStorage);
  assert.deepEqual(withStorageModifyModel.availableSnaps, ["middle", "bottom"], "storage unlock adds bottom snap");

  assert.deepEqual(
    withStorageModifyModel.availableSnaps,
    ["middle", "bottom"],
    "v2 shell uses a two-snap stack even when visualizers are active",
  );
  assert.equal(withStorageModifyModel.defaultSnap, "middle", "default snap remains middle");
};

