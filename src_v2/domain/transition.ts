import { initialState } from "../../src/domain/state.js";
import { applyKeyAction } from "../../src/domain/reducer.input.js";
import { applyMoveKeySlot, applySwapKeySlots } from "../../src/domain/reducer.layout.js";
import { applyLifecycleAction } from "../../src/domain/reducer.lifecycle.js";
import type { GameState } from "../../src/domain/types.js";
import { actionFromEvent, type DomainEvent } from "./events.js";

const applyLegacySemantics = (state: GameState, event: DomainEvent): GameState => {
  const action = actionFromEvent(event);
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

export const applyEvent = (state: GameState | undefined, event: DomainEvent): GameState =>
  applyLegacySemantics(state ?? initialState(), event);
