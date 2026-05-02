import type { GameState } from "../../domain/types.js";
import { cloneWithBigIntReviver } from "./saveEnvelope.js";
import { createInitialUiDiagnosticsLastAction } from "../../domain/state.js";

const LEGACY_DIGIT_1_PORTABLE_UNLOCK_ID = "unlock_digit_1_portable_on_total_equals_2";
const DIGIT_1_PORTABLE_UNLOCK_ID = "unlock_digit_1_portable_on_total_equals_9";

const normalizeCompletedUnlockIds = (ids: string[]): string[] => {
  let changed = false;
  const next = ids.map((id) => {
    if (id === LEGACY_DIGIT_1_PORTABLE_UNLOCK_ID) {
      changed = true;
      return DIGIT_1_PORTABLE_UNLOCK_ID;
    }
    return id;
  });
  return changed ? [...new Set(next)] : ids;
};

const withCompletedUnlockIdAliases = (state: GameState): GameState => {
  const completedUnlockIds = normalizeCompletedUnlockIds(state.completedUnlockIds);
  const perCalculatorCompletedUnlockIds = state.perCalculatorCompletedUnlockIds
    ? Object.fromEntries(
      Object.entries(state.perCalculatorCompletedUnlockIds).map(([calculatorId, ids]) => [
        calculatorId,
        ids ? normalizeCompletedUnlockIds(ids) : ids,
      ]),
    ) as GameState["perCalculatorCompletedUnlockIds"]
    : state.perCalculatorCompletedUnlockIds;

  if (
    completedUnlockIds === state.completedUnlockIds
    && perCalculatorCompletedUnlockIds === state.perCalculatorCompletedUnlockIds
  ) {
    return state;
  }
  return {
    ...state,
    completedUnlockIds,
    ...(perCalculatorCompletedUnlockIds ? { perCalculatorCompletedUnlockIds } : {}),
  };
};

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

export const serializeV20 = (state: GameState): unknown => ({ ...state });

export const deserializeV20 = (payloadState: unknown): GameState => {
  try {
    return withCompletedUnlockIdAliases(withDiagnosticsDefaults(cloneWithBigIntReviver(payloadState) as GameState));
  } catch {
    throw new Error("Failed to deserialize persisted state.");
  }
};
