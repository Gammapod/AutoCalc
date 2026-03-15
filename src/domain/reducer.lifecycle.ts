import { fromKeyLayoutArray } from "./keypadLayoutModel.js";
import { initialState } from "./state.js";
import type { Action, GameState } from "./types.js";
import { applyAllocatorRuntimeProjection } from "./allocatorProjection.js";
import { sanitizeLambdaControl } from "./lambdaControl.js";
import { applyUnlockAllPreset } from "./lifecyclePresets.js";
import { createInitialStepProgressState } from "./reducer.stateBuilders.js";

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
    const withStepProgress: GameState =
      withCells.calculator.stepProgress === undefined
        ? {
            ...withCells,
            calculator: {
              ...withCells.calculator,
              stepProgress: createInitialStepProgressState(),
            },
          }
        : withCells;
    return applyAllocatorRuntimeProjection(withStepProgress, sanitizeLambdaControl(withStepProgress.lambdaControl));
  }
  if (action.type === "UNLOCK_ALL") {
    return applyUnlockAllPreset(state);
  }
  return null;
};
