import { AUTO_EQUALS_FLAG } from "./state.js";
import { getOperationSnapshot } from "./slotDrafting.js";
import type { ExecKey, GameState, Key } from "./types.js";
import { KEY_ID } from "./keyPresentation.js";

const EXECUTOR_KEYS: readonly ExecKey[] = [KEY_ID.exec_equals];

export const isAutoEqualsEnabled = (state: GameState): boolean => Boolean(state.ui.buttonFlags[AUTO_EQUALS_FLAG]);

export const hasValidAutoEqualsEquation = (state: GameState): boolean => getOperationSnapshot(state.calculator).length > 0;

const isExecutorKey = (key: Key): key is ExecKey => EXECUTOR_KEYS.includes(key as ExecKey);

export const getInstalledExecutorKey = (state: GameState): ExecKey | null => {
  for (const cell of state.ui.keyLayout) {
    if (cell.kind === "key" && isExecutorKey(cell.key)) {
      return cell.key;
    }
  }
  return null;
};

export const clearAutoEqualsFlagForRuntime = (state: GameState): GameState => {
  if (!Object.prototype.hasOwnProperty.call(state.ui.buttonFlags, AUTO_EQUALS_FLAG)) {
    return state;
  }
  const nextFlags = { ...state.ui.buttonFlags };
  delete nextFlags[AUTO_EQUALS_FLAG];
  return {
    ...state,
    ui: {
      ...state.ui,
      buttonFlags: nextFlags,
    },
  };
};

export const normalizeLoadedStateForRuntime = (loaded: GameState | null): GameState | null =>
  loaded ? clearAutoEqualsFlagForRuntime(loaded) : loaded;
