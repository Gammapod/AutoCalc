import { unlockCatalog } from "../content/unlocks.catalog.js";
import { fromKeyLayoutArray } from "./keypadLayoutModel.js";
import { initialState } from "./state.js";
import { applyEffect } from "./unlocks.js";
import type { Action, GameState } from "./types.js";

// Non-key lifecycle transitions: reset/hydrate/debug unlock-all.
const applyUnlockAll = (state: GameState): GameState => {
  const withCatalogEffects = unlockCatalog.reduce((next, unlock) => applyEffect(unlock.effect, next), state);
  const targetSlotAllocation = 4;
  const spentWithoutSlots =
    withCatalogEffects.allocator.allocations.width +
    withCatalogEffects.allocator.allocations.height +
    withCatalogEffects.allocator.allocations.range +
    withCatalogEffects.allocator.allocations.speed;
  const minMaxPoints = spentWithoutSlots + targetSlotAllocation;
  return {
    ...withCatalogEffects,
    calculator: {
      ...withCatalogEffects.calculator,
      singleDigitInitialTotalEntry: true,
    },
    allocator: {
      ...withCatalogEffects.allocator,
      maxPoints: Math.max(withCatalogEffects.allocator.maxPoints, minMaxPoints),
      allocations: {
        ...withCatalogEffects.allocator.allocations,
        slots: targetSlotAllocation,
      },
    },
    unlocks: {
      ...withCatalogEffects.unlocks,
      valueAtoms: Object.fromEntries(
        Object.keys(withCatalogEffects.unlocks.valueAtoms).map((key) => [key, true]),
      ) as GameState["unlocks"]["valueAtoms"],
      valueCompose: Object.fromEntries(
        Object.keys(withCatalogEffects.unlocks.valueCompose).map((key) => [key, true]),
      ) as GameState["unlocks"]["valueCompose"],
      valueExpression: Object.fromEntries(
        Object.keys(withCatalogEffects.unlocks.valueExpression).map((key) => [key, true]),
      ) as GameState["unlocks"]["valueExpression"],
      slotOperators: Object.fromEntries(
        Object.keys(withCatalogEffects.unlocks.slotOperators).map((operator) => [operator, true]),
      ) as GameState["unlocks"]["slotOperators"],
      utilities: Object.fromEntries(
        Object.keys(withCatalogEffects.unlocks.utilities).map((utility) => [utility, true]),
      ) as GameState["unlocks"]["utilities"],
      steps: Object.fromEntries(
        Object.keys(withCatalogEffects.unlocks.steps).map((stepKey) => [stepKey, true]),
      ) as GameState["unlocks"]["steps"],
      visualizers: Object.fromEntries(
        Object.keys(withCatalogEffects.unlocks.visualizers).map((visualizer) => [visualizer, true]),
      ) as GameState["unlocks"]["visualizers"],
      execution: Object.fromEntries(
        Object.keys(withCatalogEffects.unlocks.execution).map((executionKey) => [executionKey, true]),
      ) as GameState["unlocks"]["execution"],
      uiUnlocks: {
        ...withCatalogEffects.unlocks.uiUnlocks,
        storageVisible: true,
      },
      maxSlots: 4,
    },
    completedUnlockIds: [
      ...new Set([...withCatalogEffects.completedUnlockIds, ...unlockCatalog.map((unlock) => unlock.id)]),
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
