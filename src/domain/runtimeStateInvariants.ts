import { iterUnlockedButtons } from "./buttonStateAccess.js";
import { isMultiCalculatorSession } from "./multiCalculator.js";
import { createDefaultCalculatorSettings } from "./settings.js";
import { withNormalizedDiagnostics } from "./runtimeStateInvariants.diagnostics.js";
import {
  dedupeAndFilterStorage,
  dedupeKeyLayout,
  ensureUnlockedKeysPresent,
  withLayout,
} from "./runtimeStateInvariants.layout.js";
import { normalizeSettingsAndUi } from "./runtimeStateInvariants.settingsSelection.js";
import type { CalculatorId, GameState, Key, LayoutCell } from "./types.js";

export const RUNTIME_INVARIANT_NORMALIZER_ORDER = [
  "diagnostics",
  "layout_storage",
  "settings_selection",
] as const;

export const normalizeRuntimeStateInvariants = (state: GameState): GameState => {
  const baseSettings = state.settings ?? createDefaultCalculatorSettings();
  const rootUiNormalized = withNormalizedDiagnostics(state.ui);
  const stateWithUi = (rootUiNormalized === state.ui && baseSettings === state.settings)
    ? state
    : {
        ...state,
        settings: baseSettings,
        ui: rootUiNormalized,
      };
  const unlocked = new Set<Key>(iterUnlockedButtons(stateWithUi));
  const collectInstalledKeys = (layout: LayoutCell[], seen: Set<Key>): void => {
    for (const cell of layout) {
      if (cell.kind === "key") {
        seen.add(cell.key);
      }
    }
  };

  if (!isMultiCalculatorSession(stateWithUi)) {
    const seen = new Set<Key>();
    const keyLayout = dedupeKeyLayout(stateWithUi.ui.keyLayout, seen);
    const filteredStorage = dedupeAndFilterStorage(stateWithUi.ui.storageLayout, seen, unlocked);
    const storageLayout = ensureUnlockedKeysPresent(filteredStorage, seen, unlocked);
    const layoutUi = (keyLayout === stateWithUi.ui.keyLayout && storageLayout === stateWithUi.ui.storageLayout)
      ? stateWithUi.ui
      : withLayout(stateWithUi.ui, keyLayout, storageLayout);
    const singleCalculatorId = stateWithUi.activeCalculatorId ?? "f";
    const normalized = normalizeSettingsAndUi({
      ui: layoutUi,
      settings: stateWithUi.settings,
      unlocks: stateWithUi.unlocks,
    }, singleCalculatorId, stateWithUi);
    if (normalized.ui === stateWithUi.ui && normalized.settings === stateWithUi.settings) {
      return stateWithUi;
    }
    return {
      ...stateWithUi,
      ui: normalized.ui,
      settings: normalized.settings,
    };
  }

  const calculators = stateWithUi.calculators ?? {};
  const orderedCalculatorIds = (stateWithUi.calculatorOrder ?? Object.keys(calculators) as CalculatorId[])
    .filter((id) => Boolean(calculators[id]?.ui));
  if (orderedCalculatorIds.length === 0) {
    return stateWithUi;
  }
  const activeProjectedCalculatorId = stateWithUi.activeCalculatorId ?? orderedCalculatorIds[0] ?? "f";

  const normalizedUiByCalculatorId: Partial<Record<CalculatorId, GameState["ui"]>> = {};
  const normalizedSettingsByCalculatorId: Partial<Record<CalculatorId, GameState["settings"]>> = {};
  const dedupedLayoutByCalculatorId: Partial<Record<CalculatorId, LayoutCell[]>> = {};
  const installedAcrossKeypads = new Set<Key>();
  for (const calculatorId of orderedCalculatorIds) {
    const instance = calculators[calculatorId];
    if (!instance) {
      continue;
    }
    const sourceUi = calculatorId === activeProjectedCalculatorId ? stateWithUi.ui : instance.ui;
    const sourceSettings = calculatorId === activeProjectedCalculatorId
      ? stateWithUi.settings
      : (instance.settings ?? createDefaultCalculatorSettings());
    const normalizedInstanceUi = withNormalizedDiagnostics(sourceUi);
    const normalizedInstanceSettings = sourceSettings ?? createDefaultCalculatorSettings();
    normalizedUiByCalculatorId[calculatorId] = normalizedInstanceUi;
    normalizedSettingsByCalculatorId[calculatorId] = normalizedInstanceSettings;
    const dedupedLayout = dedupeKeyLayout(normalizedInstanceUi.keyLayout, new Set<Key>());
    dedupedLayoutByCalculatorId[calculatorId] = dedupedLayout;
    collectInstalledKeys(dedupedLayout, installedAcrossKeypads);
  }

  // Keep per-calculator keypads isolated; only storage is deduped against globally installed keys.
  const filteredStorage = dedupeAndFilterStorage(stateWithUi.ui.storageLayout, installedAcrossKeypads, unlocked);
  const storageLayout = ensureUnlockedKeysPresent(filteredStorage, installedAcrossKeypads, unlocked);

  const nextCalculators = { ...calculators };
  let calculatorsChanged = false;
  let settingsChanged = false;
  const uiByCalculatorId: Partial<Record<CalculatorId, GameState["ui"]>> = {};
  const settingsByCalculatorId: Partial<Record<CalculatorId, GameState["settings"]>> = {};
  for (const calculatorId of orderedCalculatorIds) {
    const instance = calculators[calculatorId];
    if (!instance) {
      continue;
    }
    const normalizedInstanceUi = normalizedUiByCalculatorId[calculatorId] ?? withNormalizedDiagnostics(instance.ui);
    const normalizedInstanceSettings = normalizedSettingsByCalculatorId[calculatorId] ?? instance.settings ?? createDefaultCalculatorSettings();
    const dedupedLayout = dedupedLayoutByCalculatorId[calculatorId] ?? dedupeKeyLayout(normalizedInstanceUi.keyLayout, new Set<Key>());
    const layoutUi = (dedupedLayout === normalizedInstanceUi.keyLayout && storageLayout === normalizedInstanceUi.storageLayout)
      ? normalizedInstanceUi
      : withLayout(normalizedInstanceUi, dedupedLayout, storageLayout);
    const normalized = normalizeSettingsAndUi({
      ui: layoutUi,
      settings: normalizedInstanceSettings,
      unlocks: stateWithUi.unlocks,
    }, calculatorId, stateWithUi);
    uiByCalculatorId[calculatorId] = normalized.ui;
    settingsByCalculatorId[calculatorId] = normalized.settings;
    if (
      normalized.ui !== instance.ui
      || normalizedInstanceUi !== instance.ui
      || normalized.settings !== instance.settings
    ) {
      calculatorsChanged = true;
      nextCalculators[calculatorId] = {
        ...instance,
        ui: normalized.ui,
        settings: normalized.settings,
      };
    }
    if (normalized.settings !== instance.settings) {
      settingsChanged = true;
    }
  }

  const activeCalculatorId = (stateWithUi.activeCalculatorId && uiByCalculatorId[stateWithUi.activeCalculatorId])
    ? stateWithUi.activeCalculatorId
    : (orderedCalculatorIds[0] ?? "f");
  const rootUi = uiByCalculatorId[activeCalculatorId] ?? stateWithUi.ui;
  const rootSettings = settingsByCalculatorId[activeCalculatorId] ?? stateWithUi.settings;
  if (!calculatorsChanged && !settingsChanged && rootUi === stateWithUi.ui && rootSettings === stateWithUi.settings) {
    return stateWithUi;
  }

  for (const calculatorId of orderedCalculatorIds) {
    const instance = nextCalculators[calculatorId];
    if (!instance) {
      continue;
    }
    const nextSettings = settingsByCalculatorId[calculatorId] ?? instance.settings;
    if (instance.settings !== nextSettings) {
      nextCalculators[calculatorId] = {
        ...instance,
        settings: nextSettings,
      };
    }
  }

  return {
    ...stateWithUi,
    ui: rootUi,
    settings: rootSettings,
    calculators: nextCalculators,
  };
};
