import type { Action, GameState } from "./types.js";
import { eventFromAction, type DomainEvent } from "./events.js";
import { applyEvent } from "./transition.js";

export type DomainCommand = {
  type: "DispatchAction";
  action: Action;
};

export type ExecuteCommandResult = {
  state: GameState;
  events: DomainEvent[];
};

export const executeCommand = (state: GameState | undefined, command: DomainCommand): ExecuteCommandResult => {
  if (command.type !== "DispatchAction") {
    return { state: state as GameState, events: [] };
  }
  const event = eventFromAction(command.action);
  const nextState = applyEvent(state, event);
  return { state: nextState, events: [event] };
};
