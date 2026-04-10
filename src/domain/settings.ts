import { keyToVisualizerId } from "./buttonRegistry.js";
import { isKeyUnlocked } from "./keyUnlocks.js";
import { KEY_ID, resolveKeyId } from "./keyPresentation.js";
import {
  BINARY_OCTAVE_CYCLE_FLAG,
  BINARY_MODE_FLAG,
  DELTA_RANGE_CLAMP_FLAG,
  MOD_ZERO_TO_DELTA_FLAG,
  STEP_EXPANSION_FLAG,
} from "./state.js";
import type {
  ActiveVisualizer,
  BaseSetting,
  CalculatorSettings,
  GameState,
  Key,
  StepExpansionSetting,
  VisualizerId,
  WrapperSetting,
} from "./types.js";

export type SettingsFamily = keyof CalculatorSettings;

export type SettingOptionByFamily = {
  visualizer: ActiveVisualizer;
  wrapper: WrapperSetting;
  base: BaseSetting;
  stepExpansion: StepExpansionSetting;
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
};

export const createDefaultCalculatorSettings = (): CalculatorSettings => ({ ...DEFAULT_CALCULATOR_SETTINGS });

const isSettingsToggleKey = (key: Key): boolean =>
  key === KEY_ID.toggle_delta_range_clamp
  || key === KEY_ID.toggle_mod_zero_to_delta
  || key === KEY_ID.toggle_binary_octave_cycle
  || key === KEY_ID.toggle_binary_mode
  || key === KEY_ID.toggle_step_expansion;

export const resolveSettingSelectionForKey = (key: Key): SettingSelection | null => {
  const resolved = resolveKeyId(key);
  const visualizer = keyToVisualizerId(resolved);
  if (visualizer) {
    return { family: "visualizer", option: visualizer };
  }
  if (!isSettingsToggleKey(resolved)) {
    return null;
  }
  if (resolved === KEY_ID.toggle_delta_range_clamp) {
    return { family: "wrapper", option: "delta_range_clamp" };
  }
  if (resolved === KEY_ID.toggle_mod_zero_to_delta) {
    return { family: "wrapper", option: "mod_zero_to_delta" };
  }
  if (resolved === KEY_ID.toggle_binary_octave_cycle) {
    return { family: "wrapper", option: "binary_octave_cycle" };
  }
  if (resolved === KEY_ID.toggle_binary_mode) {
    return { family: "base", option: "base2" };
  }
  return { family: "stepExpansion", option: "on" };
};

export const resolveSettingSelectionForFlag = (flag: string): SettingSelection<"wrapper" | "base" | "stepExpansion"> | null => {
  const trimmed = flag.trim();
  if (trimmed === DELTA_RANGE_CLAMP_FLAG) {
    return { family: "wrapper", option: "delta_range_clamp" };
  }
  if (trimmed === MOD_ZERO_TO_DELTA_FLAG) {
    return { family: "wrapper", option: "mod_zero_to_delta" };
  }
  if (trimmed === BINARY_OCTAVE_CYCLE_FLAG) {
    return { family: "wrapper", option: "binary_octave_cycle" };
  }
  if (trimmed === BINARY_MODE_FLAG) {
    return { family: "base", option: "base2" };
  }
  if (trimmed === STEP_EXPANSION_FLAG) {
    return { family: "stepExpansion", option: "on" };
  }
  return null;
};

const isInstalledSettingOption = <F extends SettingsFamily>(
  state: Pick<GameState, "ui">,
  family: F,
  option: SettingOptionByFamily[F],
): boolean => {
  for (const cell of state.ui.keyLayout) {
    if (cell.kind !== "key") {
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
  const families: SettingsFamily[] = ["visualizer", "wrapper", "base", "stepExpansion"];
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
  return next;
};

export const normalizeSettingsFlagsFromButtonFlags = (flags: Record<string, boolean>): Record<string, boolean> => {
  const nextFlags = { ...flags };
  delete nextFlags[DELTA_RANGE_CLAMP_FLAG];
  delete nextFlags[MOD_ZERO_TO_DELTA_FLAG];
  delete nextFlags[BINARY_OCTAVE_CYCLE_FLAG];
  delete nextFlags[STEP_EXPANSION_FLAG];
  delete nextFlags[BINARY_MODE_FLAG];
  return nextFlags;
};

export const visualizerToSettingsOption = (visualizer: VisualizerId): ActiveVisualizer => visualizer;
