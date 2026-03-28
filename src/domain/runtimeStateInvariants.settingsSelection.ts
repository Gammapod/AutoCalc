import { getEffectiveControlProfile } from "./controlProfileRuntime.js";
import { normalizeSelectedControlField, toLegacyMemoryVariable } from "./controlSelection.js";
import { normalizeSettingsFlagsFromButtonFlags, normalizeSettingsState } from "./settings.js";
import type { CalculatorId, GameState } from "./types.js";

export const normalizeSettingsAndUi = (
  state: Pick<GameState, "ui" | "settings" | "unlocks">,
  calculatorId: CalculatorId,
  baseState: GameState,
): { ui: GameState["ui"]; settings: GameState["settings"] } => {
  const profile = getEffectiveControlProfile(baseState, calculatorId);
  const normalizedSelectedControlField = normalizeSelectedControlField(
    profile,
    state.ui.selectedControlField,
    state.ui.memoryVariable,
  );
  const settings = normalizeSettingsState(state);
  const buttonFlags = normalizeSettingsFlagsFromButtonFlags(state.ui.buttonFlags);
  const normalizedMemoryVariable = toLegacyMemoryVariable(normalizedSelectedControlField);
  const ui = (
    settings.visualizer === state.ui.activeVisualizer
    && buttonFlags === state.ui.buttonFlags
    && state.ui.selectedControlField === normalizedSelectedControlField
    && state.ui.memoryVariable === normalizedMemoryVariable
  )
    ? state.ui
    : {
        ...state.ui,
        activeVisualizer: settings.visualizer,
        selectedControlField: normalizedSelectedControlField,
        memoryVariable: normalizedMemoryVariable,
        buttonFlags,
      };
  return { ui, settings };
};
