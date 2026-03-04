import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { canStartTouchRearrange } from "../src_v2/ui/renderAdapter.js";

export const runUiShellTouchRearrangeBottomSnapGateTests = (): void => {
  const state = initialState();
  assert.equal(
    canStartTouchRearrange(state, "touch", false, "middle"),
    true,
    "touch rearrange is enabled in middle snap",
  );
  assert.equal(
    canStartTouchRearrange(state, "touch", false, "bottom"),
    true,
    "touch rearrange is enabled in bottom snap",
  );
  assert.equal(
    canStartTouchRearrange(state, "mouse", false, "bottom"),
    false,
    "touch rearrange only starts for touch pointer input",
  );
  assert.equal(
    canStartTouchRearrange(state, "touch", true, "bottom"),
    false,
    "touch rearrange is disabled while right menu is open",
  );
};
