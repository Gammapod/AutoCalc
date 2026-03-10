import type { Action } from "../domain/types.js";

type InteractionRuntimeState = {
  inputBlocked: boolean;
};

const isRuntimeInteractiveAction = (action: Action): boolean =>
  action.type === "PRESS_KEY" ||
  action.type === "TOGGLE_FLAG" ||
  action.type === "TOGGLE_VISUALIZER" ||
  action.type === "MOVE_LAYOUT_CELL" ||
  action.type === "SWAP_LAYOUT_CELLS" ||
  action.type === "ALLOCATOR_ADJUST" ||
  action.type === "ALLOCATOR_SET_MAX_POINTS" ||
  action.type === "ALLOCATOR_ADD_MAX_POINTS" ||
  action.type === "RESET_ALLOCATOR_DEVICE" ||
  action.type === "ALLOCATOR_RETURN_PRESSED" ||
  action.type === "ALLOCATOR_ALLOCATE_PRESSED" ||
  action.type === "SET_KEYPAD_DIMENSIONS" ||
  action.type === "UPGRADE_KEYPAD_ROW" ||
  action.type === "UPGRADE_KEYPAD_COLUMN";

export const createInteractionRuntime = () => {
  const runtime: InteractionRuntimeState = {
    inputBlocked: false,
  };

  const isInputBlocked = (): boolean => runtime.inputBlocked;
  const setInputBlocked = (blocked: boolean): void => {
    runtime.inputBlocked = blocked;
  };

  const shouldBlockAction = (action: Action): boolean => {
    if (runtime.inputBlocked && isRuntimeInteractiveAction(action)) {
      return true;
    }
    return false;
  };

  return {
    isInputBlocked,
    setInputBlocked,
    shouldBlockAction,
  };
};
