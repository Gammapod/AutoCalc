import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { createTouchRearrangeController } from "../src_v2/ui/renderAdapter.js";

export const runUiShellTouchRearrangeLongPressTests = (): void => {
  const state = initialState();
  const controller = createTouchRearrangeController();
  controller.syncContext(state, () => undefined);

  const started = controller.startPress(
    1,
    100,
    200,
    { surface: "storage", index: 0, key: "CE" },
    null,
  );
  assert.equal(started, true, "touch press can start in idle mode");
  assert.equal(controller.isPressing(), true, "controller enters pressing mode");

  const tapResult = controller.end(1);
  assert.equal(tapResult, "noop", "releasing before long-press activation keeps tap behavior");
  assert.equal(controller.runtime.mode, "idle", "controller resets to idle after tap");

  controller.startPress(
    2,
    100,
    200,
    { surface: "storage", index: 0, key: "CE" },
    null,
  );
  const activated = controller.forceActivateCarryForTests();
  assert.equal(activated, true, "forced activation switches controller to carrying mode");
  assert.equal(controller.isCarrying(), true, "controller reports carrying mode");
};

