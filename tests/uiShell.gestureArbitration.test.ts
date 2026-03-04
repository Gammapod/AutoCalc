import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import {
  buildShellViewModel,
  createShellController,
  resolveBottomPanelFromDrag,
  resolveMiddlePanelFromDrag,
  resolveSnapFromDrag,
} from "../src_v2/ui/renderAdapter.js";
import type { GameState } from "../src/domain/types.js";

export const runUiShellGestureArbitrationTests = (): void => {
  const base = initialState();
  const stateWithStorage: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      uiUnlocks: {
        ...base.unlocks.uiUnlocks,
        storageVisible: true,
      },
    },
  };
  const model = buildShellViewModel(stateWithStorage, "modify");
  const controller = createShellController();
  controller.sync(stateWithStorage, "modify");

  assert.equal(resolveSnapFromDrag("middle", model, -30, 0), "middle", "small drags do not switch snaps");
  assert.equal(resolveSnapFromDrag("middle", model, -100, 0), "middle", "large upward drags keep middle in two-snap mode");
  assert.equal(resolveSnapFromDrag("middle", model, 100, 0), "bottom", "large downward drags switch one snap down");

  controller.setSnap(model, "middle");
  assert.equal(controller.runtime.activeSnapId, "middle", "controller can set middle snap");
  controller.settleFromDrag(model, 200, 0);
  assert.equal(controller.runtime.activeSnapId, "bottom", "settling from middle with downward drag moves to bottom");
  controller.settleFromDrag(model, 200, 0);
  assert.equal(controller.runtime.activeSnapId, "bottom", "cannot move below bottom snap");

  assert.equal(resolveBottomPanelFromDrag("storage", -100, 0), "allocator", "left swipe from storage reveals allocator panel");
  assert.equal(resolveBottomPanelFromDrag("allocator", -100, 0), "checklist", "left swipe from allocator reveals checklist panel");
  assert.equal(resolveBottomPanelFromDrag("checklist", 100, 0), "allocator", "right swipe from checklist returns to allocator panel");
  assert.equal(resolveBottomPanelFromDrag("allocator", 100, 0), "storage", "right swipe from allocator returns to storage panel");
  assert.equal(resolveBottomPanelFromDrag("storage", 30, 0), "storage", "short or opposite swipe keeps active storage panel");
  assert.equal(
    resolveMiddlePanelFromDrag("calculator", -100, 0),
    "calculator",
    "middle drawer stays on calculator after checklist moved to bottom allocator view",
  );
};

