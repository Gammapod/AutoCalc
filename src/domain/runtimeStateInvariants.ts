import { iterUnlockedButtons } from "./buttonStateAccess.js";
import { fromKeyLayoutArray } from "./keypadLayoutModel.js";
import { KEY_ID } from "./keyPresentation.js";
import {
  BINARY_MODE_FLAG,
  DELTA_RANGE_CLAMP_FLAG,
  EXECUTION_PAUSE_EQUALS_FLAG,
  EXECUTION_PAUSE_FLAG,
  MOD_ZERO_TO_DELTA_FLAG,
  STEP_EXPANSION_FLAG,
  STORAGE_COLUMNS,
  STORAGE_INITIAL_SLOTS,
} from "./state.js";
import type { CalculatorId, GameState, Key, KeyCell, LayoutCell } from "./types.js";
import { isMultiCalculatorSession } from "./multiCalculator.js";
import { createInitialUiDiagnosticsLastAction } from "./state.js";
import { createDefaultCalculatorSettings, normalizeSettingsFlagsFromButtonFlags, normalizeSettingsState } from "./settings.js";

const EMPTY_PLACEHOLDER: LayoutCell = { kind: "placeholder", area: "empty" };

const normalizeStorageLength = (storageLayout: Array<KeyCell | null>): Array<KeyCell | null> => {
  let next = storageLayout;
  const normalizedLength = Math.max(
    STORAGE_INITIAL_SLOTS,
    Math.ceil(storageLayout.length / STORAGE_COLUMNS) * STORAGE_COLUMNS,
  );
  if (next.length < normalizedLength) {
    next = [...next];
    while (next.length < normalizedLength) {
      next.push(null);
    }
  }
  if (!next.some((cell) => cell === null)) {
    if (next === storageLayout) {
      next = [...next];
    }
    for (let index = 0; index < STORAGE_COLUMNS; index += 1) {
      next.push(null);
    }
  }
  return next;
};

const isKeyCell = (cell: LayoutCell | KeyCell | null): cell is KeyCell => Boolean(cell && cell.kind === "key");

const canonicalCellForKey = (key: Key): KeyCell => {
  if (key === KEY_ID.toggle_delta_range_clamp) {
    return { kind: "key", key, behavior: { type: "toggle_flag", flag: DELTA_RANGE_CLAMP_FLAG } };
  }
  if (key === KEY_ID.toggle_mod_zero_to_delta) {
    return { kind: "key", key, behavior: { type: "toggle_flag", flag: MOD_ZERO_TO_DELTA_FLAG } };
  }
  if (key === KEY_ID.toggle_step_expansion) {
    return { kind: "key", key, behavior: { type: "toggle_flag", flag: STEP_EXPANSION_FLAG } };
  }
  if (key === KEY_ID.toggle_binary_mode) {
    return { kind: "key", key, behavior: { type: "toggle_flag", flag: BINARY_MODE_FLAG } };
  }
  if (key === KEY_ID.exec_play_pause) {
    return { kind: "key", key, behavior: { type: "toggle_flag", flag: EXECUTION_PAUSE_FLAG } };
  }
  if (key === KEY_ID.exec_equals) {
    return { kind: "key", key, behavior: { type: "toggle_flag", flag: EXECUTION_PAUSE_EQUALS_FLAG } };
  }
  return { kind: "key", key };
};

const dedupeKeyLayout = (layout: LayoutCell[], seen: Set<Key>): LayoutCell[] => {
  let next: LayoutCell[] | null = null;
  for (let index = 0; index < layout.length; index += 1) {
    const cell = layout[index];
    if (cell.kind !== "key") {
      if (next) {
        next[index] = cell;
      }
      continue;
    }
    if (seen.has(cell.key)) {
      if (!next) {
        next = [...layout];
      }
      next[index] = EMPTY_PLACEHOLDER;
      continue;
    }
    seen.add(cell.key);
    if (next) {
      next[index] = cell;
    }
  }
  return next ?? layout;
};

const dedupeAndFilterStorage = (
  storage: Array<KeyCell | null>,
  seen: Set<Key>,
  unlocked: Set<Key>,
): Array<KeyCell | null> => {
  let next: Array<KeyCell | null> | null = null;
  for (let index = 0; index < storage.length; index += 1) {
    const cell = storage[index];
    let mapped: KeyCell | null = null;
    if (isKeyCell(cell) && unlocked.has(cell.key) && !seen.has(cell.key)) {
      seen.add(cell.key);
      mapped = cell;
    }
    if (mapped !== cell && !next) {
      next = [...storage];
    }
    if (next) {
      next[index] = mapped;
    }
  }
  return next ?? storage;
};

