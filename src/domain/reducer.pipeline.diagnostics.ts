import type { Action, CalculatorId, GameState, Key, VisualizerId } from "./types.js";
import {
  resolveActionKind,
  resolveExecutionPolicyForAction,
  resolveKeyFromAction,
  resolveOperatorFromAction,
} from "./reducer.pipeline.action.js";

const stableSignature = (value: unknown): string => {
  const seen = new WeakSet<object>();
  const walk = (input: unknown): unknown => {
    if (typeof input === "bigint") {
      return { __bigint: input.toString() };
    }
    if (Array.isArray(input)) {
      return input.map((entry) => walk(entry));
    }
    if (input && typeof input === "object") {
      if (seen.has(input as object)) {
        return "[Circular]";
      }
      seen.add(input as object);
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(input as Record<string, unknown>).sort()) {
        out[key] = walk((input as Record<string, unknown>)[key]);
      }
      return out;
    }
    return input;
  };
  return JSON.stringify(walk(value));
};

const toDiagnosticsComparableState = (state: GameState): unknown => ({
  ...state,
  ui: {
    ...state.ui,
    diagnostics: undefined,
  },
  calculators: state.calculators
    ? Object.fromEntries(
      Object.entries(state.calculators).map(([id, calculator]) => [
        id,
        calculator
          ? {
              ...calculator,
              ui: {
                ...calculator.ui,
                diagnostics: undefined,
              },
            }
          : calculator,
      ]),
    )
    : state.calculators,
});

export const withRecordedDiagnosticsAction = (
  previous: GameState,
  next: GameState,
  action: Action,
  visualizerKeyById: ReadonlyMap<VisualizerId, Key>,
): GameState => {
  if (action.type === "HYDRATE_SAVE") {
    return next;
  }
  const policy = resolveExecutionPolicyForAction(previous, action);
  if (policy.decision.decision === "reject") {
    return next;
  }
  const previousLastAction = previous.ui.diagnostics.lastAction;
  const actionKind = resolveActionKind(action);
  const keyId = resolveKeyFromAction(action, visualizerKeyById);
  const operatorId = resolveOperatorFromAction(action);
  const noEffect = stableSignature(toDiagnosticsComparableState(previous)) === stableSignature(toDiagnosticsComparableState(next));
  if (noEffect) {
    return next;
  }
  const visualizerToggled = action.type === "TOGGLE_VISUALIZER" && previous.settings.visualizer !== next.settings.visualizer;

  const lastActionTrace: GameState["ui"]["diagnostics"]["lastAction"] = {
    sequence: previousLastAction.sequence + 1,
    actionKind,
    ...(keyId ? { keyId } : {}),
    ...(operatorId ? { operatorId } : {}),
    ...(visualizerToggled ? { visualizerToggled: true } : {}),
  };

  const uiWithDiagnostics: GameState["ui"] = {
    ...next.ui,
    diagnostics: {
      lastAction: lastActionTrace,
    },
  };

  let calculators = next.calculators;
  const patchCalculatorUi = (calculatorId: CalculatorId | undefined): void => {
    if (!calculatorId || !calculators?.[calculatorId]) {
      return;
    }
    const instance = calculators[calculatorId];
    if (!instance) {
      return;
    }
    if (instance.ui.diagnostics.lastAction.sequence === lastActionTrace.sequence && instance.ui === uiWithDiagnostics) {
      return;
    }
    calculators = {
      ...calculators,
      [calculatorId]: {
        ...instance,
        ui: {
          ...instance.ui,
          diagnostics: {
            lastAction: lastActionTrace,
          },
        },
      },
    };
  };

  patchCalculatorUi(next.activeCalculatorId);
  if ("calculatorId" in action && action.calculatorId) {
    patchCalculatorUi(action.calculatorId);
  }

  return {
    ...next,
    ui: uiWithDiagnostics,
    ...(calculators ? { calculators } : {}),
  };
};
