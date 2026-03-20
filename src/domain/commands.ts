import type { Action, GameState } from "./types.js";
import { eventFromAction, type DomainEvent } from "./events.js";
import { applyEvent } from "./transition.js";
import type { AppServices } from "../contracts/appServices.js";
import { resolveExecutionPolicyForAction } from "./reducer.js";
import type { UiEffect } from "./types.js";

export type DomainCommand = {
  type: "DispatchAction";
  action: Action;
};

export type ExecuteCommandResult = {
  state: GameState;
  events: DomainEvent[];
  uiEffects: UiEffect[];
};

type ExecuteCommandOptions = {
  services?: AppServices;
};

export const executeCommand = (
  state: GameState | undefined,
  command: DomainCommand,
  options: ExecuteCommandOptions = {},
): ExecuteCommandResult => {
  const currentState = state;
  const uiEffects: UiEffect[] = [];
  if (currentState && command.type === "DispatchAction") {
    const policy = resolveExecutionPolicyForAction(currentState, command.action);
    if (policy.decision.decision === "reject") {
      uiEffects.push({ type: "execution_gate_rejected", calculatorId: policy.calculatorId });
    }
  }
  const event = eventFromAction(command.action);
  const nextState = applyEvent(state, event, { services: options.services });
  return { state: nextState, events: [event], uiEffects };
};
