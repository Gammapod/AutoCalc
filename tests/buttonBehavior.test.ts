import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { buildKeyButtonAction, isToggleFlagActive } from "../src/ui/render.js";
import type { GameState, KeyCell } from "../src/domain/types.js";

export const runButtonBehaviorTests = (): void => {
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
};
