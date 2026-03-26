import type { GameState } from "../../domain/types.js";
import { cloneWithBigIntReviver } from "./saveEnvelope.js";
import { createInitialUiDiagnosticsLastAction } from "../../domain/state.js";

const withDiagnosticsDefaults = (state: GameState): GameState => {
  const ensureUi = (ui: GameState["ui"]): GameState["ui"] => {
    const lastAction = ui.diagnostics?.lastAction;
    if (
      lastAction
      && typeof lastAction.sequence === "number"
      && Number.isInteger(lastAction.sequence)
      && typeof lastAction.actionKind === "string"
    ) {
      return ui;
    }
    return {
      ...ui,
      diagnostics: {
        lastAction: createInitialUiDiagnosticsLastAction(),
      },
    };
  };

  const nextUi = ensureUi(state.ui);
  const nextCalculators = state.calculators
    ? Object.fromEntries(
      Object.entries(state.calculators).map(([id, calculator]) => {
        if (!calculator) {
          return [id, calculator];
        }
        return [id, { ...calculator, ui: ensureUi(calculator.ui) }];
      }),
    ) as GameState["calculators"]
    : state.calculators;

  if (nextUi === state.ui && nextCalculators === state.calculators) {
    return state;
  }
  return {
    ...state,
    ui: nextUi,
    ...(nextCalculators ? { calculators: nextCalculators } : {}),
  };
};

export const serializeV20 = (state: GameState): unknown => ({
  ...state,
  // Debug edits are explicitly session-only.
  sessionControlProfiles: {},
});

export const deserializeV20 = (payloadState: unknown): GameState => {
  try {
    return withDiagnosticsDefaults(cloneWithBigIntReviver(payloadState) as GameState);
  } catch {
    throw new Error("Failed to deserialize persisted state.");
  }
};
