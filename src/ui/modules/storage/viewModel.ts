import { isKeyUnlocked } from "../../../domain/keyUnlocks.js";
import { buttonRegistry } from "../../../domain/buttonRegistry.js";
import type { Action, GameState, Key } from "../../../domain/types.js";
import { STORAGE_COLUMNS } from "../../../domain/state.js";
import { getKeyVisualGroup } from "../calculator/dom.js";

type KeyVisualGroup = ReturnType<typeof getKeyVisualGroup>;

const STORAGE_SORT_FLAG_BY_GROUP: Record<KeyVisualGroup, string> = {
  execution: "storage.sort.execution",
  value_expression: "storage.sort.value_expression",
  slot_operator: "storage.sort.slot_operator",
  utility: "storage.sort.utility",
  settings: "storage.sort.settings",
  global_system: "storage.sort.global_system",
  memory: "storage.sort.memory",
  step: "storage.sort.step",
};

const STORAGE_SORT_SEGMENTS: KeyVisualGroup[] = [
  "execution",
  "value_expression",
  "slot_operator",
  "utility",
  "settings",
  "global_system",
  "memory",
  "step",
];

const getStorageSortFlag = (group: KeyVisualGroup): string => STORAGE_SORT_FLAG_BY_GROUP[group];

export const getStorageRowCount = (buttonCount: number, columns: number = STORAGE_COLUMNS): number => {
  if (columns <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(buttonCount / columns));
};

export const getActiveStorageSortGroup = (state: GameState): KeyVisualGroup | null => {
  for (const group of STORAGE_SORT_SEGMENTS) {
    if (Boolean(state.ui.buttonFlags[getStorageSortFlag(group)])) {
      return group;
    }
  }
  return null;
};

export const buildStorageSortToggleSequence = (
  state: GameState,
  targetGroup: KeyVisualGroup,
): Action[] => {
  const targetFlag = getStorageSortFlag(targetGroup);
  const actions: Action[] = [];
  if (!Boolean(state.ui.buttonFlags[targetFlag])) {
    actions.push({ type: "TOGGLE_FLAG", flag: targetFlag });
  }
  for (const group of STORAGE_SORT_SEGMENTS) {
    const flag = getStorageSortFlag(group);
    if (flag === targetFlag) {
      continue;
    }
    if (Boolean(state.ui.buttonFlags[flag])) {
      actions.push({ type: "TOGGLE_FLAG", flag });
    }
  }
  return actions;
};

export const buildStorageRenderOrder = (state: GameState): Key[] => {
  const selectedTypeUnlocked: Key[] = [];
  const otherUnlocked: Key[] = [];
  const activeSortGroup = getActiveStorageSortGroup(state);

  for (const entry of buttonRegistry) {
    if (!isKeyUnlocked(state, entry.key)) {
      continue;
    }
    if (activeSortGroup && getKeyVisualGroup(entry.key) === activeSortGroup) {
      selectedTypeUnlocked.push(entry.key);
    } else {
      otherUnlocked.push(entry.key);
    }
  }

  return [...selectedTypeUnlocked, ...otherUnlocked];
};
