import { keyToVisualizerId } from "./buttonRegistry.js";
import { isKeyUnlocked } from "./keyUnlocks.js";
import { KEY_ID, resolveKeyId } from "./keyPresentation.js";
import type {
  ActiveVisualizer,
  AnalyticsSetting,
  BaseSetting,
  CalculatorSettings,
  GameState,
  Key,
  StepExpansionSetting,
  VisualizerId,
  WrapperSetting,
} from "./types.js";

// Keep settings-flag ids local to avoid runtime init cycles with state.ts.
const BINARY_MODE_FLAG = "settings.binary_mode";
const STEP_EXPANSION_FLAG = "settings.step_expansion";
const HISTORY_FLAG = "settings.history";
const FORECAST_FLAG = "settings.forecast";
const CYCLE_FLAG = "settings.cycle";

export type SettingsFamily = keyof CalculatorSettings;

export type SettingOptionByFamily = {
  visualizer: ActiveVisualizer;
  wrapper: WrapperSetting;
  base: BaseSetting;
  stepExpansion: StepExpansionSetting;
  history: AnalyticsSetting;
  forecast: AnalyticsSetting;
  cycle: AnalyticsSetting;
};

export type SettingSelection<F extends SettingsFamily = SettingsFamily> = {
  family: F;
  option: SettingOptionByFamily[F];
};

export const DEFAULT_CALCULATOR_SETTINGS: CalculatorSettings = {
  visualizer: "total",
  wrapper: "none",
  base: "decimal",
  stepExpansion: "off",
  history: "off",
  forecast: "off",
  cycle: "off",
};

export const createDefaultCalculatorSettings = (): CalculatorSettings => ({ ...DEFAULT_CALCULATOR_SETTINGS });

const SETTINGS_TOGGLE_SELECTION_BY_KEY = new Map<Key, SettingSelection>([
  [KEY_ID.toggle_binary_mode, { family: "base", option: "base2" }],
  [KEY_ID.toggle_step_expansion, { family: "stepExpansion", option: "on" }],
  [KEY_ID.toggle_history, { family: "history", option: "on" }],
  [KEY_ID.toggle_forecast, { family: "forecast", option: "on" }],
  [KEY_ID.toggle_cycle, { family: "cycle", option: "on" }],
]);

const SETTINGS_TOGGLE_SELECTION_BY_FLAG = new Map<string, SettingSelection>([
  [BINARY_MODE_FLAG, { family: "base", option: "base2" }],
  [STEP_EXPANSION_FLAG, { family: "stepExpansion", option: "on" }],
  [HISTORY_FLAG, { family: "history", option: "on" }],
  [FORECAST_FLAG, { family: "forecast", option: "on" }],
  [CYCLE_FLAG, { family: "cycle", option: "on" }],
]);

const ANALYTICS_SETTINGS_FAMILY_SET = new Set<SettingsFamily>(["history", "forecast", "cycle", "stepExpansion"]);

export const analyticsSettingsFamilies: readonly SettingsFamily[] = ["history", "forecast", "cycle", "stepExpansion"];

export const isAnalyticsSettingsFamily = (family: SettingsFamily): boolean =>
  ANALYTICS_SETTINGS_FAMILY_SET.has(family);

export const resolveSettingSelectionForKey = (key: Key): SettingSelection | null => {
  const resolved = resolveKeyId(key);
  const visualizer = keyToVisualizerId(resolved);
  if (visualizer) {
    return { family: "visualizer", option: visualizer };
  }
  return SETTINGS_TOGGLE_SELECTION_BY_KEY.get(resolved) ?? null;
};

export const resolveSettingSelectionForFlag = (
  flag: string,
): SettingSelection<"base" | "stepExpansion" | "history" | "forecast" | "cycle"> | null => {
  const trimmed = flag.trim();
  return (SETTINGS_TOGGLE_SELECTION_BY_FLAG.get(trimmed) as SettingSelection<"base" | "stepExpansion" | "history" | "forecast" | "cycle"> | undefined) ?? null;
};

