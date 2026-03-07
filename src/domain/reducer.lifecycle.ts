import { unlockCatalog } from "../content/unlocks.catalog.js";
import { fromKeyLayoutArray } from "./keypadLayoutModel.js";
import { initialState } from "./state.js";
import { applyEffect } from "./unlocks.js";
import type { Action, GameState } from "./types.js";
import { applyAllocatorRuntimeProjection } from "./allocatorProjection.js";
import { sanitizeLambdaControl } from "./lambdaControl.js";

// Non-key lifecycle transitions: reset/hydrate/debug unlock-all.
const applyUnlockAll = (state: GameState): GameState => {
  const withCatalogEffects = unlockCatalog.reduce((next, unlock) => applyEffect(unlock.effect, next), state);
  const withProjectedControl = applyAllocatorRuntimeProjection(withCatalogEffects, {
    ...withCatalogEffects.lambdaControl,
    alpha: 7,
    beta: 7,
    gamma: 4,
    maxPoints: Math.max(withCatalogEffects.lambdaControl.maxPoints, 18),
  });
  return {
    ...withProjectedControl,
    calculator: {
      ...withProjectedControl.calculator,
      singleDigitInitialTotalEntry: true,
    },
    unlocks: {
      ...withProjectedControl.unlocks,
      valueAtoms: Object.fromEntries(
        Object.keys(withProjectedControl.unlocks.valueAtoms).map((key) => [key, true]),
      ) as GameState["unlocks"]["valueAtoms"],
      valueCompose: Object.fromEntries(
        Object.keys(withProjectedControl.unlocks.valueCompose).map((key) => [key, true]),
      ) as GameState["unlocks"]["valueCompose"],
      valueExpression: Object.fromEntries(
        Object.keys(withProjectedControl.unlocks.valueExpression).map((key) => [key, true]),
      ) as GameState["unlocks"]["valueExpression"],
      slotOperators: Object.fromEntries(
        Object.keys(withProjectedControl.unlocks.slotOperators).map((operator) => [operator, true]),
      ) as GameState["unlocks"]["slotOperators"],
      utilities: Object.fromEntries(
        Object.keys(withProjectedControl.unlocks.utilities).map((utility) => [utility, true]),
      ) as GameState["unlocks"]["utilities"],
      memory: Object.fromEntries(
        Object.keys(withProjectedControl.unlocks.memory).map((memoryKey) => [memoryKey, true]),
      ) as GameState["unlocks"]["memory"],
      steps: Object.fromEntries(
        Object.keys(withProjectedControl.unlocks.steps).map((stepKey) => [stepKey, true]),
      ) as GameState["unlocks"]["steps"],
      visualizers: Object.fromEntries(
        Object.keys(withProjectedControl.unlocks.visualizers).map((visualizer) => [visualizer, true]),
      ) as GameState["unlocks"]["visualizers"],
      execution: Object.fromEntries(
        Object.keys(withProjectedControl.unlocks.execution).map((executionKey) => [executionKey, true]),
      ) as GameState["unlocks"]["execution"],
      uiUnlocks: {
        ...withProjectedControl.unlocks.uiUnlocks,
        storageVisible: true,
      },
      maxSlots: 4,
    },
    completedUnlockIds: [
      ...new Set([...withProjectedControl.completedUnlockIds, ...unlockCatalog.map((unlock) => unlock.id)]),
    ],
  };
};

export const applyLifecycleAction = (state: GameState, action: Action): GameState | null => {
  if (action.type === "RESET_RUN") {
    return initialState();
  }
  if (action.type === "HYDRATE_SAVE") {
    const expectedLength = Math.max(1, action.state.ui.keypadColumns * action.state.ui.keypadRows);
    const withCells = action.state.ui.keypadCells.length === expectedLength ? action.state : {
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
    return applyAllocatorRuntimeProjection(withCells, sanitizeLambdaControl(withCells.lambdaControl));
  }
  if (action.type === "UNLOCK_ALL") {
    return applyUnlockAll(state);
  }
  return null;
};
