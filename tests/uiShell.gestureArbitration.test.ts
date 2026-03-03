import assert from "node:assert/strict";
import { initialState, GRAPH_VISIBLE_FLAG } from "../src/domain/state.js";
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
  const fullState: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      uiUnlocks: {
        ...base.unlocks.uiUnlocks,
        storageVisible: true,
      },
    },
    ui: {
      ...base.ui,
      buttonFlags: {
        ...base.ui.buttonFlags,
        [GRAPH_VISIBLE_FLAG]: true,
      },
    },
  };
  const model = buildShellViewModel(fullState);
  const controller = createShellController();
  controller.sync(fullState);

  assert.equal(resolveSnapFromDrag("middle", model, -30, 0), "middle", "small drags do not switch snaps");
  assert.equal(resolveSnapFromDrag("middle", model, -100, 0), "top", "large upward drags switch one snap up");
  assert.equal(resolveSnapFromDrag("middle", model, 100, 0), "bottom", "large downward drags switch one snap down");

  controller.setSnap(model, "top");
  assert.equal(controller.runtime.activeSnapId, "top", "controller can set top snap");
  controller.settleFromDrag(model, 200, 0);
  assert.equal(controller.runtime.activeSnapId, "middle", "settling from top with downward drag moves to adjacent middle snap");
  controller.settleFromDrag(model, 200, 0);
  assert.equal(controller.runtime.activeSnapId, "bottom", "repeated downward settle reaches bottom");
  controller.settleFromDrag(model, 200, 0);
  assert.equal(controller.runtime.activeSnapId, "bottom", "cannot move below bottom snap");

  assert.equal(resolveBottomPanelFromDrag("storage", -100, 0), "allocator", "left swipe from storage reveals allocator panel");
  assert.equal(resolveBottomPanelFromDrag("allocator", 100, 0), "storage", "right swipe from allocator returns to storage panel");
  assert.equal(resolveBottomPanelFromDrag("storage", 30, 0), "storage", "short or opposite swipe keeps active storage panel");
  assert.equal(
    resolveMiddlePanelFromDrag("calculator", -100, 0),
    "checklist",
    "left swipe from calculator reveals checklist panel",
  );
  assert.equal(
    resolveMiddlePanelFromDrag("checklist", 100, 0),
    "calculator",
    "right swipe from checklist returns to calculator panel",
  );
};