const isInstalledSettingOption = <F extends SettingsFamily>(
  state: Pick<GameState, "ui">,
  family: F,
  option: SettingOptionByFamily[F],
): boolean => {
  for (const cell of [...state.ui.keyLayout, ...state.ui.storageLayout]) {
    if (!cell || cell.kind !== "key") {
      continue;
    }
    const selection = resolveSettingSelectionForKey(cell.key);
    if (!selection || selection.family !== family) {
      continue;
    }
    if (selection.option === option) {
      return true;
    }
  }
  return false;
};

const getFamilyBaseDefault = <F extends SettingsFamily>(family: F): SettingOptionByFamily[F] =>
  DEFAULT_CALCULATOR_SETTINGS[family];

export const resolveForcedDefaultForFamily = <F extends SettingsFamily>(
  state: Pick<GameState, "ui" | "unlocks">,
  family: F,
): SettingOptionByFamily[F] | null => {
  for (const cell of state.ui.keyLayout) {
    if (cell.kind !== "key") {
      continue;
    }
    const selection = resolveSettingSelectionForKey(cell.key);
    if (!selection || selection.family !== family) {
      continue;
    }
    if (isKeyUnlocked(state as GameState, cell.key)) {
      continue;
    }
    return selection.option as SettingOptionByFamily[F];
  }
  return null;
};

export const resolveEffectiveDefaultForFamily = <F extends SettingsFamily>(
  state: Pick<GameState, "ui" | "unlocks">,
  family: F,
): SettingOptionByFamily[F] =>
  resolveForcedDefaultForFamily(state, family) ?? getFamilyBaseDefault(family);

export const applySettingsSelection = (
  state: Pick<GameState, "ui" | "unlocks" | "settings">,
  selection: SettingSelection,
): CalculatorSettings => {
  const current = state.settings[selection.family];
  if (current !== selection.option) {
    return {
      ...state.settings,
      [selection.family]: selection.option,
    };
  }
  const effectiveDefault = resolveEffectiveDefaultForFamily(state, selection.family);
  if (effectiveDefault === selection.option) {
    return state.settings;
  }
  return {
    ...state.settings,
    [selection.family]: effectiveDefault,
  };
};

export const normalizeSettingsState = (
  state: Pick<GameState, "ui" | "unlocks" | "settings">,
): CalculatorSettings => {
  let next = state.settings;
  const families: SettingsFamily[] = ["visualizer", "base", "stepExpansion", "history", "forecast", "cycle"];
  for (const family of families) {
    const current = next[family];
    const effectiveDefault = resolveEffectiveDefaultForFamily(state, family);
    if (current === effectiveDefault) {
      continue;
    }
    if (current === DEFAULT_CALCULATOR_SETTINGS[family]) {
      next = {
        ...next,
        [family]: effectiveDefault,
      };
      continue;
    }
    if (isInstalledSettingOption(state, family, current as never)) {
      continue;
    }
    next = {
      ...next,
      [family]: effectiveDefault,
    };
  }
  if (next.wrapper !== DEFAULT_CALCULATOR_SETTINGS.wrapper) {
    next = {
      ...next,
      wrapper: DEFAULT_CALCULATOR_SETTINGS.wrapper,
    };
  }
  return next;
};

export const normalizeSettingsFlagsFromButtonFlags = (flags: Record<string, boolean>): Record<string, boolean> => {
  const nextFlags = { ...flags };
  delete nextFlags[STEP_EXPANSION_FLAG];
  delete nextFlags[BINARY_MODE_FLAG];
  delete nextFlags[HISTORY_FLAG];
  delete nextFlags[FORECAST_FLAG];
  delete nextFlags[CYCLE_FLAG];
  return nextFlags;
};

export const visualizerToSettingsOption = (visualizer: VisualizerId): ActiveVisualizer => visualizer;
