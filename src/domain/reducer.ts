import { initialState } from "./state.js";
import { applyKeyAction } from "./reducer.input.js";
import { applyMoveKeySlot, applySwapKeySlots } from "./reducer.layout.js";
import { applyLifecycleAction } from "./reducer.lifecycle.js";
import type { Action, GameState } from "./types.js";

// Root reducer orchestrator: route actions to focused domain reducers.
export const reducer = (state: GameState = initialState(), action: Action): GameState => {
  if (action.type === "PRESS_KEY") {
    return applyKeyAction(state, action.key);
  }

  const lifecycleHandled = applyLifecycleAction(state, action);
  if (lifecycleHandled) {
    return lifecycleHandled;
  }

  if (action.type === "MOVE_KEY_SLOT") {
    return applyMoveKeySlot(state, action.fromIndex, action.toIndex);
  }
  if (action.type === "SWAP_KEY_SLOTS") {
    return applySwapKeySlots(state, action.firstIndex, action.secondIndex);
  }
  return state;
};