const ensureUnlockedKeysPresent = (
  storage: Array<KeyCell | null>,
  seen: Set<Key>,
  unlocked: Set<Key>,
): Array<KeyCell | null> => {
  let nextStorage = storage;
  for (const key of unlocked) {
    if (seen.has(key)) {
      continue;
    }
    if (nextStorage === storage) {
      nextStorage = [...nextStorage];
    }
    const cell = canonicalCellForKey(key);
    const emptyIndex = nextStorage.findIndex((entry) => entry === null);
    if (emptyIndex >= 0) {
      nextStorage[emptyIndex] = cell;
    } else {
      nextStorage.push(cell);
    }
    seen.add(key);
  }
  return normalizeStorageLength(nextStorage);
};

const withLayout = (ui: GameState["ui"], keyLayout: LayoutCell[], storageLayout: Array<KeyCell | null>): GameState["ui"] => ({
  ...ui,
  keyLayout,
  keypadCells: fromKeyLayoutArray(keyLayout, ui.keypadColumns, ui.keypadRows),
  storageLayout,
});

const withNormalizedDiagnostics = (ui: GameState["ui"]): GameState["ui"] => {
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

const normalizeSettingsAndUi = (
  state: Pick<GameState, "ui" | "settings" | "unlocks">,
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
  const seen = new Set<Key>();

  if (!isMultiCalculatorSession(stateWithUi)) {
    const keyLayout = dedupeKeyLayout(stateWithUi.ui.keyLayout, seen);
    const filteredStorage = dedupeAndFilterStorage(stateWithUi.ui.storageLayout, seen, unlocked);
    const storageLayout = ensureUnlockedKeysPresent(filteredStorage, seen, unlocked);
    const layoutUi = (keyLayout === stateWithUi.ui.keyLayout && storageLayout === stateWithUi.ui.storageLayout)
      ? stateWithUi.ui
      : withLayout(stateWithUi.ui, keyLayout, storageLayout);
    const normalized = normalizeSettingsAndUi({
      ui: layoutUi,
      settings: stateWithUi.settings,
      unlocks: stateWithUi.unlocks,
    });
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

  const normalizedUiByCalculatorId: Partial<Record<CalculatorId, GameState["ui"]>> = {};
  const normalizedSettingsByCalculatorId: Partial<Record<CalculatorId, GameState["settings"]>> = {};
  const dedupedLayoutByCalculatorId: Partial<Record<CalculatorId, LayoutCell[]>> = {};
  for (const calculatorId of orderedCalculatorIds) {
    const instance = calculators[calculatorId];
    if (!instance) {
      continue;
    }
    const normalizedInstanceUi = withNormalizedDiagnostics(instance.ui);
    const normalizedInstanceSettings = instance.settings ?? createDefaultCalculatorSettings();
    normalizedUiByCalculatorId[calculatorId] = normalizedInstanceUi;
    normalizedSettingsByCalculatorId[calculatorId] = normalizedInstanceSettings;
    dedupedLayoutByCalculatorId[calculatorId] = dedupeKeyLayout(normalizedInstanceUi.keyLayout, seen);
  }

  // In multi-calculator sessions, preserve keypad ownership before collapsing storage duplicates.
  const filteredStorage = dedupeAndFilterStorage(stateWithUi.ui.storageLayout, seen, unlocked);
  const storageLayout = ensureUnlockedKeysPresent(filteredStorage, seen, unlocked);

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
    const dedupedLayout = dedupedLayoutByCalculatorId[calculatorId] ?? dedupeKeyLayout(normalizedInstanceUi.keyLayout, seen);
    const layoutUi = (dedupedLayout === normalizedInstanceUi.keyLayout && storageLayout === normalizedInstanceUi.storageLayout)
      ? normalizedInstanceUi
      : withLayout(normalizedInstanceUi, dedupedLayout, storageLayout);
    const normalized = normalizeSettingsAndUi({
      ui: layoutUi,
      settings: normalizedInstanceSettings,
      unlocks: stateWithUi.unlocks,
    });
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
