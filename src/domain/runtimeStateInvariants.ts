import { keyToVisualizerId } from "./buttonRegistry.js";
import { iterUnlockedButtons } from "./buttonStateAccess.js";
import { fromKeyLayoutArray } from "./keypadLayoutModel.js";
import { KEY_ID, resolveKeyId } from "./keyPresentation.js";
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
import type { CalculatorId, GameState, Key, KeyCell, LayoutCell, VisualizerId } from "./types.js";
import { isMultiCalculatorSession } from "./multiCalculator.js";

const EMPTY_PLACEHOLDER: LayoutCell = { kind: "placeholder", area: "empty" };

const SETTINGS_TOGGLE_KEYS: readonly Key[] = [
  KEY_ID.toggle_delta_range_clamp,
  KEY_ID.toggle_mod_zero_to_delta,
  KEY_ID.toggle_step_expansion,
  KEY_ID.toggle_binary_mode,
];

const SETTING_FLAG_BY_KEY: Partial<Record<Key, string>> = {
  [KEY_ID.toggle_delta_range_clamp]: DELTA_RANGE_CLAMP_FLAG,
  [KEY_ID.toggle_mod_zero_to_delta]: MOD_ZERO_TO_DELTA_FLAG,
  [KEY_ID.toggle_step_expansion]: STEP_EXPANSION_FLAG,
  [KEY_ID.toggle_binary_mode]: BINARY_MODE_FLAG,
} as const;

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

const firstLockedInstalledSettingToggle = (layout: LayoutCell[], unlocked: Set<Key>): Key | null => {
  for (const cell of layout) {
    if (cell.kind !== "key") {
      continue;
    }
    if (SETTINGS_TOGGLE_KEYS.includes(cell.key) && !unlocked.has(cell.key)) {
      return cell.key;
    }
  }
  return null;
};

const toVisualizerId = (key: Key): VisualizerId | null => keyToVisualizerId(resolveKeyId(key));

const firstLockedInstalledVisualizer = (layout: LayoutCell[], unlocked: Set<Key>): VisualizerId | null => {
  for (const cell of layout) {
    if (cell.kind !== "key" || unlocked.has(cell.key)) {
      continue;
    }
    const visualizerId = toVisualizerId(cell.key);
    if (visualizerId) {
      return visualizerId;
    }
  }
  return null;
};

const applyLockedInstalledToggleSemantics = (
  ui: GameState["ui"],
  unlocked: Set<Key>,
): GameState["ui"] => {
  const forcedSetting = firstLockedInstalledSettingToggle(ui.keyLayout, unlocked);
  const nextFlags = { ...ui.buttonFlags };
  let flagsChanged = false;
  if (forcedSetting) {
    if (DELTA_RANGE_CLAMP_FLAG in nextFlags) {
      delete nextFlags[DELTA_RANGE_CLAMP_FLAG];
      flagsChanged = true;
    }
    if (MOD_ZERO_TO_DELTA_FLAG in nextFlags) {
      delete nextFlags[MOD_ZERO_TO_DELTA_FLAG];
      flagsChanged = true;
    }
    if (STEP_EXPANSION_FLAG in nextFlags) {
      delete nextFlags[STEP_EXPANSION_FLAG];
      flagsChanged = true;
    }
    if (BINARY_MODE_FLAG in nextFlags) {
      delete nextFlags[BINARY_MODE_FLAG];
      flagsChanged = true;
    }
    const forcedFlag = SETTING_FLAG_BY_KEY[forcedSetting];
    if (forcedFlag && !nextFlags[forcedFlag]) {
      nextFlags[forcedFlag] = true;
      flagsChanged = true;
    }
  }

  const forcedVisualizer = firstLockedInstalledVisualizer(ui.keyLayout, unlocked);
  const activeVisualizer = forcedVisualizer ?? ui.activeVisualizer;
  if (activeVisualizer === ui.activeVisualizer && !flagsChanged) {
    return ui;
  }
  return {
    ...ui,
    buttonFlags: nextFlags,
    activeVisualizer,
  };
};

export const normalizeRuntimeStateInvariants = (state: GameState): GameState => {
  const unlocked = new Set<Key>(iterUnlockedButtons(state));
  const seen = new Set<Key>();

  if (!isMultiCalculatorSession(state)) {
    const keyLayout = dedupeKeyLayout(state.ui.keyLayout, seen);
    const filteredStorage = dedupeAndFilterStorage(state.ui.storageLayout, seen, unlocked);
    const storageLayout = ensureUnlockedKeysPresent(filteredStorage, seen, unlocked);
    const layoutUi = (keyLayout === state.ui.keyLayout && storageLayout === state.ui.storageLayout)
      ? state.ui
      : withLayout(state.ui, keyLayout, storageLayout);
    const nextUi = applyLockedInstalledToggleSemantics(layoutUi, unlocked);
    if (nextUi === state.ui) {
      return state;
    }
    return {
      ...state,
      ui: nextUi,
    };
  }

  const calculators = state.calculators ?? {};
  const orderedCalculatorIds = (state.calculatorOrder ?? Object.keys(calculators) as CalculatorId[])
    .filter((id) => Boolean(calculators[id]?.ui));
  if (orderedCalculatorIds.length === 0) {
    return state;
  }
  const filteredStorage = dedupeAndFilterStorage(state.ui.storageLayout, seen, unlocked);
  const storageLayout = ensureUnlockedKeysPresent(filteredStorage, seen, unlocked);

  const nextCalculators = { ...calculators };
  let calculatorsChanged = false;
  const uiByCalculatorId: Partial<Record<CalculatorId, GameState["ui"]>> = {};
  for (const calculatorId of orderedCalculatorIds) {
    const instance = calculators[calculatorId];
    if (!instance) {
      continue;
    }
    const dedupedLayout = dedupeKeyLayout(instance.ui.keyLayout, seen);
    const layoutUi = (dedupedLayout === instance.ui.keyLayout && storageLayout === instance.ui.storageLayout)
      ? instance.ui
      : withLayout(instance.ui, dedupedLayout, storageLayout);
    const resolvedUi = applyLockedInstalledToggleSemantics(layoutUi, unlocked);
    uiByCalculatorId[calculatorId] = resolvedUi;
    if (resolvedUi !== instance.ui) {
      calculatorsChanged = true;
      nextCalculators[calculatorId] = { ...instance, ui: resolvedUi };
    }
  }

  const activeCalculatorId = (state.activeCalculatorId && uiByCalculatorId[state.activeCalculatorId])
    ? state.activeCalculatorId
    : (orderedCalculatorIds[0] ?? "f");
  const rootUi = uiByCalculatorId[activeCalculatorId] ?? state.ui;
  if (!calculatorsChanged && rootUi === state.ui) {
    return state;
  }

  return {
    ...state,
    ui: rootUi,
    calculators: nextCalculators,
  };
};
