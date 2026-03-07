import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { buildShellViewModel } from "../src/ui/renderAdapter.js";
import type { GameState } from "../src/domain/types.js";

export const runUiShellSnapAvailabilityTests = (): void => {
  const baseline = initialState();
  const baselineModel = buildShellViewModel(baseline);
  assert.deepEqual(baselineModel.availableSnaps, ["middle"], "default shell exposes middle snap only");
  const baselineModifyModel = buildShellViewModel(baseline, "modify");
  assert.deepEqual(
    baselineModifyModel.availableSnaps,
    ["middle", "bottom"],
    "modify mode always exposes bottom snap for allocator/storage view",
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
  assert.deepEqual(withStorageModel.availableSnaps, ["middle"], "calculator mode keeps bottom snap blocked");

  const withStorageModifyModel = buildShellViewModel(withStorage, "modify");
  assert.deepEqual(withStorageModifyModel.availableSnaps, ["middle", "bottom"], "storage unlock adds bottom snap");

  assert.deepEqual(
    withStorageModifyModel.availableSnaps,
    ["middle", "bottom"],
    "v2 shell uses a two-snap stack even when visualizers are active",
  );
  assert.equal(withStorageModifyModel.defaultSnap, "middle", "default snap remains middle");
};

