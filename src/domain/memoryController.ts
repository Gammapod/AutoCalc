import { KEYPAD_DIM_MAX, KEYPAD_DIM_MIN, OPERATION_SLOTS_MAX, OPERATION_SLOTS_MIN } from "./state.js";
import type { Digit, GameState, Key, MemoryVariable } from "./types.js";

type MemorySelectionBinding = {
  allocatorField: "width" | "height" | "slots";
  readValue: (state: GameState) => number;
  allocationMin: number;
  allocationMax: number;
};

const MEMORY_VARIABLE_CYCLE: readonly MemoryVariable[] = ["α", "β", "γ"];

const MEMORY_SELECTION_BINDINGS: Record<MemoryVariable, MemorySelectionBinding> = {
  α: {
    allocatorField: "width",
    readValue: (state) => state.ui.keypadColumns,
    allocationMin: KEYPAD_DIM_MIN - 1,
    allocationMax: KEYPAD_DIM_MAX - 1,
  },
  β: {
    allocatorField: "height",
    readValue: (state) => state.ui.keypadRows,
    allocationMin: KEYPAD_DIM_MIN - 1,
    allocationMax: KEYPAD_DIM_MAX - 1,
  },
  γ: {
    allocatorField: "slots",
    readValue: (state) => state.unlocks.maxSlots,
    allocationMin: OPERATION_SLOTS_MIN,
    allocationMax: OPERATION_SLOTS_MAX,
  },
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

const getSelectedMemoryBinding = (state: GameState): MemorySelectionBinding =>
  MEMORY_SELECTION_BINDINGS[state.ui.memoryVariable];

export const resolveMemoryRecallDigit = (state: GameState): Digit => {
  const memoryValue = getSelectedMemoryBinding(state).readValue(state);
  const digitValue = Math.max(0, Math.min(9, Math.trunc(memoryValue)));
  return digitValue.toString() as Digit;
};

const getUnusedAllocatorPoints = (state: GameState): number =>
  state.allocator.maxPoints - (
    state.allocator.allocations.width +
    state.allocator.allocations.height +
    state.allocator.allocations.range +
    state.allocator.allocations.speed +
    state.allocator.allocations.slots
  );

export const applyMemoryAdjust = (
  state: GameState,
  delta: 1 | -1,
  projectAllocator: (state: GameState, allocator: GameState["allocator"]) => GameState,
): GameState => {
  const selected = getSelectedMemoryBinding(state);
  const current = state.allocator.allocations[selected.allocatorField];
  const nextValue = current + delta;
  if (delta === 1 && getUnusedAllocatorPoints(state) <= 0) {
    return state;
  }
  if (delta === -1 && current <= selected.allocationMin) {
    return state;
  }
  if (nextValue < selected.allocationMin || nextValue > selected.allocationMax) {
    return state;
  }
  const nextAllocator = {
    ...state.allocator,
    allocations: {
      ...state.allocator.allocations,
      [selected.allocatorField]: nextValue,
    },
  };
  return projectAllocator(state, nextAllocator);
};
