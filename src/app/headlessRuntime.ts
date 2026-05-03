import { createStore } from "./store.js";
import { buildBootStateForMode } from "./bootstrap/bootState.js";
import { createModeTransitionCoordinator } from "./modeTransitionCoordinator.js";
import { createPersistenceSaveScheduler } from "./persistenceSaveScheduler.js";
import { defaultContentProvider } from "../content/defaultContentProvider.js";
import { buildReadModel, type DomainReadModel } from "../domain/projections.js";
import { isCalculatorId, projectCalculatorToLegacy, resolveActiveCalculatorId } from "../domain/multiCalculator.js";
import { buildKeyButtonAction } from "../domain/keyActionPolicy.js";
import { isKeyInstalledOnActiveKeypad, resolveKeyCapability } from "../domain/keyUnlocks.js";
import { isExecutionModeActive, listExecutionToggleFlags } from "../domain/executionModePolicy.js";
import { resolveWrapStageMode } from "../domain/executionPlan.js";
import { setAppServices } from "../contracts/appServices.js";
import type { AppMode } from "../contracts/appMode.js";
import type { AppServices } from "../contracts/appServices.js";
import type { Action, CalculatorId, GameState, Key, KeyCell, KeyInput, Store, UiEffect } from "../domain/types.js";

export type HeadlessStorageRepo = {
  load: () => GameState | null;
  save: (state: GameState) => void;
  clear: () => void;
};

export type HeadlessRuntimeOptions = {
  mode?: AppMode;
  services?: AppServices;
  storageRepo?: HeadlessStorageRepo;
  persistGameState?: boolean;
};

export type HeadlessDispatchResult = {
  action: Action;
  mode: AppMode;
  state: GameState;
  readModel: DomainReadModel;
  uiEffects: UiEffect[];
  quitRequested: boolean;
};

export type HeadlessSnapshotOptions = {
  includeState?: boolean;
  calculatorId?: CalculatorId;
};

export type HeadlessSnapshot = {
  mode: AppMode;
  readModel: DomainReadModel;
  uiEffects: UiEffect[];
  diagnostics: GameState["ui"]["diagnostics"];
  settings: GameState["settings"];
  completedUnlockIds: string[];
  executionActive: boolean;
  executionFlags: string[];
  activeCalculatorId?: CalculatorId;
  projectedCalculatorId?: CalculatorId;
  quitRequested: boolean;
  state?: GameState;
};

export const createInMemoryHeadlessStorageRepo = (initialState: GameState | null = null): HeadlessStorageRepo => {
  let state = initialState;
  return {
    load: () => state,
    save: (nextState) => {
      state = nextState;
    },
    clear: () => {
      state = null;
    },
  };
};

const consumeEffects = (store: Store): UiEffect[] => store.consumeUiEffects?.() ?? [];

const projectActiveState = (state: GameState): GameState =>
  projectCalculatorToLegacy(state, resolveActiveCalculatorId(state));

const withCalculatorId = (action: Action, calculatorId?: CalculatorId): Action => {
  if (!calculatorId) {
    return action;
  }
  if (
    action.type === "PRESS_KEY"
    || action.type === "TOGGLE_FLAG"
    || action.type === "TOGGLE_VISUALIZER"
    || action.type === "AUTO_STEP_TICK"
  ) {
    return { ...action, calculatorId } as Action;
  }
  return action;
};

const findInstalledKeypadCell = (state: GameState, key: Key): KeyCell | null => {
  const cell = state.ui.keyLayout.find((entry): entry is KeyCell => entry.kind === "key" && entry.key === key);
  return cell ?? null;
};

const resolvePressAction = (state: GameState, key: Key, calculatorId?: CalculatorId): Action | null => {
  const targetCalculatorId = calculatorId ?? resolveActiveCalculatorId(state);
  const targetState = projectCalculatorToLegacy(state, targetCalculatorId);
  if (!isKeyInstalledOnActiveKeypad(targetState, key)) {
    return null;
  }
  if (resolveKeyCapability(targetState, key) === "locked") {
    return null;
  }
  const cell = findInstalledKeypadCell(targetState, key);
  return cell ? withCalculatorId(buildKeyButtonAction(cell), targetCalculatorId) : null;
};

