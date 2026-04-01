import type { Action, GameState } from "./types.js";
import { eventFromAction, type DomainEvent } from "./events.js";
import { applyEvent } from "./transition.js";
import type { AppServices } from "../contracts/appServices.js";
import { resolveExecutionPolicyForAction } from "./reducer.js";
import type { UiEffect } from "./types.js";
import { resolveSystemKeyIntent, mapSystemKeyIntentToUiEffect } from "./systemKeyIntentRegistry.js";
import { isKeyUsableForInput } from "./keyUnlocks.js";
import { resolveDomainDispatchInputFeedback } from "./inputFeedback.js";

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
    if (command.action.type === "PRESS_KEY" && isKeyUsableForInput(currentState, command.action.key)) {
      const intent = resolveSystemKeyIntent(command.action.key);
      if (intent) {
        uiEffects.push(mapSystemKeyIntentToUiEffect(intent));
      }
    }
  }
  const event = eventFromAction(command.action);
  const nextState = applyEvent(state, event, { services: options.services });
  if (currentState && command.type === "DispatchAction" && command.action.type !== "AUTO_STEP_TICK") {
    uiEffects.push(resolveDomainDispatchInputFeedback(currentState, nextState, command.action, uiEffects));
  }
  return { state: nextState, events: [event], uiEffects };
};
