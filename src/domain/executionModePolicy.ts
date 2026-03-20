import { getButtonDefinition } from "./buttonRegistry.js";
import { KEY_ID, resolveKeyId, toLegacyKey, type KeyLike } from "./keyPresentation.js";
import { EXECUTION_PAUSE_EQUALS_FLAG, EXECUTION_PAUSE_FLAG } from "./state.js";
import type { Action, GameState, Key, KeyCell } from "./types.js";

const isKeyCell = (cell: GameState["ui"]["keyLayout"][number] | GameState["ui"]["storageLayout"][number]): cell is KeyCell =>
  Boolean(cell && cell.kind === "key");

const tryResolveKey = (key: KeyLike): Key | null => {
  try {
    return resolveKeyId(key);
  } catch {
    return null;
  }
};

const isExecutionCategoryKey = (key: KeyLike): boolean => {
  const resolved = tryResolveKey(key);
  if (!resolved) {
    return false;
  }
  const definition = getButtonDefinition(toLegacyKey(resolved));
  return definition?.category === "execution";
};

const getExecutionToggleFlagsForKey = (ui: GameState["ui"], keyLike: KeyLike): Set<string> => {
  const key = tryResolveKey(keyLike);
  if (!key) {
    return new Set<string>();
  }
  const flags = new Set<string>();
  if (key === KEY_ID.exec_play_pause) {
    flags.add(EXECUTION_PAUSE_FLAG);
  }
  if (key === KEY_ID.exec_equals) {
    flags.add(EXECUTION_PAUSE_EQUALS_FLAG);
  }
  for (const cell of ui.keyLayout) {
    if (!isKeyCell(cell)) {
      continue;
    }
    const resolved = tryResolveKey(cell.key);
    if (!resolved || resolved !== key) {
      continue;
    }
    if (cell.behavior?.type === "toggle_flag") {
      flags.add(cell.behavior.flag);
    }
  }
  for (const cell of ui.storageLayout) {
    if (!isKeyCell(cell)) {
      continue;
    }
    const resolved = tryResolveKey(cell.key);
    if (!resolved || resolved !== key) {
      continue;
    }
    if (cell.behavior?.type === "toggle_flag") {
      flags.add(cell.behavior.flag);
    }
  }
  return flags;
};

const getExecutionToggleFlags = (ui: GameState["ui"]): Set<string> => {
  const flags = new Set<string>([EXECUTION_PAUSE_FLAG, EXECUTION_PAUSE_EQUALS_FLAG]);
  for (const cell of ui.keyLayout) {
    if (!isKeyCell(cell)) {
      continue;
    }
    if (!isExecutionCategoryKey(cell.key)) {
      continue;
    }
    if (cell.behavior?.type === "toggle_flag") {
      flags.add(cell.behavior.flag);
    }
  }
  for (const cell of ui.storageLayout) {
    if (!isKeyCell(cell)) {
      continue;
    }
    if (!isExecutionCategoryKey(cell.key)) {
      continue;
    }
    if (cell.behavior?.type === "toggle_flag") {
      flags.add(cell.behavior.flag);
    }
  }
  return flags;
};

export const listExecutionToggleFlags = (state: GameState): Set<string> => getExecutionToggleFlags(state.ui);

export const isExecutionModeActive = (state: GameState): boolean => {
  const flags = getExecutionToggleFlags(state.ui);
  for (const flag of flags) {
    if (state.ui.buttonFlags[flag]) {
      return true;
    }
  }
  return false;
};

export const clearExecutionModeFlags = (state: GameState): GameState => {
  const executionFlags = getExecutionToggleFlags(state.ui);
  if (executionFlags.size === 0) {
    return state;
  }
  const nextFlags = { ...state.ui.buttonFlags };
  let changed = false;
  for (const flag of executionFlags) {
    if (Object.prototype.hasOwnProperty.call(nextFlags, flag)) {
      delete nextFlags[flag];
      changed = true;
    }
  }
  if (!changed) {
    return state;
  }
  return {
    ...state,
    ui: {
      ...state.ui,
      buttonFlags: nextFlags,
    },
  };
};

export const isExecutionToggleFlag = (state: GameState, flag: string): boolean =>
  listExecutionToggleFlags(state).has(flag);

