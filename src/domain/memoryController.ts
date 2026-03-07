import type { Digit, GameState, Key, MemoryVariable } from "./types.js";
import { adjustAxis, withLegacyAllocatorFallback } from "./lambdaControl.js";
import { applyAllocatorRuntimeProjection } from "./allocatorProjection.js";

const MEMORY_VARIABLE_CYCLE: readonly MemoryVariable[] = ["α", "β", "γ"];

const memoryVariableToAxis = (memoryVariable: MemoryVariable): "alpha" | "beta" | "gamma" => {
  if (memoryVariable === "α") {
    return "alpha";
  }
  if (memoryVariable === "β") {
    return "beta";
  }
  return "gamma";
};

const readSelectedMemoryValue = (state: GameState): number => {
  const axis = memoryVariableToAxis(state.ui.memoryVariable);
  return state.lambdaControl[axis];
};

export const isMemoryKey = (key: Key): boolean =>
  key === "α,β,γ" || key === "M+" || key === "M–" || key === "M→";

export const cycleMemoryVariable = (state: GameState): GameState => {
  const currentIndex = MEMORY_VARIABLE_CYCLE.indexOf(state.ui.memoryVariable);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % MEMORY_VARIABLE_CYCLE.length : 0;
  const nextVariable = MEMORY_VARIABLE_CYCLE[nextIndex];
  if (nextVariable === state.ui.memoryVariable) {
    return state;
  }
  return {
    ...state,
    ui: {
      ...state.ui,
      memoryVariable: nextVariable,
    },
  };
};

export const resolveMemoryRecallDigit = (state: GameState): Digit => {
  const memoryValue = readSelectedMemoryValue(state);
  const digitValue = Math.max(0, Math.min(9, Math.trunc(memoryValue)));
  return digitValue.toString() as Digit;
};

export const applyMemoryAdjust = (state: GameState, delta: 1 | -1): GameState => {
  const effectiveControl = withLegacyAllocatorFallback(state.lambdaControl, state.allocator);
  const axis = memoryVariableToAxis(state.ui.memoryVariable);
  const nextControl = adjustAxis(effectiveControl, axis, delta);
  if (nextControl === effectiveControl) {
    return state;
  }
  return applyAllocatorRuntimeProjection(state, nextControl);
};
