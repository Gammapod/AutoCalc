import {
  initialState,
  KEYPAD_DIM_MAX,
  KEYPAD_DIM_MIN,
  OPERATION_SLOTS_MAX,
  OPERATION_SLOTS_MIN,
  TOTAL_DIGITS_MAX,
  TOTAL_DIGITS_MIN,
} from "./state.js";
import { applyKeyAction } from "./reducer.input.js";
import {
  applyMoveKeySlot,
  applyMoveLayoutCell,
  applySetKeypadDimensions,
  applyUpgradeKeypadColumn,
  applyUpgradeKeypadRow,
  applySwapKeySlots,
  applySwapLayoutCells,
} from "./reducer.layout.js";
import { applyLifecycleAction } from "./reducer.lifecycle.js";
import { applyToggleFlag } from "./reducer.flags.js";
import { clearOperationEntry } from "./reducer.stateBuilders.js";
import { unlockCatalog } from "../content/unlocks.catalog.js";
import { applyUnlocks } from "./unlocks.js";
import type { Action, AllocatorAllocationField, AllocatorBudgetSnapshot, AllocatorState, GameState } from "./types.js";
import { reduceActionWithV2 } from "../../src_v2/compat/legacyReducerAdapter.js";
import { compareParity } from "../../src_v2/compat/parityHarness.js";

// Root reducer orchestrator: route actions to focused domain reducers.
const readFlag = (name: "USE_V2_ENGINE" | "V2_PARITY_ASSERT"): boolean => {
  const processEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return processEnv?.[name] === "true";
};

const ALLOCATOR_TRIM_ORDER: readonly AllocatorAllocationField[] = ["speed", "range", "slots", "height", "width"];

const clampNonNegativeInteger = (value: number, fallback: number): number => {
  if (!Number.isInteger(value)) {
    return fallback;
  }
  return Math.max(0, value);
};

const clampToRange = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const getSpentTotal = (allocator: AllocatorState): number =>
  allocator.allocations.width +
  allocator.allocations.height +
  allocator.allocations.range +
  allocator.allocations.speed +
  allocator.allocations.slots;

const getUnusedPoints = (allocator: AllocatorState): number => allocator.maxPoints - getSpentTotal(allocator);

const getAllocatorBudgetSnapshot = (allocator: AllocatorState): AllocatorBudgetSnapshot => ({
  spentTotal: getSpentTotal(allocator),
  unusedPoints: getUnusedPoints(allocator),
});

const trimAllocationsToBudget = (allocator: AllocatorState): AllocatorState => {
  const nextAllocations = { ...allocator.allocations };
  let overspend = getSpentTotal(allocator) - allocator.maxPoints;
  if (overspend <= 0) {
    return allocator;
  }
  for (const field of ALLOCATOR_TRIM_ORDER) {
    if (overspend <= 0) {
      break;
    }
    const reduction = Math.min(nextAllocations[field], overspend);
    nextAllocations[field] -= reduction;
    overspend -= reduction;
  }
  return {
    ...allocator,
    allocations: nextAllocations,
  };
};

const applyMaxPointsSetWithTrim = (allocator: AllocatorState, rawValue: number): AllocatorState => {
  const maxPoints = clampNonNegativeInteger(rawValue, allocator.maxPoints);
  const base: AllocatorState = maxPoints === allocator.maxPoints ? allocator : { ...allocator, maxPoints };
  return trimAllocationsToBudget(base);
};

const applyAllocationDelta = (allocator: AllocatorState, field: AllocatorAllocationField, delta: 1 | -1): AllocatorState => {
  const budget = getAllocatorBudgetSnapshot(allocator);
  const current = allocator.allocations[field];
  if (delta === 1 && budget.unusedPoints <= 0) {
    return allocator;
  }
  if (delta === -1 && current <= 0) {
    return allocator;
  }
  const nextValue = current + delta;
  return {
    ...allocator,
    allocations: {
      ...allocator.allocations,
      [field]: nextValue,
    },
  };
};

