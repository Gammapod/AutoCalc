import { unlockCatalog } from "../content/unlocks.catalog.js";
import { fromKeyLayoutArray } from "./keypadLayoutModel.js";
import { initialState } from "./state.js";
import { applyEffect } from "./unlocks.js";
import type { Action, GameState } from "./types.js";

// Non-key lifecycle transitions: reset/hydrate/debug unlock-all.
const applyUnlockAll = (state: GameState): GameState => {
  const withCatalogEffects = unlockCatalog.reduce((next, unlock) => applyEffect(unlock.effect, next), state);
  const withSecondSlotUnlocked = applyEffect({ type: "unlock_second_slot" }, withCatalogEffects);
  return {
    ...withSecondSlotUnlocked,
    unlocks: {
      ...withSecondSlotUnlocked.unlocks,
      valueExpression: Object.fromEntries(
        Object.keys(withSecondSlotUnlocked.unlocks.valueExpression).map((key) => [key, true]),
      ) as GameState["unlocks"]["valueExpression"],
      slotOperators: Object.fromEntries(
        Object.keys(withSecondSlotUnlocked.unlocks.slotOperators).map((operator) => [operator, true]),
      ) as GameState["unlocks"]["slotOperators"],
      utilities: Object.fromEntries(
        Object.keys(withSecondSlotUnlocked.unlocks.utilities).map((utility) => [utility, true]),
      ) as GameState["unlocks"]["utilities"],
      execution: Object.fromEntries(
        Object.keys(withSecondSlotUnlocked.unlocks.execution).map((executionKey) => [executionKey, true]),
      ) as GameState["unlocks"]["execution"],
    },
    completedUnlockIds: [
      ...new Set([...withSecondSlotUnlocked.completedUnlockIds, ...unlockCatalog.map((unlock) => unlock.id)]),
    ],
  };
};

export const applyLifecycleAction = (state: GameState, action: Action): GameState | null => {
  if (action.type === "RESET_RUN") {
    return initialState();
  }
  if (action.type === "HYDRATE_SAVE") {
    const expectedLength = Math.max(1, action.state.ui.keypadColumns * action.state.ui.keypadRows);
    if (action.state.ui.keypadCells.length === expectedLength) {
      return action.state;
    }
    return {
      ...action.state,
      ui: {
        ...action.state.ui,
        keypadCells: fromKeyLayoutArray(
          action.state.ui.keyLayout,
          action.state.ui.keypadColumns,
          action.state.ui.keypadRows,
        ),
      },
    };
  }
  if (action.type === "UNLOCK_ALL") {
    return applyUnlockAll(state);
  }
  return null;
};
