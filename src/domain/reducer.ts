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
import { KEY_ID, resolveKeyId } from "./keyPresentation.js";
import { applyAllocatorRuntimeProjection } from "./allocatorProjection.js";
import {
  adjustAxis,
  resetLambdaAdjustments,
  withMaxPointsAdded,
  withMaxPointsSet,
} from "./lambdaControl.js";
import { commitLegacyProjection, projectCalculatorToLegacy, resolveActiveCalculatorId } from "./multiCalculator.js";
import { getBaseControlProfile } from "./controlProfileRuntime.js";
import { projectControlFromState } from "./controlProjection.js";
import { normalizeRuntimeStateInvariants } from "./runtimeStateInvariants.js";
import {
  clearExecutionModeFlagsForInterrupt,
  isExecutionGatedMutationAction,
  isExecutionGatedInputKey,
  isExecutionInterruptingKey,
  isExecutionModeActive,
  isExecutionToggleFlag,
  markInvalidExecutionGateInput,
} from "./executionModePolicy.js";
import { handleAutoStepTick } from "./reducer.input.handlers.execution.js";
import { EXECUTION_PAUSE_FLAG } from "./state.js";
import type {
  Action,
  CalculatorId,
  GameState,
  VisualizerId,
} from "./types.js";
import { getAppServices, type AppServices } from "../contracts/appServices.js";
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

type ReducerOptions = {
  services?: AppServices;
};

const reduceLegacy = (state: GameState, action: Action, options: ReducerOptions = {}): GameState => {
  const services = options.services ?? getAppServices();
  const unlockCatalog = services.contentProvider.unlockCatalog;
  if (action.type !== "AUTO_STEP_TICK" && isExecutionGatedMutationAction(state, action)) {
    return markInvalidExecutionGateInput(state);
  }
  if (action.type === "PRESS_KEY") {
    const resolvedKey = resolveKeyId(action.key);
    if (isExecutionModeActive(state)) {
      if (isExecutionGatedInputKey(resolvedKey)) {
        return markInvalidExecutionGateInput(state);
      }
      if (isExecutionInterruptingKey(resolvedKey)) {
        return applyKeyAction(clearExecutionModeFlagsForInterrupt(state, resolvedKey), resolvedKey);
      }
    }
    return applyKeyAction(state, resolvedKey);
  }
  if (action.type === "AUTO_STEP_TICK") {
    if (!state.ui.buttonFlags[EXECUTION_PAUSE_FLAG]) {
      return state;
    }
    return handleAutoStepTick(state);
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
    if (isExecutionToggleFlag(state, action.flag)) {
      const cleared = clearExecutionModeFlagsForInterrupt(state, KEY_ID.exec_play_pause);
      return applyToggleFlag(cleared, action.flag);
    }
    return applyToggleFlag(state, action.flag);
  }
  if (action.type === "TOGGLE_VISUALIZER") {
    return applyToggleVisualizer(state, action.visualizer);
  }
  if (action.type === "ALLOCATOR_ADJUST") {
    const projection = projectControlFromState(state);
    const axis = allocatorFieldToAxis(action.field);
    if (!axis) {
      return state;
    }
    const nextControl = adjustAxis(projection.control, projection.profile, axis, action.delta);
    if (nextControl === projection.control) {
      return state;
    }
    return applyUnlocks(applyAllocatorRuntimeProjection(state, nextControl), unlockCatalog);
  }
  if (action.type === "ALLOCATOR_SET_MAX_POINTS") {
    const projection = projectControlFromState(state);
    const nextControl = withMaxPointsSet(projection.control, projection.profile, action.value);
    if (nextControl === projection.control) {
      return state;
    }
    return applyAllocatorRuntimeProjection(state, nextControl);
  }
  if (action.type === "ALLOCATOR_ADD_MAX_POINTS") {
    const projection = projectControlFromState(state);
    const nextControl = withMaxPointsAdded(projection.control, projection.profile, action.amount);
    if (nextControl === projection.control) {
      return state;
    }
    return applyAllocatorRuntimeProjection(state, nextControl);
  }
  if (action.type === "RESET_ALLOCATOR_DEVICE") {
    const projection = projectControlFromState(state);
    return applyAllocatorRuntimeProjection(state, resetLambdaAdjustments(projection.control, projection.profile));
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
  if (action.type === "LAMBDA_SET_CONTROL") {
    return applyUnlocks(applyAllocatorRuntimeProjection(state, action.value), unlockCatalog);
  }
  if (action.type === "SET_SESSION_CONTROL_EQUATIONS") {
    const baseProfile = getBaseControlProfile(action.calculatorId);
    const merged = {
      ...baseProfile,
      equations: action.equations,
    };
    const withSessionProfiles: GameState = {
      ...state,
      sessionControlProfiles: {
        ...state.sessionControlProfiles,
        [action.calculatorId]: merged,
      },
    };
    return applyAllocatorRuntimeProjection(withSessionProfiles, withSessionProfiles.lambdaControl);
  }
  return state;
};

const resolveActionCalculatorId = (state: GameState, action: Action): CalculatorId | null => {
  if ("calculatorId" in action && action.calculatorId) {
    return action.calculatorId;
  }
  if (
    action.type === "PRESS_KEY"
    || action.type === "SET_KEYPAD_DIMENSIONS"
    || action.type === "UPGRADE_KEYPAD_ROW"
    || action.type === "UPGRADE_KEYPAD_COLUMN"
    || action.type === "TOGGLE_FLAG"
    || action.type === "TOGGLE_VISUALIZER"
    || action.type === "ALLOCATOR_ADJUST"
    || action.type === "ALLOCATOR_SET_MAX_POINTS"
    || action.type === "ALLOCATOR_ADD_MAX_POINTS"
    || action.type === "RESET_ALLOCATOR_DEVICE"
    || action.type === "ALLOCATOR_RETURN_PRESSED"
    || action.type === "ALLOCATOR_ALLOCATE_PRESSED"
    || action.type === "LAMBDA_SET_CONTROL"
    || action.type === "AUTO_STEP_TICK"
  ) {
    return resolveActiveCalculatorId(state);
  }
  return null;
};

export const reducer = (state: GameState = initialState(), action: Action, options: ReducerOptions = {}): GameState => {
  const hasDualCalculators = Boolean(state.calculators?.g && state.calculators?.f);
  let nextState: GameState;
  if (!hasDualCalculators) {
    const reduced = reduceLegacy(state, action, options);
    if (state.calculators?.f) {
      nextState = commitLegacyProjection(state, reduced, "f");
    } else {
      nextState = reduced;
    }
  } else {
    const withInstances = state;
    if (action.type === "SET_ACTIVE_CALCULATOR") {
      nextState = {
        ...withInstances,
        activeCalculatorId: action.calculatorId,
      };
    } else {
      const targetCalculatorId = resolveActionCalculatorId(withInstances, action);
      if (!targetCalculatorId) {
        nextState = reduceLegacy(withInstances, action, options);
      } else {
        const projected = projectCalculatorToLegacy(withInstances, targetCalculatorId);
        const reduced = reduceLegacy(projected, action, options);
        nextState = commitLegacyProjection(withInstances, reduced, targetCalculatorId);
      }
    }
  }
  return normalizeRuntimeStateInvariants(nextState);
};

