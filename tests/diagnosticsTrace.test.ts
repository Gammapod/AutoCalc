import assert from "node:assert/strict";
import { reducer } from "../src/domain/reducer.js";
import { initialState } from "../src/domain/state.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import type { GameState } from "../src/domain/types.js";

export const runDiagnosticsTraceTests = (): void => {
  const base = initialState();
  assert.equal(base.ui.diagnostics.lastAction.sequence, 0, "initial diagnostics trace sequence starts at zero");
  assert.equal(base.ui.diagnostics.lastAction.actionKind, "none", "initial diagnostics trace action kind starts neutral");

  const afterOperatorPress = reducer(base, { type: "PRESS_KEY", key: KEY_ID.op_add });
  assert.equal(afterOperatorPress.ui.diagnostics.lastAction.sequence, 1, "trace sequence increments after action dispatch");
  assert.equal(afterOperatorPress.ui.diagnostics.lastAction.actionKind, "press_key", "operator press is classified as press_key");
  assert.equal(afterOperatorPress.ui.diagnostics.lastAction.keyId, KEY_ID.op_add, "trace stores keyId for key presses");
  assert.equal(afterOperatorPress.ui.diagnostics.lastAction.operatorId, KEY_ID.op_add, "trace stores operatorId for operator key");

  const afterNoEffect = reducer(afterOperatorPress, { type: "SET_ACTIVE_CALCULATOR", calculatorId: "f" });
  assert.equal(afterNoEffect.ui.diagnostics.lastAction.sequence, 2, "trace sequence increments on no-effect actions");
  assert.equal(afterNoEffect.ui.diagnostics.lastAction.actionKind, "system_action", "layout no-op is classified as system action");

  const afterVisualizerToggle = reducer(afterNoEffect, { type: "TOGGLE_VISUALIZER", visualizer: "factorization" });
  assert.equal(afterVisualizerToggle.ui.diagnostics.lastAction.sequence, 3, "trace sequence increments on visualizer toggles");
  assert.equal(afterVisualizerToggle.ui.diagnostics.lastAction.actionKind, "toggle_visualizer", "visualizer toggle classification is stable");
  assert.equal(afterVisualizerToggle.ui.diagnostics.lastAction.keyId, KEY_ID.viz_factorization, "visualizer toggle maps back to key id");
  assert.equal(afterVisualizerToggle.ui.diagnostics.lastAction.visualizerToggled, true, "visualizer toggled context flag is recorded");

  const afterReset = reducer(afterVisualizerToggle, { type: "RESET_RUN" });
  assert.equal(afterReset.ui.diagnostics.lastAction.sequence, 4, "trace sequence persists and increments across reset");
  assert.equal(afterReset.ui.diagnostics.lastAction.actionKind, "system_action", "reset action classification is system_action");

  const hydratedPayload: GameState = {
    ...initialState(),
    ui: {
      ...initialState().ui,
      diagnostics: {
        lastAction: {
          sequence: 42,
          actionKind: "press_key",
          keyId: KEY_ID.digit_1,
        },
      },
    },
  };
  const afterHydrate = reducer(afterReset, { type: "HYDRATE_SAVE", state: hydratedPayload });
  assert.equal(afterHydrate.ui.diagnostics.lastAction.sequence, 42, "hydrate preserves payload diagnostics trace");
  assert.equal(afterHydrate.ui.diagnostics.lastAction.keyId, KEY_ID.digit_1, "hydrate does not overwrite payload key trace");
};
