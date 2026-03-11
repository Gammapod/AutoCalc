import { isKeyUnlocked } from "../../../domain/keyUnlocks.js";
import type { Action, GameState } from "../../../domain/types.js";
import { STORAGE_COLUMNS } from "../../../domain/state.js";
import { getKeyVisualGroup } from "../calculator/dom.js";

type KeyVisualGroup = ReturnType<typeof getKeyVisualGroup>;

const STORAGE_SORT_FLAG_BY_GROUP: Record<KeyVisualGroup, string> = {
  execution: "storage.sort.execution",
  value_expression: "storage.sort.value_expression",
  slot_operator: "storage.sort.slot_operator",
  utility: "storage.sort.utility",
  settings: "storage.sort.settings",
  memory: "storage.sort.memory",
  step: "storage.sort.step",
  visualizers: "storage.sort.visualizers",
};

const STORAGE_SORT_SEGMENTS: KeyVisualGroup[] = [
  "execution",
  "value_expression",
  "slot_operator",
  "utility",
  "settings",
  "memory",
  "step",
  "visualizers",
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

export const buildStorageRenderOrder = (state: GameState): number[] => {
  const selectedTypeUnlocked: number[] = [];
  const otherUnlocked: number[] = [];
  const empty: number[] = [];
  const locked: number[] = [];
  const activeSortGroup = getActiveStorageSortGroup(state);

  for (let index = 0; index < state.ui.storageLayout.length; index += 1) {
    const cell = state.ui.storageLayout[index];
    if (!cell) {
      empty.push(index);
      continue;
    }
    if (isKeyUnlocked(state, cell.key)) {
      if (activeSortGroup && getKeyVisualGroup(cell.key) === activeSortGroup) {
        selectedTypeUnlocked.push(index);
      } else {
        otherUnlocked.push(index);
      }
      continue;
    }
    locked.push(index);
  }

  return [...selectedTypeUnlocked, ...otherUnlocked, ...empty, ...locked];
};
