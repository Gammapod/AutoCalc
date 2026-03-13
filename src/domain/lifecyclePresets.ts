import { unlockCatalog } from "../content/unlocks.catalog.js";
import { applyAllocatorRuntimeProjection } from "./allocatorProjection.js";
import { applyEffect } from "./unlocks.js";
import type { GameState } from "./types.js";

export const applyUnlockAllPreset = (state: GameState): GameState => {
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
      unaryOperators: Object.fromEntries(
        Object.keys(withProjectedControl.unlocks.unaryOperators).map((operator) => [operator, true]),
      ) as GameState["unlocks"]["unaryOperators"],
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
