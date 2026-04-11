import assert from "node:assert/strict";
import { executeCommand } from "../src/domain/commands.js";
import { EXECUTION_PAUSE_EQUALS_FLAG, initialState } from "../src/domain/state.js";
import type { GameState } from "../src/domain/types.js";

const withExecutionPause = (state: GameState): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    buttonFlags: {
      ...state.ui.buttonFlags,
      [EXECUTION_PAUSE_EQUALS_FLAG]: true,
    },
  },
});

export const runContractsDomainUiEffectsCurrentTests = (): void => {
  {
    const state = initialState();
    const result = executeCommand(state, {
      type: "DispatchAction",
      action: { type: "PRESS_KEY", key: "system_save_quit_main_menu" },
    });
    assert.equal(
      result.uiEffects.some((effect) => effect.type === "request_mode_transition"),
      true,
      "system key dispatch emits mode-transition UI intent",
    );
  }

  {
    const state = withExecutionPause(initialState());
    const result = executeCommand(state, {
      type: "DispatchAction",
      action: { type: "PRESS_KEY", key: "digit_1" },
    });
    assert.equal(
      result.uiEffects.some((effect) => effect.type === "execution_gate_rejected"),
      true,
      "execution-gated input emits reject feedback effect",
    );
  }
};
