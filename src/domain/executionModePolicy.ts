import { getButtonDefinition } from "./buttonRegistry.js";
import { KEY_ID } from "./keyPresentation.js";
import {
  EXECUTION_PAUSE_EQUALS_FLAG,
  EXECUTION_PAUSE_FLAG,
} from "./state.js";
import { isMultiCalculatorSession, resolveActiveCalculatorId, toCalculatorSurface } from "./multiCalculator.js";
import { shouldRejectRollInverseExecution } from "./rollInverseExecution.js";
import type { Action, GameState, Key, KeyCell } from "./types.js";
import { resolveSettingSelectionForFlag } from "./settings.js";

const isKeyCell = (cell: GameState["ui"]["keyLayout"][number] | GameState["ui"]["storageLayout"][number]): cell is KeyCell =>
  Boolean(cell && cell.kind === "key");

const isExecutionCategoryKey = (key: Key): boolean => {
  const definition = getButtonDefinition(key);
  return definition?.category === "execution";
};

const getExecutionToggleFlagsForKey = (ui: GameState["ui"], key: Key): Set<string> => {
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
    if (cell.key !== key) {
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
    if (cell.key !== key) {
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

export type ExecutionPolicyInterrupt =
  | { type: "clear_all" }
  | { type: "clear_all_except_flag"; flag: string }
  | { type: "clear_all_except_key"; key: Key };

export type ExecutionPolicyResult =
  | { decision: "allow" }
  | { decision: "reject" }
  | { decision: "interrupt_and_run"; interrupt: ExecutionPolicyInterrupt };

export const clearExecutionModeFlagsForInterrupt = (state: GameState, key: Key): GameState => {
  if (!isExecutionCategoryKey(key)) {
    return clearExecutionModeFlags(state);
  }
  const executionFlags = getExecutionToggleFlags(state.ui);
  const keepFlags = key === KEY_ID.exec_play_pause
    ? new Set<string>([EXECUTION_PAUSE_FLAG])
    : key === KEY_ID.exec_equals
      ? new Set<string>([EXECUTION_PAUSE_EQUALS_FLAG])
    : getExecutionToggleFlagsForKey(state.ui, key);
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

export const applyExecutionInterrupt = (state: GameState, interrupt: ExecutionPolicyInterrupt): GameState => {
  if (interrupt.type === "clear_all") {
    return clearExecutionModeFlags(state);
  }
  if (interrupt.type === "clear_all_except_flag") {
    return clearExecutionModeFlagsForInterruptByFlag(state, interrupt.flag);
  }
  return clearExecutionModeFlagsForInterrupt(state, interrupt.key);
};

export const isExecutionInterruptingKey = (key: Key): boolean => {
  const definition = getButtonDefinition(key);
  if (!definition) {
    return false;
  }
  return (
    definition.category === "execution"
    || definition.category === "memory"
    || definition.category === "utility"
  );
};

export const isExecutionGatedInputKey = (key: Key): boolean => {
  if (isExecutionInterruptingKey(key)) {
    return false;
  }
  const definition = getButtonDefinition(key);
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
  fromSurface: "keypad" | "keypad_f" | "keypad_g" | "keypad_menu" | "storage",
  toSurface: "keypad" | "keypad_f" | "keypad_g" | "keypad_menu" | "storage",
): boolean => {
  if (!isMultiCalculatorSession(state)) {
    return fromSurface === "keypad" || toSurface === "keypad";
  }
  const activeSurface = toCalculatorSurface(resolveActiveCalculatorId(state));
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
  if (action.type === "MOVE_LAYOUT_CELL" || action.type === "SWAP_LAYOUT_CELLS") {
    return touchesActiveCalculatorSurface(state, action.fromSurface, action.toSurface);
  }
  return (
    action.type === "SET_KEYPAD_DIMENSIONS"
    || action.type === "UPGRADE_KEYPAD_ROW"
    || action.type === "UPGRADE_KEYPAD_COLUMN"
  );
};

export const classifyExecutionPolicyAction = (state: GameState, action: Action): ExecutionPolicyResult => {
  if (action.type === "TOGGLE_FLAG") {
    if (isExecutionToggleFlag(state, action.flag)) {
      return {
        decision: "interrupt_and_run",
        interrupt: { type: "clear_all_except_flag", flag: action.flag },
      };
    }
    if (isExecutionModeActive(state) && resolveSettingSelectionForFlag(action.flag)) {
      return {
        decision: "interrupt_and_run",
        interrupt: { type: "clear_all" },
      };
    }
    return { decision: "allow" };
  }

  if (action.type === "PRESS_KEY") {
    if (
      action.key === KEY_ID.exec_roll_inverse
      && shouldRejectRollInverseExecution(state.calculator.rollEntries)
    ) {
      return { decision: "reject" };
    }
    if (!isExecutionModeActive(state)) {
      return { decision: "allow" };
    }
    if (isExecutionGatedInputKey(action.key)) {
      return { decision: "reject" };
    }
    if (isExecutionInterruptingKey(action.key)) {
      return {
        decision: "interrupt_and_run",
        interrupt: { type: "clear_all_except_key", key: action.key },
      };
    }
    return { decision: "allow" };
  }

  if (action.type === "AUTO_STEP_TICK") {
    return { decision: "allow" };
  }

  if (isExecutionGatedMutationAction(state, action)) {
    return { decision: "reject" };
  }
  return { decision: "allow" };
};

export const clearExecutionToggleFlagsForKey = (state: GameState, key: Key): GameState => {
  const clearFlags = getExecutionToggleFlagsForKey(state.ui, key);
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

export const isExecutionStepThroughKey = (key: Key): boolean => key === KEY_ID.exec_step_through;
