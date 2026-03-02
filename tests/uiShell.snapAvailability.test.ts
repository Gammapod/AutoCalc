import assert from "node:assert/strict";
import { initialState, GRAPH_VISIBLE_FLAG } from "../src/domain/state.js";
import { buildShellViewModel } from "../src_v2/ui/renderAdapter.js";
import type { GameState } from "../src/domain/types.js";

export const runUiShellSnapAvailabilityTests = (): void => {
  const baseline = initialState();
  const baselineModel = buildShellViewModel(baseline);
  assert.deepEqual(baselineModel.availableSnaps, ["middle"], "default shell exposes middle snap only");

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
  assert.deepEqual(withStorageModel.availableSnaps, ["middle", "bottom"], "storage unlock adds bottom snap");

  const withGraphAndStorage: GameState = {
    ...withStorage,
    ui: {
      ...withStorage.ui,
      buttonFlags: {
        ...withStorage.ui.buttonFlags,
        [GRAPH_VISIBLE_FLAG]: true,
      },
    },
  };
  const fullModel = buildShellViewModel(withGraphAndStorage);
  assert.deepEqual(
    fullModel.availableSnaps,
    ["top", "middle", "bottom"],
    "graph toggle with storage unlock exposes full three-snap stack",
  );
  assert.equal(fullModel.defaultSnap, "middle", "default snap remains middle");
};

