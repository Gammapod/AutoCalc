import { executeCommand } from "../domain/commands.js";
import type { Action, GameState, Store } from "../domain/types.js";
import type { AppServices } from "../contracts/appServices.js";

export const createStore = (initialState: GameState, services?: AppServices): Store => {
  let state = initialState;
  const subscribers = new Set<(state: GameState) => void>();

  return {
    getState: () => state,
    dispatch: (action: Action) => {
      state = executeCommand(state, { type: "DispatchAction", action }, { services }).state;
      for (const subscriber of subscribers) {
        subscriber(state);
      }
      return action;
    },
    subscribe: (subscriber: (state: GameState) => void) => {
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    },
  };
};

