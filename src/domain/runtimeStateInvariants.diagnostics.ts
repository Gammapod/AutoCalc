import { createInitialUiDiagnosticsLastAction } from "./state.js";
import type { GameState } from "./types.js";

export const withNormalizedDiagnostics = (ui: GameState["ui"]): GameState["ui"] => {
  const lastAction = ui.diagnostics?.lastAction;
  if (
    lastAction
    && typeof lastAction.sequence === "number"
    && Number.isInteger(lastAction.sequence)
    && lastAction.sequence >= 0
    && typeof lastAction.actionKind === "string"
  ) {
    return ui;
  }
  return {
    ...ui,
    diagnostics: {
      lastAction: createInitialUiDiagnosticsLastAction(),
    },
  };
};
