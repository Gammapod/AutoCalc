import type { Action } from "../domain/types.js";

export type InteractionMode = "calculator" | "modify";

type InteractionRuntimeState = {
  mode: InteractionMode;
  inputBlocked: boolean;
};

const isStorageLayoutAction = (action: Action): boolean => {
  if (action.type !== "MOVE_LAYOUT_CELL" && action.type !== "SWAP_LAYOUT_CELLS") {
    return false;
  }
  return (
    action.fromSurface === "storage" ||
    action.toSurface === "storage"
  );
};

const isRuntimeInteractiveAction = (action: Action): boolean =>
  action.type === "PRESS_KEY" ||
  action.type === "TOGGLE_FLAG" ||
  action.type === "MOVE_LAYOUT_CELL" ||
  action.type === "SWAP_LAYOUT_CELLS" ||
  action.type === "ALLOCATOR_ADJUST" ||
  action.type === "ALLOCATOR_SET_MAX_POINTS" ||
  action.type === "ALLOCATOR_ADD_MAX_POINTS" ||
  action.type === "RESET_ALLOCATOR_DEVICE" ||
  action.type === "ALLOCATOR_RETURN_PRESSED" ||
  action.type === "SET_KEYPAD_DIMENSIONS" ||
  action.type === "UPGRADE_KEYPAD_ROW" ||
  action.type === "UPGRADE_KEYPAD_COLUMN";

export const createInteractionRuntime = (initialMode: InteractionMode = "calculator") => {
  const runtime: InteractionRuntimeState = {
    mode: initialMode,
    inputBlocked: false,
  };

  const getMode = (): InteractionMode => runtime.mode;
  const setMode = (mode: InteractionMode): void => {
    runtime.mode = mode;
  };

  const isInputBlocked = (): boolean => runtime.inputBlocked;
  const setInputBlocked = (blocked: boolean): void => {
    runtime.inputBlocked = blocked;
  };

  const shouldBlockAction = (action: Action): boolean => {
    if (runtime.inputBlocked && isRuntimeInteractiveAction(action)) {
      return true;
    }

    if (runtime.mode === "calculator") {
      if (action.type === "ALLOCATOR_ADJUST") {
        return true;
      }
      if (isStorageLayoutAction(action)) {
        return true;
      }
      return false;
    }

    if (runtime.mode === "modify") {
      if (action.type === "PRESS_KEY" || action.type === "TOGGLE_FLAG") {
        return true;
      }
      return false;
    }

    return false;
  };

  return {
    getMode,
    setMode,
    isInputBlocked,
    setInputBlocked,
    shouldBlockAction,
  };
};
