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
import { KEY_ID } from "./keyPresentation.js";
import { applyAllocatorRuntimeProjection } from "./allocatorProjection.js";
import {
  adjustAxis,
  resetLambdaAdjustments,
  withMaxPointsAdded,
  withMaxPointsSet,
} from "./lambdaControl.js";
import {
  commitLegacyProjection,
  isMultiCalculatorSession,
  projectCalculatorToLegacy,
  resolveActiveCalculatorId,
} from "./multiCalculator.js";
import { getBaseControlProfile } from "./controlProfileRuntime.js";
import { projectControlFromState } from "./controlProjection.js";
import { normalizeRuntimeStateInvariants } from "./runtimeStateInvariants.js";
import {
  applyExecutionInterrupt,
  classifyExecutionPolicyAction,
  isExecutionModeActive,
  type ExecutionPolicyResult,
} from "./executionModePolicy.js";
import { handleAutoStepTick } from "./reducer.input.handlers.execution.js";
import { EXECUTION_PAUSE_EQUALS_FLAG } from "./state.js";
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

type ResolvedExecutionPolicy = {
  decision: ExecutionPolicyResult;
  calculatorId: CalculatorId;
};

const normalizeLegacyEqualsPress = (action: Action): Action => {
  if (action.type !== "PRESS_KEY" || action.key !== KEY_ID.exec_equals) {
    return action;
  }
  return {
    type: "TOGGLE_FLAG",
    flag: EXECUTION_PAUSE_EQUALS_FLAG,
    ...(action.calculatorId ? { calculatorId: action.calculatorId } : {}),
  };
};

const reduceLegacy = (state: GameState, action: Action, options: ReducerOptions = {}): GameState => {
  const services = options.services ?? getAppServices();
  const unlockCatalog = services.contentProvider.unlockCatalog;
  const normalizedAction = normalizeLegacyEqualsPress(action);
  const executionPolicy = classifyExecutionPolicyAction(state, normalizedAction);
  if (executionPolicy.decision === "reject") {
    return state;
  }
  if (normalizedAction.type === "PRESS_KEY") {
    if (executionPolicy.decision === "interrupt_and_run") {
      return applyKeyAction(applyExecutionInterrupt(state, executionPolicy.interrupt), normalizedAction.key);
    }
    return applyKeyAction(state, normalizedAction.key);
  }
  if (normalizedAction.type === "AUTO_STEP_TICK") {
    if (!isExecutionModeActive(state)) {
      return state;
    }
    const stepped = handleAutoStepTick(state);
    if (
      stepped !== state
      && state.ui.buttonFlags[EXECUTION_PAUSE_EQUALS_FLAG]
      && stepped.calculator.rollEntries.length > state.calculator.rollEntries.length
    ) {
      const nextFlags = { ...stepped.ui.buttonFlags };
      delete nextFlags[EXECUTION_PAUSE_EQUALS_FLAG];
      return {
        ...stepped,
        ui: {
          ...stepped.ui,
          buttonFlags: nextFlags,
        },
      };
    }
    return stepped;
  }

  const lifecycleHandled = applyLifecycleAction(state, action);
  if (lifecycleHandled) {
    return lifecycleHandled;
  }

  if (normalizedAction.type === "MOVE_KEY_SLOT") {
    const moved = applyMoveKeySlot(state, normalizedAction.fromIndex, normalizedAction.toIndex);
    return moved !== state ? withStepProgressCleared(moved) : moved;
  }
  if (normalizedAction.type === "SWAP_KEY_SLOTS") {
    const swapped = applySwapKeySlots(state, normalizedAction.firstIndex, normalizedAction.secondIndex);
    return swapped !== state ? withStepProgressCleared(swapped) : swapped;
  }
  if (normalizedAction.type === "MOVE_LAYOUT_CELL") {
    const moved = applyMoveLayoutCell(
      state,
      normalizedAction.fromSurface,
      normalizedAction.fromIndex,
      normalizedAction.toSurface,
      normalizedAction.toIndex,
    );
    if (moved !== state) {
      if (normalizedAction.fromSurface !== normalizedAction.toSurface) {
        return clearOperationEntry(moved);
      }
      return withStepProgressCleared(moved);
    }
    return moved;
  }
  if (normalizedAction.type === "SWAP_LAYOUT_CELLS") {
    const swapped = applySwapLayoutCells(
      state,
      normalizedAction.fromSurface,
      normalizedAction.fromIndex,
      normalizedAction.toSurface,
      normalizedAction.toIndex,
    );
    if (swapped !== state) {
      if (normalizedAction.fromSurface !== normalizedAction.toSurface) {
        return clearOperationEntry(swapped);
      }
      return withStepProgressCleared(swapped);
    }
    return swapped;
  }
  if (normalizedAction.type === "SET_KEYPAD_DIMENSIONS") {
    const resized = applySetKeypadDimensions(state, normalizedAction.columns, normalizedAction.rows);
    return resized !== state ? withStepProgressCleared(resized) : resized;
  }
  if (normalizedAction.type === "UPGRADE_KEYPAD_ROW") {
    const upgraded = applyUpgradeKeypadRow(state);
    return upgraded !== state ? withStepProgressCleared(upgraded) : upgraded;
  }
  if (normalizedAction.type === "UPGRADE_KEYPAD_COLUMN") {
    const upgraded = applyUpgradeKeypadColumn(state);
    return upgraded !== state ? withStepProgressCleared(upgraded) : upgraded;
  }
  if (normalizedAction.type === "TOGGLE_FLAG") {
    if (executionPolicy.decision === "interrupt_and_run") {
      return applyToggleFlag(applyExecutionInterrupt(state, executionPolicy.interrupt), normalizedAction.flag);
    }
    return applyToggleFlag(state, normalizedAction.flag);
  }
  if (normalizedAction.type === "TOGGLE_VISUALIZER") {
    return applyToggleVisualizer(state, normalizedAction.visualizer);
  }
  if (normalizedAction.type === "ALLOCATOR_ADJUST") {
    const projection = projectControlFromState(state);
    const axis = allocatorFieldToAxis(normalizedAction.field);
    if (!axis) {
      return state;
    }
    const nextControl = adjustAxis(projection.control, projection.profile, axis, normalizedAction.delta);
    if (nextControl === projection.control) {
      return state;
    }
    return applyUnlocks(applyAllocatorRuntimeProjection(state, nextControl), unlockCatalog);
  }
  if (normalizedAction.type === "ALLOCATOR_SET_MAX_POINTS") {
    const projection = projectControlFromState(state);
    const nextControl = withMaxPointsSet(projection.control, projection.profile, normalizedAction.value);
    if (nextControl === projection.control) {
      return state;
    }
    return applyAllocatorRuntimeProjection(state, nextControl);
  }
  if (normalizedAction.type === "ALLOCATOR_ADD_MAX_POINTS") {
    const projection = projectControlFromState(state);
    const nextControl = withMaxPointsAdded(projection.control, projection.profile, normalizedAction.amount);
    if (nextControl === projection.control) {
      return state;
    }
    return applyAllocatorRuntimeProjection(state, nextControl);
  }
  if (normalizedAction.type === "RESET_ALLOCATOR_DEVICE") {
    const projection = projectControlFromState(state);
    return applyAllocatorRuntimeProjection(state, resetLambdaAdjustments(projection.control, projection.profile));
  }
  if (normalizedAction.type === "ALLOCATOR_RETURN_PRESSED") {
    const withCount: GameState = {
      ...state,
      allocatorReturnPressCount: (state.allocatorReturnPressCount ?? 0) + 1,
    };
    return applyUnlocks(withCount, unlockCatalog);
  }
  if (normalizedAction.type === "ALLOCATOR_ALLOCATE_PRESSED") {
    const withCount: GameState = {
      ...state,
      allocatorAllocatePressCount: (state.allocatorAllocatePressCount ?? 0) + 1,
    };
    return applyUnlocks(withCount, unlockCatalog);
  }
  if (normalizedAction.type === "LAMBDA_SET_CONTROL") {
    return applyUnlocks(applyAllocatorRuntimeProjection(state, normalizedAction.value), unlockCatalog);
  }
  if (normalizedAction.type === "SET_SESSION_CONTROL_EQUATIONS") {
    const baseProfile = getBaseControlProfile(normalizedAction.calculatorId);
    const merged = {
      ...baseProfile,
      equations: normalizedAction.equations,
    };
    const withSessionProfiles: GameState = {
      ...state,
      sessionControlProfiles: {
        ...state.sessionControlProfiles,
        [normalizedAction.calculatorId]: merged,
      },
    };
    return applyAllocatorRuntimeProjection(withSessionProfiles, withSessionProfiles.lambdaControl);
  }
  return state;
};

