import {
  initialState,
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
import { clearOperationEntry, withStepProgressCleared } from "./reducer.stateBuilders.js";
import { applyUnlocks } from "./unlocks.js";
import { resolveKeyId } from "./keyPresentation.js";
import { applyAllocatorRuntimeProjection } from "./allocatorProjection.js";
import {
  adjustAxis,
  resetLambdaAdjustments,
  sanitizeLambdaControl,
  withLegacyAllocatorFallback,
  withMaxPointsAdded,
  withMaxPointsSet,
} from "./lambdaControl.js";
import type {
  Action,
  GameState,
  VisualizerId,
} from "./types.js";
import { getContentProvider } from "../contracts/contentRegistry.js";
// Root reducer orchestrator: route actions to focused domain reducers.

const allocatorFieldToAxis = (field: "width" | "height" | "range" | "speed" | "slots"): "alpha" | "beta" | "gamma" | null => {
  if (field === "width") {
    return "alpha";
  }
  if (field === "height") {
    return "beta";
  }
  if (field === "slots") {
    return "gamma";
  }
  return null;
};

const applyToggleVisualizer = (state: GameState, visualizer: VisualizerId): GameState => {
  const activeVisualizer = state.ui.activeVisualizer === visualizer ? "total" : visualizer;
  if (state.ui.activeVisualizer === activeVisualizer) {
    return state;
  }
  return {
    ...state,
    ui: {
      ...state.ui,
      activeVisualizer,
    },
  };
};

const reduceLegacy = (state: GameState, action: Action): GameState => {
  const unlockCatalog = getContentProvider().unlockCatalog;
  if (action.type === "PRESS_KEY") {
    return applyKeyAction(state, resolveKeyId(action.key));
  }

  const lifecycleHandled = applyLifecycleAction(state, action);
  if (lifecycleHandled) {
    return lifecycleHandled;
  }

  if (action.type === "MOVE_KEY_SLOT") {
    const moved = applyMoveKeySlot(state, action.fromIndex, action.toIndex);
    return moved !== state ? withStepProgressCleared(moved) : moved;
  }
  if (action.type === "SWAP_KEY_SLOTS") {
    const swapped = applySwapKeySlots(state, action.firstIndex, action.secondIndex);
    return swapped !== state ? withStepProgressCleared(swapped) : swapped;
  }
  if (action.type === "MOVE_LAYOUT_CELL") {
    const moved = applyMoveLayoutCell(state, action.fromSurface, action.fromIndex, action.toSurface, action.toIndex);
    if (moved !== state) {
      if (action.fromSurface !== action.toSurface) {
        return clearOperationEntry(moved);
      }
      return withStepProgressCleared(moved);
    }
    return moved;
  }
  if (action.type === "SWAP_LAYOUT_CELLS") {
    const swapped = applySwapLayoutCells(state, action.fromSurface, action.fromIndex, action.toSurface, action.toIndex);
    if (swapped !== state) {
      if (action.fromSurface !== action.toSurface) {
        return clearOperationEntry(swapped);
      }
      return withStepProgressCleared(swapped);
    }
    return swapped;
  }
  if (action.type === "SET_KEYPAD_DIMENSIONS") {
    const resized = applySetKeypadDimensions(state, action.columns, action.rows);
    return resized !== state ? withStepProgressCleared(resized) : resized;
  }
  if (action.type === "UPGRADE_KEYPAD_ROW") {
    const upgraded = applyUpgradeKeypadRow(state);
    return upgraded !== state ? withStepProgressCleared(upgraded) : upgraded;
  }
  if (action.type === "UPGRADE_KEYPAD_COLUMN") {
    const upgraded = applyUpgradeKeypadColumn(state);
    return upgraded !== state ? withStepProgressCleared(upgraded) : upgraded;
  }
  if (action.type === "TOGGLE_FLAG") {
    return applyToggleFlag(state, action.flag);
  }
  if (action.type === "TOGGLE_VISUALIZER") {
    return applyToggleVisualizer(state, action.visualizer);
  }
  if (action.type === "ALLOCATOR_ADJUST") {
    const effectiveControl = withLegacyAllocatorFallback(state.lambdaControl, state.allocator);
    const axis = allocatorFieldToAxis(action.field);
    if (!axis) {
      return state;
    }
    const nextControl = adjustAxis(effectiveControl, axis, action.delta);
    if (nextControl === effectiveControl) {
      return state;
    }
    return applyUnlocks(applyAllocatorRuntimeProjection(state, nextControl), unlockCatalog);
  }
  if (action.type === "ALLOCATOR_SET_MAX_POINTS") {
    const effectiveControl = withLegacyAllocatorFallback(state.lambdaControl, state.allocator);
    const nextControl = withMaxPointsSet(effectiveControl, action.value);
    if (nextControl === effectiveControl) {
      return state;
    }
    return applyAllocatorRuntimeProjection(state, nextControl);
  }
  if (action.type === "ALLOCATOR_ADD_MAX_POINTS") {
    const effectiveControl = withLegacyAllocatorFallback(state.lambdaControl, state.allocator);
    const nextControl = withMaxPointsAdded(effectiveControl, action.amount);
    if (nextControl === effectiveControl) {
      return state;
    }
    return applyAllocatorRuntimeProjection(state, nextControl);
  }
  if (action.type === "RESET_ALLOCATOR_DEVICE") {
    return applyAllocatorRuntimeProjection(state, resetLambdaAdjustments(state.lambdaControl));
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
  if (action.type === "LAMBDA_SET_OVERRIDE_DELTA") {
    const next = sanitizeLambdaControl({
      ...state.lambdaControl,
      overrides: {
        ...state.lambdaControl.overrides,
        delta: action.value,
      },
    });
    return applyAllocatorRuntimeProjection(state, next);
  }
  if (action.type === "LAMBDA_SET_OVERRIDE_EPSILON") {
    const next = sanitizeLambdaControl({
      ...state.lambdaControl,
      overrides: {
        ...state.lambdaControl.overrides,
        epsilon: action.value,
      },
    });
    return applyAllocatorRuntimeProjection(state, next);
  }
  if (action.type === "LAMBDA_CLEAR_OVERRIDE_DELTA") {
    const next = sanitizeLambdaControl({
      ...state.lambdaControl,
      overrides: {
        ...state.lambdaControl.overrides,
      },
    });
    delete next.overrides.delta;
    return applyAllocatorRuntimeProjection(state, next);
  }
  if (action.type === "LAMBDA_CLEAR_OVERRIDE_EPSILON") {
    const next = sanitizeLambdaControl({
      ...state.lambdaControl,
      overrides: {
        ...state.lambdaControl.overrides,
      },
    });
    delete next.overrides.epsilon;
    return applyAllocatorRuntimeProjection(state, next);
  }
  if (action.type === "LAMBDA_SET_CONTROL") {
    return applyUnlocks(applyAllocatorRuntimeProjection(state, action.value), unlockCatalog);
  }
  return state;
};

export const reducer = (state: GameState = initialState(), action: Action): GameState => reduceLegacy(state, action);

