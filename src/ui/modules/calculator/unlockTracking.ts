import type { GameState, Key, KeyCell } from "../../../domain/types.js";
import {
  getCalculatorModuleState,
  queueToggleAnimation as queueToggleAnimationById,
  readToggleAnimation as readToggleAnimationById,
} from "./runtime.js";
import { getToggleAnimationIdForCell, isToggleFlagActive } from "../calculatorStorageCore.js";

const buildUnlockSnapshot = (state: GameState): Record<Key, boolean> => {
  const snapshot: Partial<Record<Key, boolean>> = {};

  for (const [key, unlocked] of Object.entries(state.unlocks.valueAtoms)) {
    snapshot[key as Key] = unlocked;
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.valueCompose)) {
    snapshot[key as Key] = Boolean(unlocked);
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.valueExpression)) {
    snapshot[key as Key] = unlocked;
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.slotOperators)) {
    snapshot[key as Key] = unlocked;
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.unaryOperators)) {
    snapshot[key as Key] = unlocked;
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.utilities)) {
    snapshot[key as Key] = unlocked;
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.memory)) {
    snapshot[key as Key] = unlocked;
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.steps)) {
    snapshot[key as Key] = Boolean(unlocked);
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.visualizers)) {
    snapshot[key as Key] = unlocked;
  }
  for (const [key, unlocked] of Object.entries(state.unlocks.execution)) {
    snapshot[key as Key] = unlocked;
  }

  return snapshot as Record<Key, boolean>;
};

export const getNewlyUnlockedKeys = (root: Element, state: GameState): Set<Key> => {
  const calculatorState = getCalculatorModuleState(root);
  const currentSnapshot = buildUnlockSnapshot(state);
  if (!calculatorState.previousUnlockSnapshot) {
    calculatorState.previousUnlockSnapshot = currentSnapshot;
    return new Set<Key>();
  }

  const newlyUnlocked = new Set<Key>();
  for (const key of Object.keys(currentSnapshot) as Key[]) {
    if (!calculatorState.previousUnlockSnapshot[key] && currentSnapshot[key]) {
      newlyUnlocked.add(key);
    }
  }
  calculatorState.previousUnlockSnapshot = currentSnapshot;
  return newlyUnlocked;
};

export const queueToggleAnimation = (root: Element, state: GameState, cell: KeyCell): void => {
  const toggleAnimationId = getToggleAnimationIdForCell(cell);
  if (!toggleAnimationId) {
    return;
  }
  queueToggleAnimationById(
    root,
    toggleAnimationId,
    isToggleFlagActive(state, cell) ? "off" : "on",
  );
};

export const readToggleAnimation = (root: Element, cell: KeyCell): "on" | "off" | null => {
  const toggleAnimationId = getToggleAnimationIdForCell(cell);
  if (!toggleAnimationId) {
    return null;
  }
  return readToggleAnimationById(root, toggleAnimationId);
};
