import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { buildShellViewModel, createShellController } from "../src/ui/renderAdapter.js";
import type { GameState } from "../src/domain/types.js";

export const runUiShellFallbackControlsTests = (): void => {
  const base = initialState();
  const controller = createShellController();
  const modelMiddleOnly = buildShellViewModel(base);
  controller.sync(base);

  assert.equal(controller.canSnapUp(modelMiddleOnly), false, "up control disabled when only middle exists");
  assert.equal(controller.canSnapDown(modelMiddleOnly), true, "down control enabled when bottom snap exists");

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

  controller.setSnap(modelWithStorage, "middle");
  assert.equal(controller.canSnapUp(modelWithStorage), false, "up control disabled at middle in two-snap mode");
};

