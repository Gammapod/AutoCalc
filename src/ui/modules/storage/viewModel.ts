import { isKeyUnlocked } from "../../../domain/keyUnlocks.js";
import { buttonRegistry } from "../../../domain/buttonRegistry.js";
import type { Action, GameState, Key } from "../../../domain/types.js";
import { STORAGE_COLUMNS } from "../../../domain/state.js";
import { KEY_ID } from "../../../domain/keyPresentation.js";
import { getKeyVisualGroup } from "../calculator/dom.js";

type KeyVisualGroup = ReturnType<typeof getKeyVisualGroup>;
export type StorageFilterGroup = "slot_operator" | "value_expression" | "execution" | "settings" | "utility_bundle";
export type StorageFilterSelection = StorageFilterGroup | "all";

const STORAGE_FILTER_FLAG_BY_GROUP: Record<StorageFilterGroup, string> = {
  slot_operator: "storage.sort.slot_operator",
  value_expression: "storage.sort.value_expression",
  execution: "storage.sort.execution",
  settings: "storage.sort.settings",
  utility_bundle: "storage.sort.utility",
};

const STORAGE_FILTER_SEGMENTS: StorageFilterGroup[] = [
  "slot_operator",
  "value_expression",
  "execution",
  "settings",
  "utility_bundle",
];
const REMOVED_STORAGE_KEYS = new Set<Key>([KEY_ID.const_pi, KEY_ID.const_e]);

const getStorageFilterFlag = (group: StorageFilterGroup): string => STORAGE_FILTER_FLAG_BY_GROUP[group];

export const getStorageRowCount = (buttonCount: number, columns: number = STORAGE_COLUMNS): number => {
  if (columns <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(buttonCount / columns));
};

export const getActiveStorageSortGroup = (state: GameState): StorageFilterGroup | null => {
  for (const group of STORAGE_FILTER_SEGMENTS) {
    if (Boolean(state.ui.buttonFlags[getStorageFilterFlag(group)])) {
      return group;
    }
  }
  return null;
};

export const buildStorageSortToggleSequence = (
  state: GameState,
  targetGroup: StorageFilterSelection,
): Action[] => {
  const actions: Action[] = [];
  if (targetGroup !== "all") {
    const targetFlag = getStorageFilterFlag(targetGroup);
    if (!Boolean(state.ui.buttonFlags[targetFlag])) {
      actions.push({ type: "TOGGLE_FLAG", flag: targetFlag });
    }
  }
  for (const group of STORAGE_FILTER_SEGMENTS) {
    const flag = getStorageFilterFlag(group);
    if (targetGroup !== "all" && flag === getStorageFilterFlag(targetGroup)) {
      continue;
    }
    if (Boolean(state.ui.buttonFlags[flag])) {
      actions.push({ type: "TOGGLE_FLAG", flag });
    }
  }
  return actions;
};

const isKeyInFilterGroup = (keyGroup: KeyVisualGroup, filterGroup: StorageFilterGroup): boolean => {
  if (filterGroup === "utility_bundle") {
    return keyGroup === "utility" || keyGroup === "global_system";
  }
  return keyGroup === filterGroup;
};

export const buildStorageRenderOrder = (
  state: GameState,
  options: {
    includeLocked?: boolean;
  } = {},
): Key[] => {
  const filteredUnlocked: Key[] = [];
  const activeSortGroup = getActiveStorageSortGroup(state);
  const includeLocked = options.includeLocked ?? false;

  for (const entry of buttonRegistry) {
    if (REMOVED_STORAGE_KEYS.has(entry.key)) {
      continue;
    }
    if (!includeLocked && !isKeyUnlocked(state, entry.key)) {
      continue;
    }
    const keyGroup = getKeyVisualGroup(entry.key);
    if (activeSortGroup && !isKeyInFilterGroup(keyGroup, activeSortGroup)) {
      continue;
    }
    filteredUnlocked.push(entry.key);
  }

  return filteredUnlocked;
};
