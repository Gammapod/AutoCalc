import { unlockCatalog } from "../content/unlocks.catalog.js";
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
      digits: Object.fromEntries(
        Object.keys(withSecondSlotUnlocked.unlocks.digits).map((digit) => [digit, true]),
      ) as GameState["unlocks"]["digits"],
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
    return action.state;
  }
  if (action.type === "UNLOCK_ALL") {
    return applyUnlockAll(state);
  }
  return null;
};
