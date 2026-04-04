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
import type { GameState, Key, KeyCell, LayoutCell } from "./types.js";

const EMPTY_PLACEHOLDER: LayoutCell = { kind: "placeholder", area: "empty" };
const REMOVED_VALUE_ATOM_KEYS = new Set<Key>([KEY_ID.const_pi, KEY_ID.const_e]);

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

export const dedupeKeyLayout = (layout: LayoutCell[], seen: Set<Key>): LayoutCell[] => {
  let next: LayoutCell[] | null = null;
  for (let index = 0; index < layout.length; index += 1) {
    const cell = layout[index];
    if (cell.kind !== "key") {
      if (next) {
        next[index] = cell;
      }
      continue;
    }
    if (REMOVED_VALUE_ATOM_KEYS.has(cell.key)) {
      if (!next) {
        next = [...layout];
      }
      next[index] = EMPTY_PLACEHOLDER;
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

export const dedupeAndFilterStorage = (
  storage: Array<KeyCell | null>,
  seen: Set<Key>,
  unlocked: Set<Key>,
): Array<KeyCell | null> => {
  let next: Array<KeyCell | null> | null = null;
  for (let index = 0; index < storage.length; index += 1) {
    const cell = storage[index];
    let mapped: KeyCell | null = null;
    if (
      isKeyCell(cell)
      && !REMOVED_VALUE_ATOM_KEYS.has(cell.key)
      && unlocked.has(cell.key)
      && !seen.has(cell.key)
    ) {
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

export const ensureUnlockedKeysPresent = (
  storage: Array<KeyCell | null>,
  seen: Set<Key>,
  unlocked: Set<Key>,
): Array<KeyCell | null> => {
  let nextStorage = storage;
  for (const key of unlocked) {
    if (REMOVED_VALUE_ATOM_KEYS.has(key)) {
      continue;
    }
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

export const withLayout = (ui: GameState["ui"], keyLayout: LayoutCell[], storageLayout: Array<KeyCell | null>): GameState["ui"] => ({
  ...ui,
  keyLayout,
  keypadCells: fromKeyLayoutArray(keyLayout, ui.keypadColumns, ui.keypadRows),
  storageLayout,
});
