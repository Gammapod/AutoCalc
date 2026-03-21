import type { Digit, GameState, Key, MemoryVariable } from "./types.js";
import { adjustAxis } from "./lambdaControl.js";
import { applyAllocatorRuntimeProjection } from "./allocatorProjection.js";
import { isMemoryKeyId, KEY_ID, resolveKeyId } from "./keyPresentation.js";
import { projectControlFromState } from "./controlProjection.js";

const MEMORY_VARIABLE_CYCLE: readonly MemoryVariable[] = ["\u03B1", "\u03B2", "\u03B3"];

const memoryVariableToAxis = (memoryVariable: MemoryVariable): "alpha" | "beta" | "gamma" => {
  if (memoryVariable === "\u03B1") {
    return "alpha";
  }
  if (memoryVariable === "\u03B2") {
    return "beta";
  }
  return "gamma";
};

const readSelectedMemoryValue = (state: GameState): number => {
  const axis = memoryVariableToAxis(state.ui.memoryVariable);
  return projectControlFromState(state).fields[axis];
};

export const isMemoryKey = (key: Key): boolean => isMemoryKeyId(key);

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
  const projection = projectControlFromState(state);
  const axis = memoryVariableToAxis(state.ui.memoryVariable);
  const nextControl = adjustAxis(projection.control, projection.profile, axis, delta);
  if (nextControl === projection.control) {
    return state;
  }
  return applyAllocatorRuntimeProjection(state, nextControl);
};

export const isMemoryCycleKey = (key: Key): boolean => resolveKeyId(key) === KEY_ID.memory_cycle_variable;
export const isMemoryRecallKey = (key: Key): boolean => resolveKeyId(key) === KEY_ID.memory_recall;
export const isMemoryPlusKey = (key: Key): boolean => resolveKeyId(key) === KEY_ID.memory_adjust_plus;
export const isMemoryMinusKey = (key: Key): boolean => resolveKeyId(key) === KEY_ID.memory_adjust_minus;