export const createHeadlessRuntime = (options: HeadlessRuntimeOptions = {}) => {
  const services = options.services ?? { contentProvider: defaultContentProvider };
  const storageRepo = options.storageRepo ?? createInMemoryHeadlessStorageRepo();
  const persistGameState = options.persistGameState ?? true;
  let currentMode = options.mode ?? "game";
  let quitRequested = false;

  setAppServices(services);

  const buildBootState = (mode: AppMode): GameState => buildBootStateForMode(mode, storageRepo);
  const store = createStore(buildBootState(currentMode), services);
  const saveScheduler = createPersistenceSaveScheduler(storageRepo, { debounceMs: 0 });
  const modeTransitionCoordinator = createModeTransitionCoordinator({
    store,
    storageRepo,
    saveScheduler,
    buildBootStateForMode: buildBootState,
    setCurrentMode: (mode) => {
      currentMode = mode;
    },
  });

  const persistIfNeeded = (): void => {
    if (!persistGameState || currentMode !== "game") {
      return;
    }
    saveScheduler.schedule(store.getState());
    saveScheduler.flushNow();
  };

  const handleEffects = (uiEffects: UiEffect[]): UiEffect[] => {
    const collected = [...uiEffects];
    const quitEffect = collected.find((effect): effect is Extract<UiEffect, { type: "quit_application" }> =>
      effect.type === "quit_application");
    if (quitEffect) {
      quitRequested = true;
      return collected;
    }

    const modeTransitionEffect = collected.find((effect): effect is Extract<UiEffect, { type: "request_mode_transition" }> =>
      effect.type === "request_mode_transition");
    if (modeTransitionEffect) {
      modeTransitionCoordinator.requestModeTransition(modeTransitionEffect.targetMode, modeTransitionEffect.savePolicy);
      collected.push(...consumeEffects(store));
      return collected;
    }

    persistIfNeeded();
    return collected;
  };

  const dispatch = (action: Action): HeadlessDispatchResult => {
    store.dispatch(action);
    const uiEffects = handleEffects(consumeEffects(store));
    const state = store.getState();
    const activeState = projectActiveState(state);
    return {
      action,
      mode: currentMode,
      state,
      readModel: buildReadModel(activeState),
      uiEffects,
      quitRequested,
    };
  };

  const rejectedPressResult = (
    key: Key,
    calculatorId: CalculatorId,
    reasonCode: "locked" | "not_installed",
  ): HeadlessDispatchResult => {
    const state = store.getState();
    const activeState = projectActiveState(state);
    return {
      action: { type: "PRESS_KEY", key, calculatorId },
      mode: currentMode,
      state,
      readModel: buildReadModel(activeState),
      uiEffects: [{
        type: "input_feedback",
        calculatorId,
        outcome: "rejected",
        source: "domain_dispatch",
        trigger: "user_action",
        reasonCode,
      }],
      quitRequested,
    };
  };

  const press = (key: KeyInput, calculatorId?: CalculatorId): HeadlessDispatchResult => {
    if (calculatorId && !isCalculatorId(calculatorId)) {
      throw new Error(`invalid_calculator:Unknown calculatorId: ${calculatorId}`);
    }
    const state = store.getState();
    const targetCalculatorId = calculatorId ?? resolveActiveCalculatorId(state);
    const targetState = projectCalculatorToLegacy(state, targetCalculatorId);
    const typedKey = key as Key;
    if (resolveKeyCapability(targetState, typedKey) === "locked") {
      return rejectedPressResult(typedKey, targetCalculatorId, "locked");
    }
    const action = resolvePressAction(state, typedKey, calculatorId);
    if (!action) {
      return rejectedPressResult(typedKey, targetCalculatorId, "not_installed");
    }
    return dispatch(action);
  };

  const snapshot = (snapshotOptions: HeadlessSnapshotOptions = {}): HeadlessSnapshot => {
    const state = store.getState();
    const projectedCalculatorId = snapshotOptions.calculatorId ?? resolveActiveCalculatorId(state);
    if (snapshotOptions.calculatorId && !isCalculatorId(snapshotOptions.calculatorId)) {
      throw new Error(`invalid_calculator:Unknown calculatorId: ${snapshotOptions.calculatorId}`);
    }
    if (snapshotOptions.calculatorId && !state.calculators?.[snapshotOptions.calculatorId]) {
      throw new Error(`invalid_calculator:Unknown calculatorId: ${snapshotOptions.calculatorId}`);
    }
    const activeState = snapshotOptions.calculatorId
      ? projectCalculatorToLegacy(state, snapshotOptions.calculatorId)
      : projectActiveState(state);
    const uiEffects = consumeEffects(store);
    const executionFlags = [...listExecutionToggleFlags(activeState)]
      .filter((flag) => Boolean(activeState.ui.buttonFlags[flag]))
      .sort();
    return {
      mode: currentMode,
      readModel: buildReadModel(activeState),
      uiEffects,
      diagnostics: activeState.ui.diagnostics,
      settings: {
        ...activeState.settings,
        wrapper: resolveWrapStageMode(activeState) ?? "none",
      },
      completedUnlockIds: state.completedUnlockIds,
      executionActive: isExecutionModeActive(activeState),
      executionFlags,
      ...(state.activeCalculatorId ? { activeCalculatorId: state.activeCalculatorId } : {}),
      ...(snapshotOptions.calculatorId && snapshotOptions.calculatorId !== state.activeCalculatorId
        ? { projectedCalculatorId }
        : {}),
      quitRequested,
      ...(snapshotOptions.includeState ? { state } : {}),
    };
  };

  return {
    dispatch,
    press,
    getMode: (): AppMode => currentMode,
    getState: (): GameState => store.getState(),
    getReadModel: (): DomainReadModel => buildReadModel(projectActiveState(store.getState())),
    snapshot,
    dispose: (): void => {
      saveScheduler.flushNow();
      saveScheduler.cancel();
    },
  };
};