export const resolveActionCalculatorId = (state: GameState, action: Action): CalculatorId | null => {
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

export const resolveExecutionPolicyForAction = (state: GameState, action: Action): ResolvedExecutionPolicy => {
  const normalizedAction = normalizeLegacyEqualsPress(action);
  const targetCalculatorId = resolveActionCalculatorId(state, normalizedAction);
  const calculatorId = targetCalculatorId ?? resolveActiveCalculatorId(state);
  if (isMultiCalculatorSession(state) && targetCalculatorId) {
    const projected = projectCalculatorToLegacy(state, targetCalculatorId);
    return {
      decision: classifyExecutionPolicyAction(projected, normalizedAction),
      calculatorId,
    };
  }
  return {
    decision: classifyExecutionPolicyAction(state, normalizedAction),
    calculatorId,
  };
};

const reduceWithProjectionScope = (state: GameState, action: Action, options: ReducerOptions = {}): GameState => {
  if (!isMultiCalculatorSession(state)) {
    const reduced = reduceLegacy(state, action, options);
    if (state.calculators?.f) {
      return commitLegacyProjection(state, reduced, "f");
    }
    return reduced;
  }

  const targetCalculatorId = resolveActionCalculatorId(state, action);
  if (!targetCalculatorId) {
    return reduceLegacy(state, action, options);
  }

  const projected = projectCalculatorToLegacy(state, targetCalculatorId);
  const reduced = reduceLegacy(projected, action, options);
  return commitLegacyProjection(state, reduced, targetCalculatorId);
};

export const reducer = (state: GameState = initialState(), action: Action, options: ReducerOptions = {}): GameState => {
  let nextState: GameState;
  if (isMultiCalculatorSession(state) && action.type === "SET_ACTIVE_CALCULATOR" && state.calculators?.[action.calculatorId]) {
    nextState = {
      ...state,
      activeCalculatorId: action.calculatorId,
    };
  } else {
    nextState = reduceWithProjectionScope(state, action, options);
  }
  return normalizeRuntimeStateInvariants(nextState);
};

