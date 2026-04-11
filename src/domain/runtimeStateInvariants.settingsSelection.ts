import { normalizeSettingsFlagsFromButtonFlags, normalizeSettingsState } from "./settings.js";
import type { CalculatorId, GameState } from "./types.js";

export const normalizeSettingsAndUi = (
  state: Pick<GameState, "ui" | "settings" | "unlocks">,
  _calculatorId: CalculatorId,
  _baseState: GameState,
): { ui: GameState["ui"]; settings: GameState["settings"] } => {
  const settings = normalizeSettingsState(state);
  const buttonFlags = normalizeSettingsFlagsFromButtonFlags(state.ui.buttonFlags);
  const ui = (
    settings.visualizer === state.ui.activeVisualizer
    && buttonFlags === state.ui.buttonFlags
  )
    ? state.ui
    : {
        ...state.ui,
        activeVisualizer: settings.visualizer,
        buttonFlags,
      };
  return { ui, settings };
};
