import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import {
  beginInputAnimationLock,
  buildKeyButtonAction,
  isToggleFlagActive,
  resetInputLockStateForTests,
  setSuppressClicksUntilForTests,
  shouldSuppressClickForTests,
} from "../src/ui/render.js";
import type { GameState, KeyCell } from "../src/domain/types.js";

export const runButtonBehaviorTests = (): void => {
  resetInputLockStateForTests();
  const base = initialState();
  const pressCell: KeyCell = { kind: "key", key: "+" };
  assert.deepEqual(
    buildKeyButtonAction(base, pressCell),
    { type: "PRESS_KEY", key: "+" },
    "default button behavior dispatches PRESS_KEY",
  );
  assert.equal(isToggleFlagActive(base, pressCell), false, "press behavior never reports toggle-active");

  const toggleCell: KeyCell = {
    kind: "key",
    key: "NEG",
    behavior: { type: "toggle_flag", flag: "sticky.negate" },
  };
  assert.deepEqual(
    buildKeyButtonAction(base, toggleCell),
    { type: "TOGGLE_FLAG", flag: "sticky.negate" },
    "toggle behavior dispatches TOGGLE_FLAG",
  );
  assert.equal(isToggleFlagActive(base, toggleCell), false, "toggle is inactive before flag is set");

  const withToggleFlag: GameState = {
    ...base,
    ui: {
      ...base.ui,
      buttonFlags: {
        ...base.ui.buttonFlags,
        "sticky.negate": true,
      },
    },
  };
  assert.equal(isToggleFlagActive(withToggleFlag, toggleCell), true, "toggle is active when its flag is set");

  const feedToggleCell: KeyCell = { kind: "key", key: "FEED" };
  assert.deepEqual(
    buildKeyButtonAction(base, feedToggleCell),
    { type: "TOGGLE_VISUALIZER", visualizer: "feed" },
    "FEED key dispatches visualizer toggle action",
  );
  const circleToggleCell: KeyCell = { kind: "key", key: "CIRCLE" };
  assert.deepEqual(
    buildKeyButtonAction(base, circleToggleCell),
    { type: "TOGGLE_VISUALIZER", visualizer: "circle" },
    "CIRCLE key dispatches visualizer toggle action",
  );

  const now = Date.now();
  setSuppressClicksUntilForTests(now + 500);
  assert.equal(shouldSuppressClickForTests(), true, "click suppression is true while drag suppression is active");

  setSuppressClicksUntilForTests(now - 1);
  assert.equal(shouldSuppressClickForTests(), false, "click suppression is false when no suppression window is active");

  const releaseLock = beginInputAnimationLock(0);
  assert.equal(shouldSuppressClickForTests(), true, "click suppression is true while animation lock is active");

  releaseLock();
  assert.equal(shouldSuppressClickForTests(), false, "click suppression clears after animation lock release");

  releaseLock();
  assert.equal(shouldSuppressClickForTests(), false, "animation lock release is idempotent");

  const releaseA = beginInputAnimationLock(0);
  const releaseB = beginInputAnimationLock(0);
  assert.equal(shouldSuppressClickForTests(), true, "multiple animation locks keep suppression active");
  releaseA();
  assert.equal(shouldSuppressClickForTests(), true, "suppression remains until all animation locks are released");
  releaseB();
  assert.equal(shouldSuppressClickForTests(), false, "suppression clears after the final animation lock release");

  resetInputLockStateForTests();
};
