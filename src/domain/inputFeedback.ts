import { resolveActiveCalculatorId } from "./multiCalculator.js";
import type { Action, CalculatorId, GameState, LayoutSurface, UiEffect } from "./types.js";
import { resolveSurfaceCalculatorId } from "./calculatorSurface.js";

type InputFeedbackReasonCode = Extract<Extract<UiEffect, { type: "input_feedback" }>["reasonCode"], string>;
type InputFeedbackTrigger = Extract<Extract<UiEffect, { type: "input_feedback" }>["trigger"], string>;

const surfaceToCalculatorId = (state: GameState, surface: LayoutSurface): CalculatorId | null =>
  resolveSurfaceCalculatorId(state, surface);

export const resolveFeedbackTargetCalculatorId = (state: GameState, action: Action): CalculatorId => {
  if ("calculatorId" in action && action.calculatorId) {
    return action.calculatorId;
  }
  if (action.type === "INSTALL_KEY_FROM_STORAGE") {
    return surfaceToCalculatorId(state, action.toSurface) ?? resolveActiveCalculatorId(state);
  }
  if (action.type === "UNINSTALL_LAYOUT_KEY") {
    return surfaceToCalculatorId(state, action.fromSurface) ?? resolveActiveCalculatorId(state);
  }
  if (action.type === "MOVE_LAYOUT_CELL" || action.type === "SWAP_LAYOUT_CELLS") {
    return surfaceToCalculatorId(state, action.toSurface)
      ?? surfaceToCalculatorId(state, action.fromSurface)
      ?? resolveActiveCalculatorId(state);
  }
  return resolveActiveCalculatorId(state);
};

export const isUserInputFeedbackAction = (action: Action): boolean =>
  action.type === "PRESS_KEY"
  || action.type === "MOVE_LAYOUT_CELL"
  || action.type === "SWAP_LAYOUT_CELLS"
  || action.type === "INSTALL_KEY_FROM_STORAGE"
  || action.type === "UNINSTALL_LAYOUT_KEY";

const toFeedbackComparableCalculator = (
  calculator: NonNullable<GameState["calculators"]>[CalculatorId] | undefined,
) => {
  if (!calculator) {
    return calculator;
  }
  return {
    ...calculator,
    ui: {
      ...calculator.ui,
      diagnostics: undefined,
    },
  };
};

const toFeedbackComparableState = (state: GameState): unknown => {
  const comparableCalculators = state.calculators
    ? {
      f: toFeedbackComparableCalculator(state.calculators.f),
      g: toFeedbackComparableCalculator(state.calculators.g),
      menu: toFeedbackComparableCalculator(state.calculators.menu),
      f_prime: toFeedbackComparableCalculator(state.calculators.f_prime),
      g_prime: toFeedbackComparableCalculator(state.calculators.g_prime),
      h_prime: toFeedbackComparableCalculator(state.calculators.h_prime),
      i_prime: toFeedbackComparableCalculator(state.calculators.i_prime),
    }
    : state.calculators;
  if (state.calculators) {
    // In multi-calculator sessions, top-level calculator fields are a legacy mirror of the active calculator.
    // Comparing the mirror creates false accepts during projection sync even when the targeted action no-ops.
    return {
      activeCalculatorId: state.activeCalculatorId,
      calculators: comparableCalculators,
    };
  }
  return {
    ...state,
    ui: {
      ...state.ui,
      diagnostics: undefined,
    },
    keyPressCounts: undefined,
    calculators: comparableCalculators,
  };
};

const toFeedbackComparableSignature = (value: unknown): string => {
  const activePath = new WeakSet<object>();

  const walk = (input: unknown): unknown => {
    if (typeof input === "bigint") {
      return { __bigint: input.toString() };
    }
    if (Array.isArray(input)) {
      return input.map((entry) => walk(entry));
    }
    if (input && typeof input === "object") {
      const objectInput = input as Record<string, unknown>;
      if (activePath.has(objectInput)) {
        return "[Circular]";
      }
      activePath.add(objectInput);
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(objectInput).sort()) {
        out[key] = walk(objectInput[key]);
      }
      activePath.delete(objectInput);
      return out;
    }
    return input;
  };

  return JSON.stringify(walk(value));
};

const hasTransitionIntent = (uiEffects: readonly UiEffect[]): boolean =>
  uiEffects.some((effect) => effect.type === "request_mode_transition" || effect.type === "quit_application");

const hasExecutionGateReject = (uiEffects: readonly UiEffect[]): boolean =>
  uiEffects.some((effect) => effect.type === "execution_gate_rejected");

export const hasFeedbackEffectiveGameplayChange = (previous: GameState, next: GameState): boolean =>
  toFeedbackComparableSignature(toFeedbackComparableState(previous))
    !== toFeedbackComparableSignature(toFeedbackComparableState(next));

export const resolveDomainDispatchInputFeedback = (
  previous: GameState,
  next: GameState,
  action: Action,
  uiEffects: readonly UiEffect[],
): Extract<UiEffect, { type: "input_feedback" }> => {
  const targetCalculatorId = resolveFeedbackTargetCalculatorId(previous, action);
  const trigger: InputFeedbackTrigger = isUserInputFeedbackAction(action) ? "user_action" : "system_action";
  if (hasTransitionIntent(uiEffects)) {
    return {
      type: "input_feedback",
      calculatorId: targetCalculatorId,
      outcome: "accepted",
      source: "domain_dispatch",
      trigger,
      reasonCode: "transition_intent_accept",
    };
  }
  const changed = hasFeedbackEffectiveGameplayChange(previous, next);
  if (changed) {
    return {
      type: "input_feedback",
      calculatorId: targetCalculatorId,
      outcome: "accepted",
      source: "domain_dispatch",
      trigger,
    };
  }
  let reasonCode: InputFeedbackReasonCode = "no_effect";
  if (hasExecutionGateReject(uiEffects)) {
    reasonCode = "execution_gate_reject";
  } else if (
    action.type === "MOVE_LAYOUT_CELL"
    || action.type === "SWAP_LAYOUT_CELLS"
    || action.type === "INSTALL_KEY_FROM_STORAGE"
    || action.type === "UNINSTALL_LAYOUT_KEY"
  ) {
    reasonCode = "layout_invalid_or_noop";
  }
  return {
    type: "input_feedback",
    calculatorId: targetCalculatorId,
    outcome: "rejected",
    source: "domain_dispatch",
    trigger,
    reasonCode,
  };
};

export const buildPreDispatchBlockedInputFeedback = (
  state: GameState,
  action: Action,
): Extract<UiEffect, { type: "input_feedback" }> => ({
  type: "input_feedback",
  calculatorId: resolveFeedbackTargetCalculatorId(state, action),
  outcome: "rejected",
  source: "pre_dispatch_block",
  trigger: isUserInputFeedbackAction(action) ? "user_action" : "system_action",
  reasonCode: "pre_dispatch_block",
});