const applyAllocatorRuntimeProjection = (state: GameState, allocator: AllocatorState): GameState => {
  const withAllocator = allocator === state.allocator ? state : { ...state, allocator };
  const columns = clampToRange(1 + withAllocator.allocator.allocations.width, KEYPAD_DIM_MIN, KEYPAD_DIM_MAX);
  const rows = clampToRange(1 + withAllocator.allocator.allocations.height, KEYPAD_DIM_MIN, KEYPAD_DIM_MAX);
  const maxDigits = clampToRange(1 + withAllocator.allocator.allocations.range, TOTAL_DIGITS_MIN, TOTAL_DIGITS_MAX);
  const maxSlots = clampToRange(1 + withAllocator.allocator.allocations.slots, OPERATION_SLOTS_MIN, OPERATION_SLOTS_MAX);
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
    const moved = applyMoveLayoutCell(state, action.fromSurface, action.fromIndex, action.toSurface, action.toIndex);
    if (moved !== state && action.fromSurface !== action.toSurface) {
      return clearOperationEntry(moved);
    }
    return moved;
  }
  if (action.type === "SWAP_LAYOUT_CELLS") {
    const swapped = applySwapLayoutCells(state, action.fromSurface, action.fromIndex, action.toSurface, action.toIndex);
    if (swapped !== state && action.fromSurface !== action.toSurface) {
      return clearOperationEntry(swapped);
    }
    return swapped;
  }
  if (action.type === "SET_KEYPAD_DIMENSIONS") {
    return applySetKeypadDimensions(state, action.columns, action.rows);
  }
  if (action.type === "UPGRADE_KEYPAD_ROW") {
    return applyUpgradeKeypadRow(state);
  }
  if (action.type === "UPGRADE_KEYPAD_COLUMN") {
    return applyUpgradeKeypadColumn(state);
  }
  if (action.type === "TOGGLE_FLAG") {
    return applyToggleFlag(state, action.flag);
  }
  if (action.type === "ALLOCATOR_ADJUST") {
    const nextAllocator = applyAllocationDelta(state.allocator, action.field, action.delta);
    if (nextAllocator === state.allocator) {
      return state;
    }
    return applyAllocatorRuntimeProjection(state, nextAllocator);
  }
  if (action.type === "ALLOCATOR_SET_MAX_POINTS") {
    const nextAllocator = applyMaxPointsSetWithTrim(state.allocator, action.value);
    if (nextAllocator === state.allocator) {
      return state;
    }
    return applyAllocatorRuntimeProjection(state, nextAllocator);
  }
  if (action.type === "ALLOCATOR_ADD_MAX_POINTS") {
    const amount = clampNonNegativeInteger(action.amount, 0);
    if (amount <= 0) {
      return state;
    }
    const nextAllocator = {
      ...state.allocator,
      maxPoints: state.allocator.maxPoints + amount,
    };
    return applyAllocatorRuntimeProjection(state, nextAllocator);
  }
  if (action.type === "RESET_ALLOCATOR_DEVICE") {
    const nextAllocator: AllocatorState = {
      ...state.allocator,
      allocations: {
        width: 0,
        height: 0,
        range: 0,
        speed: 0,
        slots: 0,
      },
    };
    return applyAllocatorRuntimeProjection(state, nextAllocator);
  }
  if (action.type === "ALLOCATOR_RETURN_PRESSED") {
    const withCount: GameState = {
      ...state,
      allocatorReturnPressCount: (state.allocatorReturnPressCount ?? 0) + 1,
    };
    return applyUnlocks(withCount, unlockCatalog);
  }
  if (action.type === "ALLOCATOR_ALLOCATE_PRESSED") {
    const withCount: GameState = {
      ...state,
      allocatorAllocatePressCount: (state.allocatorAllocatePressCount ?? 0) + 1,
    };
    return applyUnlocks(withCount, unlockCatalog);
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
