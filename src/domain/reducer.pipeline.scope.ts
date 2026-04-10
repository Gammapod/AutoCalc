import { applyKeyAction } from "./reducer.input.js";
import {
  applyInstallKeyFromStorage,
  applyMoveKeySlot,
  applyMoveLayoutCell,
  applySetKeypadDimensions,
  applyUninstallLayoutKey,
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
import { sanitizeLambdaControl } from "./lambdaControl.js";
import {
  commitLegacyProjection,
  isMultiCalculatorSession,
  projectCalculatorToLegacy,
  resolveActiveCalculatorId,
  setActiveCalculator,
} from "./multiCalculator.js";
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
import {
  isAnyKeypadSurface as isKeypadSurface,
  resolveSurfaceCalculatorId,
} from "./calculatorSurface.js";

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

type LegacyReduceContext = {
  state: GameState;
  action: Action;
  executionPolicy: ReturnType<typeof classifyExecutionPolicyAction>;
  unlockCatalog: AppServices["contentProvider"]["unlockCatalog"];
};

const getSurfaceUi = (state: GameState, surface: LayoutSurface): GameState["ui"] | null => {
  if (!isKeypadSurface(surface)) {
    return null;
  }
  const calculatorId = resolveSurfaceCalculatorId(state, surface);
  if (!calculatorId) {
    return surface === "keypad" ? state.ui : null;
  }
  return state.calculators?.[calculatorId]?.ui ?? (calculatorId === "f" ? state.ui : null);
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

const handleLayoutMutationAction = (state: GameState, action: Action): GameState | null => {
  if (action.type === "MOVE_KEY_SLOT") {
    const moved = applyMoveKeySlot(state, action.fromIndex, action.toIndex);
    return moved !== state ? withStepProgressCleared(moved) : moved;
  }
  if (action.type === "SWAP_KEY_SLOTS") {
    const swapped = applySwapKeySlots(state, action.firstIndex, action.secondIndex);
    return swapped !== state ? withStepProgressCleared(swapped) : swapped;
  }
  if (action.type === "MOVE_LAYOUT_CELL") {
    const moved = applyMoveLayoutCell(
      state,
      action.fromSurface,
      action.fromIndex,
      action.toSurface,
      action.toIndex,
    );
    if (moved !== state) {
      const resetTargets = resolveMoveResetTargets(state, action.fromSurface, action.toSurface);
      if (resetTargets.length > 0) {
        return applyLossResets(moved, resetTargets);
      }
      if (action.fromSurface === action.toSurface && isKeypadSurface(action.fromSurface)) {
        return withStepProgressCleared(moved);
      }
    }
    return moved;
  }
  if (action.type === "INSTALL_KEY_FROM_STORAGE") {
    const destinationBefore = isKeypadSurface(action.toSurface)
      ? (() => {
        const ui = getSurfaceUi(state, action.toSurface);
        if (!ui) {
          return null;
        }
        return ui.keyLayout[action.toIndex] ?? null;
      })()
      : null;
    const installed = applyInstallKeyFromStorage(
      state,
      action.key,
      action.toSurface,
      action.toIndex,
    );
    if (installed !== state) {
      if (destinationBefore?.kind === "key") {
        const resetTarget = resolveSurfaceCalculatorId(state, action.toSurface);
        if (resetTarget) {
          return applyLossResets(installed, [resetTarget]);
        }
      }
      return withStepProgressCleared(installed);
    }
    return installed;
  }
  if (action.type === "UNINSTALL_LAYOUT_KEY") {
    const uninstalled = applyUninstallLayoutKey(
      state,
      action.fromSurface,
      action.fromIndex,
    );
    if (uninstalled !== state) {
      const resetTarget = resolveSurfaceCalculatorId(state, action.fromSurface);
      if (resetTarget) {
        return applyLossResets(uninstalled, [resetTarget]);
      }
      return withStepProgressCleared(uninstalled);
    }
    return uninstalled;
  }
  if (action.type === "SWAP_LAYOUT_CELLS") {
    const swapped = applySwapLayoutCells(
      state,
      action.fromSurface,
      action.fromIndex,
      action.toSurface,
      action.toIndex,
    );
    if (swapped !== state) {
      const resetTargets = resolveSwapResetTargets(state, action.fromSurface, action.toSurface);
      if (resetTargets.length > 0) {
        return applyLossResets(swapped, resetTargets);
      }
      if (action.fromSurface === action.toSurface && isKeypadSurface(action.fromSurface)) {
        return withStepProgressCleared(swapped);
      }
    }
    return swapped;
  }
  if (action.type === "SET_KEYPAD_DIMENSIONS") {
    const targetCalculatorId = resolveActiveCalculatorId(state);
    const installedBefore = countInstalledKeypadKeys(state, targetCalculatorId);
    const resized = applySetKeypadDimensions(state, action.columns, action.rows);
    if (resized === state) {
      return resized;
    }
    const installedAfter = countInstalledKeypadKeys(resized, targetCalculatorId);
    if (installedAfter < installedBefore) {
      return applyLossResets(resized, [targetCalculatorId]);
    }
    return withStepProgressCleared(resized);
  }
  if (action.type === "UPGRADE_KEYPAD_ROW") {
    const upgraded = applyUpgradeKeypadRow(state);
    return upgraded !== state ? withStepProgressCleared(upgraded) : upgraded;
  }
  if (action.type === "UPGRADE_KEYPAD_COLUMN") {
    const upgraded = applyUpgradeKeypadColumn(state);
    return upgraded !== state ? withStepProgressCleared(upgraded) : upgraded;
  }
  return null;
};

const handleToggleAndVisualizerAction = (
  state: GameState,
  action: Action,
  executionPolicy: ReturnType<typeof classifyExecutionPolicyAction>,
): GameState | null => {
  if (action.type === "TOGGLE_FLAG") {
    if (executionPolicy.decision === "interrupt_and_run") {
      return applyToggleFlag(applyExecutionInterrupt(state, executionPolicy.interrupt), action.flag);
    }
    return applyToggleFlag(state, action.flag);
  }
  if (action.type === "TOGGLE_VISUALIZER") {
    return applyToggleVisualizer(state, action.visualizer);
  }
  return null;
};

const handleControlAction = (
  state: GameState,
  action: Action,
  unlockCatalog: AppServices["contentProvider"]["unlockCatalog"],
): GameState | null => {
  if (action.type === "LAMBDA_SET_CONTROL") {
    return applyUnlocks(applyAllocatorRuntimeProjection(state, action.value), unlockCatalog);
  }
  if (action.type === "SET_CONTROL_FIELD") {
    const projection = projectControlFromState(state);
    const nextControl = sanitizeLambdaControl({
      ...projection.control,
      [action.field]: action.value,
    });
    return applyUnlocks(applyAllocatorRuntimeProjection(state, nextControl), unlockCatalog);
  }
  return null;
};

const handleExecutionInputAction = (
  state: GameState,
  action: Action,
  executionPolicy: ReturnType<typeof classifyExecutionPolicyAction>,
): GameState | null => {
  if (action.type === "PRESS_KEY") {
    if (executionPolicy.decision === "interrupt_and_run") {
      return applyKeyAction(applyExecutionInterrupt(state, executionPolicy.interrupt), action.key);
    }
    return applyKeyAction(state, action.key);
  }
  if (action.type === "AUTO_STEP_TICK") {
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
  return null;
};

type LegacyActionFamilyHandler = (context: LegacyReduceContext) => GameState | null;

const LEGACY_ACTION_FAMILY_HANDLERS: readonly LegacyActionFamilyHandler[] = [
  ({ state, action }) => handleLayoutMutationAction(state, action),
  ({ state, action, executionPolicy }) => handleToggleAndVisualizerAction(state, action, executionPolicy),
  ({ state, action, unlockCatalog }) => handleControlAction(state, action, unlockCatalog),
];

const reduceWithinTargetCalculatorProjection = (
  state: GameState,
  targetCalculatorId: CalculatorId,
  action: Action,
  options: ReducerOptions = {},
): GameState => {
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

const reduceLegacy = (state: GameState, action: Action, options: ReducerOptions = {}): GameState => {
  const services = options.services ?? getAppServices();
  const unlockCatalog = services.contentProvider.unlockCatalog;
  const normalizedAction = normalizeLegacyEqualsPress(action);
  const executionPolicy = classifyExecutionPolicyAction(state, normalizedAction);
  if (executionPolicy.decision === "reject") {
    return state;
  }
  const executionInputHandled = handleExecutionInputAction(state, normalizedAction, executionPolicy);
  if (executionInputHandled) {
    return executionInputHandled;
  }

  const lifecycleHandled = applyLifecycleAction(state, normalizedAction);
  if (lifecycleHandled) {
    return lifecycleHandled;
  }

  const context: LegacyReduceContext = {
    state,
    action: normalizedAction,
    executionPolicy,
    unlockCatalog,
  };
  for (const handleFamily of LEGACY_ACTION_FAMILY_HANDLERS) {
    const handled = handleFamily(context);
    if (handled) {
      return handled;
    }
  }
  return state;
};

export const reduceWithProjectionScope = (state: GameState, action: Action, options: ReducerOptions = {}): GameState => {
  if (!isMultiCalculatorSession(state)) {
    const reduced = reduceLegacy(state, action, options);
    const activeCalculatorId = resolveActiveCalculatorId(reduced);
    if (reduced.calculators?.[activeCalculatorId]) {
      // Commit against the reduced state so unlock effects that materialize
      // new calculators are preserved instead of being dropped from the base.
      return commitLegacyProjection(reduced, reduced, activeCalculatorId);
    }
    return reduced;
  }

  if (action.type === "SET_ACTIVE_CALCULATOR" && state.calculators?.[action.calculatorId]) {
    return setActiveCalculator(state, action.calculatorId);
  }

  const targetCalculatorId = resolveActionCalculatorId(state, action);
  if (!targetCalculatorId) {
    return reduceLegacy(state, action, options);
  }

  return reduceWithinTargetCalculatorProjection(state, targetCalculatorId, action, options);
};
