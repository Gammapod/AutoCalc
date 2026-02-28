import { initialState } from "./state.js";
import { applyKeyAction } from "./reducer.input.js";
import { applyMoveKeySlot, applyMoveLayoutCell, applySwapKeySlots, applySwapLayoutCells } from "./reducer.layout.js";
import { applyLifecycleAction } from "./reducer.lifecycle.js";
import type { Action, GameState } from "./types.js";
import { reduceActionWithV2 } from "../../src_v2/compat/legacyReducerAdapter.js";
import { compareParity } from "../../src_v2/compat/parityHarness.js";

// Root reducer orchestrator: route actions to focused domain reducers.
const readFlag = (name: "USE_V2_ENGINE" | "V2_PARITY_ASSERT"): boolean => {
  const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return processEnv?.[name] === "true";
};

const reduceLegacy = (state: GameState, action: Action): GameState => {
  if (action.type === "PRESS_KEY") {
    return applyKeyAction(state, action.key);
  }

  const lifecycleHandled = applyLifecycleAction(state, action);
  if (lifecycleHandled) {
    return lifecycleHandled;
  }

  if (action.type === "MOVE_KEY_SLOT") {
    return applyMoveKeySlot(state, action.fromIndex, action.toIndex);
  }
  if (action.type === "SWAP_KEY_SLOTS") {
    return applySwapKeySlots(state, action.firstIndex, action.secondIndex);
  }
  if (action.type === "MOVE_LAYOUT_CELL") {
    return applyMoveLayoutCell(state, action.fromSurface, action.fromIndex, action.toSurface, action.toIndex);
  }
  if (action.type === "SWAP_LAYOUT_CELLS") {
    return applySwapLayoutCells(state, action.fromSurface, action.fromIndex, action.toSurface, action.toIndex);
  }
  return state;
};

export const reducer = (state: GameState = initialState(), action: Action): GameState => {
  const useV2Engine = readFlag("USE_V2_ENGINE");
  const parityAssert = readFlag("V2_PARITY_ASSERT");

  if (useV2Engine) {
    return reduceActionWithV2(state, action);
  }

  const legacyNext = reduceLegacy(state, action);
  if (parityAssert) {
    const v2Next = reduceActionWithV2(state, action);
    const parity = compareParity(legacyNext, v2Next);
    if (!parity.ok) {
      console.warn("V2 parity mismatch detected", parity.mismatches);
    }
  }
  return legacyNext;
};