export const clearExecutionModeFlagsForInterrupt = (state: GameState, keyLike: KeyLike): GameState => {
  if (!isExecutionCategoryKey(keyLike)) {
    return clearExecutionModeFlags(state);
  }
  const resolvedKey = tryResolveKey(keyLike);
  const executionFlags = getExecutionToggleFlags(state.ui);
  const keepFlags = resolvedKey === KEY_ID.exec_play_pause
    ? new Set<string>([EXECUTION_PAUSE_FLAG])
    : resolvedKey === KEY_ID.exec_equals
      ? new Set<string>([EXECUTION_PAUSE_EQUALS_FLAG])
    : getExecutionToggleFlagsForKey(state.ui, keyLike);
  if (executionFlags.size === 0) {
    return state;
  }
  const nextFlags = { ...state.ui.buttonFlags };
  let changed = false;
  for (const flag of executionFlags) {
    if (keepFlags.has(flag)) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(nextFlags, flag)) {
      delete nextFlags[flag];
      changed = true;
    }
  }
  if (!changed) {
    return state;
  }
  return {
    ...state,
    ui: {
      ...state.ui,
      buttonFlags: nextFlags,
    },
  };
};

export const clearExecutionModeFlagsForInterruptByFlag = (state: GameState, keepFlag: string): GameState => {
  const executionFlags = getExecutionToggleFlags(state.ui);
  if (executionFlags.size === 0) {
    return state;
  }
  const nextFlags = { ...state.ui.buttonFlags };
  let changed = false;
  for (const flag of executionFlags) {
    if (flag === keepFlag) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(nextFlags, flag)) {
      delete nextFlags[flag];
      changed = true;
    }
  }
  if (!changed) {
    return state;
  }
  return {
    ...state,
    ui: {
      ...state.ui,
      buttonFlags: nextFlags,
    },
  };
};

export const isExecutionInterruptingKey = (keyLike: KeyLike): boolean => {
  const resolved = tryResolveKey(keyLike);
  if (!resolved) {
    return false;
  }
  const definition = getButtonDefinition(toLegacyKey(resolved));
  if (!definition) {
    return false;
  }
  return (
    definition.category === "execution"
    || definition.category === "memory"
    || definition.category === "utility"
  );
};

export const isExecutionGatedInputKey = (keyLike: KeyLike): boolean => {
  if (isExecutionInterruptingKey(keyLike)) {
    return false;
  }
  const resolved = tryResolveKey(keyLike);
  if (!resolved) {
    return false;
  }
  const definition = getButtonDefinition(toLegacyKey(resolved));
  if (!definition) {
    return false;
  }
  return (
    definition.category === "value_expression"
    || definition.category === "slot_operator"
    || definition.category === "unary_operator"
  );
};

const touchesActiveCalculatorSurface = (
  state: GameState,
  fromSurface: "keypad" | "keypad_f" | "keypad_g" | "storage",
  toSurface: "keypad" | "keypad_f" | "keypad_g" | "storage",
): boolean => {
  if (!state.calculators?.g || !state.calculators?.f) {
    return fromSurface === "keypad" || toSurface === "keypad";
  }
  const activeSurface = state.activeCalculatorId === "g" ? "keypad_g" : "keypad_f";
  return (
    fromSurface === "keypad"
    || toSurface === "keypad"
    || fromSurface === activeSurface
    || toSurface === activeSurface
  );
};

export const isExecutionGatedMutationAction = (state: GameState, action: Action): boolean => {
  if (!isExecutionModeActive(state)) {
    return false;
  }
  if (action.type === "PRESS_KEY") {
    return isExecutionGatedInputKey(action.key);
  }
  if (action.type === "MOVE_LAYOUT_CELL" || action.type === "SWAP_LAYOUT_CELLS") {
    return touchesActiveCalculatorSurface(state, action.fromSurface, action.toSurface);
  }
  return (
    action.type === "SET_KEYPAD_DIMENSIONS"
    || action.type === "UPGRADE_KEYPAD_ROW"
    || action.type === "UPGRADE_KEYPAD_COLUMN"
  );
};

export const clearExecutionToggleFlagsForKey = (state: GameState, keyLike: KeyLike): GameState => {
  const clearFlags = getExecutionToggleFlagsForKey(state.ui, keyLike);
  if (clearFlags.size === 0) {
    return state;
  }
  const nextFlags = { ...state.ui.buttonFlags };
  let changed = false;
  for (const flag of clearFlags) {
    if (Object.prototype.hasOwnProperty.call(nextFlags, flag)) {
      delete nextFlags[flag];
      changed = true;
    }
  }
  if (!changed) {
    return state;
  }
  return {
    ...state,
    ui: {
      ...state.ui,
      buttonFlags: nextFlags,
    },
  };
};

export const markInvalidExecutionGateInput = (state: GameState): GameState => ({
  ...state,
  ui: {
    ...state.ui,
    invalidExecutionGateNonce: (state.ui.invalidExecutionGateNonce ?? 0) + 1,
  },
});

export const isExecutionStepThroughKey = (key: Key): boolean => key === KEY_ID.exec_step_through;
