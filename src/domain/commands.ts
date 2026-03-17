import type { Action, GameState } from "./types.js";
import { eventFromAction, type DomainEvent } from "./events.js";
import { applyEvent } from "./transition.js";
import type { AppServices } from "../contracts/appServices.js";

export type DomainCommand = {
  type: "DispatchAction";
  action: Action;
};

export type ExecuteCommandResult = {
  state: GameState;
  events: DomainEvent[];
};

type ExecuteCommandOptions = {
  services?: AppServices;
};

export const executeCommand = (
  state: GameState | undefined,
  command: DomainCommand,
  options: ExecuteCommandOptions = {},
): ExecuteCommandResult => {
  const event = eventFromAction(command.action);
  const nextState = applyEvent(state, event, { services: options.services });
  return { state: nextState, events: [event] };
};
