import { fromBigInt } from "../infra/math/rationalEngine.js";
import type { GameState } from "./types.js";

// Shared calculator state builders used across reducer modules.
export const createInitialStepProgressState = (): GameState["calculator"]["stepProgress"] => ({
  active: false,
  seedTotal: null,
  currentTotal: null,
  nextSlotIndex: 0,
  executedSlotResults: [],
});

export const createClearedOperationCalculatorState = (
  calculator: GameState["calculator"],
): GameState["calculator"] => ({
  ...calculator,
  rollEntries: [],
  rollAnalysis: {
    stopReason: "none",
    cycle: null,
  },
  operationSlots: [],
  draftingSlot: null,
  stepProgress: createInitialStepProgressState(),
});

export const createResetCalculatorState = (): GameState["calculator"] => ({
  total: { kind: "rational", value: fromBigInt(0n) },
  pendingNegativeTotal: false,
  singleDigitInitialTotalEntry: true,
  rollEntries: [],
  rollAnalysis: {
    stopReason: "none",
    cycle: null,
  },
  operationSlots: [],
  draftingSlot: null,
  stepProgress: createInitialStepProgressState(),
});

const isStepProgressAlreadyCleared = (state: GameState): boolean => (
  state.calculator.stepProgress.active === false
  && (state.calculator.stepProgress.mode === undefined || state.calculator.stepProgress.mode === "forward")
  && state.calculator.stepProgress.seedTotal === null
  && state.calculator.stepProgress.currentTotal === null
  && state.calculator.stepProgress.nextSlotIndex === 0
  && state.calculator.stepProgress.executedSlotResults.length === 0
);

export const withStepProgressCleared = (state: GameState): GameState => {
  if (isStepProgressAlreadyCleared(state)) {
    return state;
  }
  return {
    ...state,
    calculator: {
      ...state.calculator,
      stepProgress: createInitialStepProgressState(),
    },
  };
};

export const clearOperationEntry = (state: GameState): GameState => ({
  ...state,
  calculator: createClearedOperationCalculatorState(state.calculator),
});

export const resetRunState = (state: GameState): GameState => ({
  ...state,
  calculator: createResetCalculatorState(),
});
