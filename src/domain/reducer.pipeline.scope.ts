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
import { resetRunState, withStepProgressCleared } from "./reducer.stateBuilders.js";
import { applyUnlocks } from "./unlocks.js";
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
import {
  applyExecutionInterrupt,
  classifyExecutionPolicyAction,
  isExecutionModeActive,
} from "./executionModePolicy.js";
import { handleAutoStepTick, handleEqualsInput } from "./reducer.input.handlers.execution.js";
import { getAppServices, type AppServices } from "../contracts/appServices.js";
import { applySettingsSelection } from "./settings.js";
import { EXECUTION_PAUSE_EQUALS_FLAG } from "./state.js";
import type {
  Action,
  CalculatorId,
  GameState,
  LayoutSurface,
  VisualizerId,
} from "./types.js";
import { normalizeLegacyEqualsPress, resolveActionCalculatorId } from "./reducer.pipeline.action.js";

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
  const nextSettings = applySettingsSelection(state, { family: "visualizer", option: visualizer });
  if (nextSettings === state.settings) {
    return state;
  }
  return {
    ...state,
    settings: nextSettings,
    ui: {
      ...state.ui,
      activeVisualizer: nextSettings.visualizer,
    },
  };
};

export type ReducerOptions = {
  services?: AppServices;
};

const isKeypadSurface = (surface: LayoutSurface): surface is "keypad" | "keypad_f" | "keypad_g" | "keypad_menu" =>
  surface === "keypad" || surface === "keypad_f" || surface === "keypad_g" || surface === "keypad_menu";

const resolveSurfaceCalculatorId = (state: GameState, surface: LayoutSurface): CalculatorId | null => {
  if (surface === "keypad") {
    return resolveActiveCalculatorId(state);
  }
  if (surface === "keypad_f") {
    return "f";
  }
  if (surface === "keypad_g") {
    return "g";
  }
  if (surface === "keypad_menu") {
    return "menu";
  }
  return null;
};

const resolveMoveResetTargets = (state: GameState, fromSurface: LayoutSurface, toSurface: LayoutSurface): CalculatorId[] => {
  const fromOwner = resolveSurfaceCalculatorId(state, fromSurface);
  const toOwner = resolveSurfaceCalculatorId(state, toSurface);
  if (!fromOwner || fromOwner === toOwner) {
    return [];
  }
  return [fromOwner];
};

const resolveSwapResetTargets = (state: GameState, fromSurface: LayoutSurface, toSurface: LayoutSurface): CalculatorId[] => {
  const fromOwner = resolveSurfaceCalculatorId(state, fromSurface);
  const toOwner = resolveSurfaceCalculatorId(state, toSurface);
  const targets = new Set<CalculatorId>();
  if (fromOwner && fromOwner !== toOwner) {
    targets.add(fromOwner);
  }
  if (toOwner && toOwner !== fromOwner) {
    targets.add(toOwner);
  }
  return [...targets];
};

const applyFullResetToCalculator = (state: GameState, calculatorId: CalculatorId): GameState => {
  if (!isMultiCalculatorSession(state)) {
    return resetRunState(state);
  }
  if (!state.calculators?.[calculatorId]) {
    return state;
  }
  const projected = projectCalculatorToLegacy(state, calculatorId);
  return commitLegacyProjection(state, resetRunState(projected), calculatorId);
};

const applyLossResets = (state: GameState, calculatorIds: readonly CalculatorId[]): GameState => {
  let next = state;
  for (const calculatorId of calculatorIds) {
    next = applyFullResetToCalculator(next, calculatorId);
  }
  return next;
};

const countInstalledKeypadKeys = (state: GameState, calculatorId: CalculatorId): number => {
  const keyLayout = state.calculators?.[calculatorId]?.ui.keyLayout ?? state.ui.keyLayout;
  return keyLayout.reduce((count, cell) => (cell.kind === "key" ? count + 1 : count), 0);
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
    const fallbackEqualsApplied =
      stepped === state && state.ui.buttonFlags[EXECUTION_PAUSE_EQUALS_FLAG]
        ? handleEqualsInput(state)
        : stepped;
    if (
      fallbackEqualsApplied !== state
      && state.ui.buttonFlags[EXECUTION_PAUSE_EQUALS_FLAG]
      && fallbackEqualsApplied.calculator.rollEntries.length > state.calculator.rollEntries.length
    ) {
      const nextFlags = { ...fallbackEqualsApplied.ui.buttonFlags };
      delete nextFlags[EXECUTION_PAUSE_EQUALS_FLAG];
      return {
        ...fallbackEqualsApplied,
        ui: {
          ...fallbackEqualsApplied.ui,
          buttonFlags: nextFlags,
        },
      };
    }
    return fallbackEqualsApplied;
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
      const resetTargets = resolveMoveResetTargets(state, normalizedAction.fromSurface, normalizedAction.toSurface);
      if (resetTargets.length > 0) {
        return applyLossResets(moved, resetTargets);
      }
      if (normalizedAction.fromSurface === normalizedAction.toSurface && isKeypadSurface(normalizedAction.fromSurface)) {
        return withStepProgressCleared(moved);
      }
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
      const resetTargets = resolveSwapResetTargets(state, normalizedAction.fromSurface, normalizedAction.toSurface);
      if (resetTargets.length > 0) {
        return applyLossResets(swapped, resetTargets);
      }
      if (normalizedAction.fromSurface === normalizedAction.toSurface && isKeypadSurface(normalizedAction.fromSurface)) {
        return withStepProgressCleared(swapped);
      }
    }
    return swapped;
  }
  if (normalizedAction.type === "SET_KEYPAD_DIMENSIONS") {
    const targetCalculatorId = resolveActiveCalculatorId(state);
    const installedBefore = countInstalledKeypadKeys(state, targetCalculatorId);
    const resized = applySetKeypadDimensions(state, normalizedAction.columns, normalizedAction.rows);
    if (resized === state) {
      return resized;
    }
    const installedAfter = countInstalledKeypadKeys(resized, targetCalculatorId);
    if (installedAfter < installedBefore) {
      return applyLossResets(resized, [targetCalculatorId]);
    }
    return withStepProgressCleared(resized);
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

export const reduceWithProjectionScope = (state: GameState, action: Action, options: ReducerOptions = {}): GameState => {
  if (!isMultiCalculatorSession(state)) {
    const reduced = reduceLegacy(state, action, options);
    if (state.calculators?.f) {
      return commitLegacyProjection(reduced, reduced, "f");
    }
    return reduced;
  }

  const targetCalculatorId = resolveActionCalculatorId(state, action);
  if (!targetCalculatorId) {
    return reduceLegacy(state, action, options);
  }

  const projected = projectCalculatorToLegacy(state, targetCalculatorId);
  const reduced = reduceLegacy(projected, action, options);
  const committed = commitLegacyProjection(state, reduced, targetCalculatorId);
  if ("calculatorId" in action && action.calculatorId) {
    const preservedActiveCalculatorId = state.activeCalculatorId ?? resolveActiveCalculatorId(committed);
    return projectCalculatorToLegacy(
      {
        ...committed,
        activeCalculatorId: preservedActiveCalculatorId,
      },
      preservedActiveCalculatorId,
    );
  }
  return committed;
};
