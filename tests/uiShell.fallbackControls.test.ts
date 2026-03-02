import assert from "node:assert/strict";
import { initialState, GRAPH_VISIBLE_FLAG } from "../src/domain/state.js";
import { buildShellViewModel, createShellController } from "../src_v2/ui/renderAdapter.js";
import type { GameState } from "../src/domain/types.js";

export const runUiShellFallbackControlsTests = (): void => {
  const base = initialState();
  const controller = createShellController();
  const modelMiddleOnly = buildShellViewModel(base);
  controller.sync(base);

  assert.equal(controller.canSnapUp(modelMiddleOnly), false, "up control disabled when only middle exists");
  assert.equal(controller.canSnapDown(modelMiddleOnly), false, "down control disabled when only middle exists");

  const withStorage: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      uiUnlocks: {
        ...base.unlocks.uiUnlocks,
        storageVisible: true,
      },
    },
  };
  const modelWithStorage = buildShellViewModel(withStorage);
  controller.sync(withStorage);
  assert.equal(controller.canSnapDown(modelWithStorage), true, "down control enabled when bottom snap is available");
  controller.moveSnap(modelWithStorage, "down");
  assert.equal(controller.runtime.activeSnapId, "bottom", "down control action moves to bottom");
  assert.equal(controller.canSnapDown(modelWithStorage), false, "down control disabled at bottom boundary");
  assert.equal(controller.canSnapUp(modelWithStorage), true, "up control enabled at bottom boundary");

  const withTopAndBottom: GameState = {
    ...withStorage,
    ui: {
      ...withStorage.ui,
      buttonFlags: {
        ...withStorage.ui.buttonFlags,
        [GRAPH_VISIBLE_FLAG]: true,
      },
    },
  };
  const modelFull = buildShellViewModel(withTopAndBottom);
  controller.sync(withTopAndBottom);
  controller.setSnap(modelFull, "middle");
  assert.equal(controller.canSnapUp(modelFull), true, "up control enabled when top snap is available");
  controller.moveSnap(modelFull, "up");
  assert.equal(controller.runtime.activeSnapId, "top", "up control action moves to top");
};

