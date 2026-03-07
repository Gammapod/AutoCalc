import {
  KEYPAD_DIM_MAX,
  KEYPAD_DIM_MIN,
  OPERATION_SLOTS_MAX,
  OPERATION_SLOTS_MIN,
  TOTAL_DIGITS_MAX,
  TOTAL_DIGITS_MIN,
} from "./state.js";
import { applySetKeypadDimensions } from "./reducer.layout.js";
import type { AllocatorState, GameState } from "./types.js";

const clampToRange = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const applyAllocatorRuntimeProjection = (state: GameState, allocator: AllocatorState): GameState => {
  const withAllocator = allocator === state.allocator ? state : { ...state, allocator };
  const columns = clampToRange(1 + withAllocator.allocator.allocations.width, KEYPAD_DIM_MIN, KEYPAD_DIM_MAX);
  const rows = clampToRange(1 + withAllocator.allocator.allocations.height, KEYPAD_DIM_MIN, KEYPAD_DIM_MAX);
  const maxDigits = clampToRange(1 + withAllocator.allocator.allocations.range, TOTAL_DIGITS_MIN, TOTAL_DIGITS_MAX);
  const maxSlots = clampToRange(withAllocator.allocator.allocations.slots, OPERATION_SLOTS_MIN, OPERATION_SLOTS_MAX);
  const resized = applySetKeypadDimensions(withAllocator, columns, rows);
  if (resized.unlocks.maxTotalDigits === maxDigits && resized.unlocks.maxSlots === maxSlots) {
    return resized;
  }
  return {
    ...resized,
    unlocks: {
      ...resized.unlocks,
      maxTotalDigits: maxDigits,
      maxSlots,
    },
  };
};
