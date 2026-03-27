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
import { resetRunState, withStepProgressCleared } from "./reducer.stateBuilders.js";
import { applyUnlocks } from "./unlocks.js";
import { KEY_ID } from "./keyPresentation.js";
import { isBinaryOperatorKeyId, isUnaryOperatorId } from "./keyPresentation.js";
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
import { handleAutoStepTick, handleEqualsInput } from "./reducer.input.handlers.execution.js";
import { EXECUTION_PAUSE_EQUALS_FLAG } from "./state.js";
import type {
  Action,
  CalculatorId,
  GameState,
  Key,
  LayoutSurface,
  SlotOperator,
  UiDiagnosticsLastActionKind,
  VisualizerId,
} from "./types.js";
import { getAppServices, type AppServices } from "../contracts/appServices.js";
import { buttonRegistry } from "./buttonRegistry.js";
import { applySettingsSelection } from "./settings.js";
// Root reducer orchestrator: route actions to focused domain reducers.

const visualizerKeyById = new Map<VisualizerId, Key>(
  buttonRegistry
    .filter((entry): entry is typeof buttonRegistry[number] & { visualizerId: VisualizerId } =>
      entry.behaviorKind === "visualizer" && typeof entry.visualizerId === "string")
    .map((entry) => [entry.visualizerId, entry.key]),
);

const stableSignature = (value: unknown): string => {
  const seen = new WeakSet<object>();
  const walk = (input: unknown): unknown => {
    if (typeof input === "bigint") {
      return { __bigint: input.toString() };
    }
    if (Array.isArray(input)) {
      return input.map((entry) => walk(entry));
    }
    if (input && typeof input === "object") {
      if (seen.has(input as object)) {
        return "[Circular]";
      }
      seen.add(input as object);
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(input as Record<string, unknown>).sort()) {
        out[key] = walk((input as Record<string, unknown>)[key]);
      }
      return out;
    }
    return input;
  };
  return JSON.stringify(walk(value));
};

const toDiagnosticsComparableState = (state: GameState): unknown => ({
  ...state,
  ui: {
    ...state.ui,
    diagnostics: undefined,
  },
  calculators: state.calculators
    ? Object.fromEntries(
      Object.entries(state.calculators).map(([id, calculator]) => [
        id,
        calculator
          ? {
              ...calculator,
              ui: {
                ...calculator.ui,
                diagnostics: undefined,
              },
            }
          : calculator,
      ]),
    )
    : state.calculators,
});

const isSystemKey = (key: Key): boolean => key.startsWith("system_");
const isExecutionKey = (key: Key): boolean => key.startsWith("exec_");

const resolveActionKind = (action: Action): UiDiagnosticsLastActionKind => {
  if (action.type === "PRESS_KEY") {
    if (isSystemKey(action.key)) {
      return "system_action";
    }
    if (isExecutionKey(action.key)) {
      return "execution_action";
    }
    return "press_key";
  }
  if (action.type === "TOGGLE_VISUALIZER") {
    return "toggle_visualizer";
  }
  if (action.type === "TOGGLE_FLAG") {
    return "toggle_flag";
  }
  if (action.type === "AUTO_STEP_TICK") {
    return "execution_action";
  }
  return "system_action";
};

const resolveOperatorFromAction = (action: Action): SlotOperator | undefined => {
  if (action.type !== "PRESS_KEY") {
    return undefined;
  }
  if (isBinaryOperatorKeyId(action.key) || isUnaryOperatorId(action.key)) {
    return action.key;
  }
  return undefined;
};

const resolveKeyFromAction = (action: Action): Key | undefined => {
  if (action.type === "PRESS_KEY") {
    return action.key;
  }
  if (action.type === "TOGGLE_VISUALIZER") {
    return visualizerKeyById.get(action.visualizer);
  }
  return undefined;
};

const withRecordedDiagnosticsAction = (
  previous: GameState,
  next: GameState,
  action: Action,
): GameState => {
  if (action.type === "HYDRATE_SAVE") {
    return next;
  }
  const policy = resolveExecutionPolicyForAction(previous, action);
  if (policy.decision.decision === "reject") {
    return next;
  }
  const previousLastAction = previous.ui.diagnostics.lastAction;
  const actionKind = resolveActionKind(action);
  const keyId = resolveKeyFromAction(action);
  const operatorId = resolveOperatorFromAction(action);
  const noEffect = stableSignature(toDiagnosticsComparableState(previous)) === stableSignature(toDiagnosticsComparableState(next));
  if (noEffect) {
    return next;
  }
  const visualizerToggled = action.type === "TOGGLE_VISUALIZER" && previous.settings.visualizer !== next.settings.visualizer;

  const lastActionTrace: GameState["ui"]["diagnostics"]["lastAction"] = {
    sequence: previousLastAction.sequence + 1,
    actionKind,
    ...(keyId ? { keyId } : {}),
    ...(operatorId ? { operatorId } : {}),
    ...(visualizerToggled ? { visualizerToggled: true } : {}),
  };

  const uiWithDiagnostics: GameState["ui"] = {
    ...next.ui,
    diagnostics: {
      lastAction: lastActionTrace,
    },
  };

  let calculators = next.calculators;
  const patchCalculatorUi = (calculatorId: CalculatorId | undefined): void => {
    if (!calculatorId || !calculators?.[calculatorId]) {
      return;
    }
    const instance = calculators[calculatorId];
    if (!instance) {
      return;
    }
    if (instance.ui.diagnostics.lastAction.sequence === lastActionTrace.sequence && instance.ui === uiWithDiagnostics) {
      return;
    }
    calculators = {
      ...calculators,
      [calculatorId]: {
        ...instance,
        ui: {
          ...instance.ui,
          diagnostics: {
            lastAction: lastActionTrace,
          },
        },
      },
    };
  };

  patchCalculatorUi(next.activeCalculatorId);
  if ("calculatorId" in action && action.calculatorId) {
    patchCalculatorUi(action.calculatorId);
  }

  return {
    ...next,
    ui: uiWithDiagnostics,
    ...(calculators ? { calculators } : {}),
  };
};

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

type ReducerOptions = {
  services?: AppServices;
};

type ResolvedExecutionPolicy = {
  decision: ExecutionPolicyResult;
  calculatorId: CalculatorId;
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
      // Use the reduced state as commit base so newly materialized calculators
      // (for example unlock-calculator effects) are not dropped.
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
  const withTrace = withRecordedDiagnosticsAction(state, nextState, action);
  return normalizeRuntimeStateInvariants(withTrace);
};

