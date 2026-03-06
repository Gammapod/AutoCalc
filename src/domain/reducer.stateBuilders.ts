import { fromBigInt } from "../infra/math/rationalEngine.js";
import type { GameState } from "./types.js";

// Shared calculator state builders used across reducer modules.
export const createClearedOperationCalculatorState = (
  calculator: GameState["calculator"],
): GameState["calculator"] => ({
  ...calculator,
  rollEntries: [],
  operationSlots: [],
  draftingSlot: null,
});

export const createResetCalculatorState = (): GameState["calculator"] => ({
  total: { kind: "rational", value: fromBigInt(0n) },
  pendingNegativeTotal: false,
  singleDigitInitialTotalEntry: true,
  rollEntries: [],
  operationSlots: [],
  draftingSlot: null,
});

export const clearOperationEntry = (state: GameState): GameState => ({
  ...state,
  calculator: createClearedOperationCalculatorState(state.calculator),
});

export const resetRunState = (state: GameState): GameState => ({
  ...state,
  calculator: createResetCalculatorState(),
});
