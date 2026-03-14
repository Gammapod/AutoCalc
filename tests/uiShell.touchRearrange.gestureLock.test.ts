import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { createTouchRearrangeController } from "../src/ui/renderAdapter.js";

export const runUiShellTouchRearrangeGestureLockTests = (): void => {
  const state = initialState();
  const controller = createTouchRearrangeController();
  controller.syncContext(state, () => undefined);

  assert.equal(controller.isGestureBlocked(), false, "gesture lock is off in idle mode");
  controller.startPress(1, 10, 10, { surface: "storage", index: 0, key: k("C") }, null);
  assert.equal(controller.isGestureBlocked(), false, "pressing mode does not lock shell gestures");

  controller.forceActivateCarryForTests();
  assert.equal(controller.isCarrying(), true, "controller enters carrying mode");
  assert.equal(controller.isGestureBlocked(), true, "carrying mode locks shell gestures");

  controller.cancel();
  assert.equal(controller.isGestureBlocked(), false, "cancel clears gesture lock");
};



