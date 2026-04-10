import { normalizeSelectedControlField } from "./controlSelection.js";
import { normalizeSettingsFlagsFromButtonFlags, normalizeSettingsState } from "./settings.js";
import type { CalculatorId, GameState } from "./types.js";

export const normalizeSettingsAndUi = (
  state: Pick<GameState, "ui" | "settings" | "unlocks">,
  _calculatorId: CalculatorId,
  _baseState: GameState,
): { ui: GameState["ui"]; settings: GameState["settings"] } => {
  const normalizedSelectedControlField = normalizeSelectedControlField(state.ui.selectedControlField);
  const settings = normalizeSettingsState(state);
  const buttonFlags = normalizeSettingsFlagsFromButtonFlags(state.ui.buttonFlags);
  const ui = (
    settings.visualizer === state.ui.activeVisualizer
    && buttonFlags === state.ui.buttonFlags
    && state.ui.selectedControlField === normalizedSelectedControlField
  )
    ? state.ui
    : {
        ...state.ui,
        activeVisualizer: settings.visualizer,
        selectedControlField: normalizedSelectedControlField,
        buttonFlags,
      };
  return { ui, settings };
};
