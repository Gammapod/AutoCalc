import type { Action, GameState, Key } from "../../src/domain/types.js";

export type DomainEvent =
  | { type: "KeyPressed"; key: Key }
  | { type: "RunResetRequested" }
  | { type: "SaveHydrated"; state: GameState }
  | { type: "UnlockAllRequested" }
  | { type: "KeySlotMoved"; fromIndex: number; toIndex: number }
  | { type: "KeySlotsSwapped"; firstIndex: number; secondIndex: number };

export const eventFromAction = (action: Action): DomainEvent => {
  if (action.type === "PRESS_KEY") {
    return { type: "KeyPressed", key: action.key };
  }
  if (action.type === "RESET_RUN") {
    return { type: "RunResetRequested" };
  }
  if (action.type === "HYDRATE_SAVE") {
    return { type: "SaveHydrated", state: action.state };
  }
  if (action.type === "UNLOCK_ALL") {
    return { type: "UnlockAllRequested" };
  }
  if (action.type === "MOVE_KEY_SLOT") {
    return { type: "KeySlotMoved", fromIndex: action.fromIndex, toIndex: action.toIndex };
  }
  return { type: "KeySlotsSwapped", firstIndex: action.firstIndex, secondIndex: action.secondIndex };
};

export const actionFromEvent = (event: DomainEvent): Action => {
  if (event.type === "KeyPressed") {
    return { type: "PRESS_KEY", key: event.key };
  }
  if (event.type === "RunResetRequested") {
    return { type: "RESET_RUN" };
  }
  if (event.type === "SaveHydrated") {
    return { type: "HYDRATE_SAVE", state: event.state };
  }
  if (event.type === "UnlockAllRequested") {
    return { type: "UNLOCK_ALL" };
  }
  if (event.type === "KeySlotMoved") {
    return { type: "MOVE_KEY_SLOT", fromIndex: event.fromIndex, toIndex: event.toIndex };
  }
  return { type: "SWAP_KEY_SLOTS", firstIndex: event.firstIndex, secondIndex: event.secondIndex };
};
