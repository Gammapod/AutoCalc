import { createStore } from "./store.js";
import { initialState } from "../domain/state.js";
import { createLocalStorageRepo } from "../infra/persistence/localStorageRepo.js";
import { createShellRenderer } from "../ui/renderAdapter.js";
import { resolveUiShellMode } from "./uiShellMode.js";
import { createInteractionRuntime } from "./interactionRuntime.js";
import { createCueLifecycleCoordinator } from "./workflows/cueLifecycle.js";
import { subscribeCueTelemetry } from "./workflows/cueTelemetry.js";
import { createAllocatorCueCoordinator, getAllocatorIncreaseFromUnlocks } from "./allocatorCueCoordinator.js";
import { createUnlockRevealCoordinator, createUnlockTracker } from "./unlockCueCoordinator.js";
import { resolveBootstrapUiRefs } from "../ui/bootstrap/bootstrapUiRefs.js";
import { createBootstrapUiController } from "../ui/bootstrap/bootstrapUiController.js";
import { createResetRunHandler, createStoreSubscriptionCoordinator } from "./bootstrap/subscriptionCoordinator.js";
import { createAutoStepScheduler } from "./autoStepScheduler.js";
import type { Action, GameState, UiEffect } from "../domain/types.js";
import { resolveAppMode } from "./appMode.js";
import { resolveAppShellTarget } from "./appShellTarget.js";
import { signalQuitApplication } from "./quitSignal.js";
import { createSandboxState } from "../domain/sandboxPreset.js";
import { createMainMenuState } from "../domain/mainMenuPreset.js";
import { normalizeLoadedStateForRuntime } from "../infra/persistence/runtimeLoadNormalizer.js";
import { setAppServices } from "../contracts/appServices.js";
import { defaultContentProvider } from "../content/defaultContentProvider.js";
import type { AppMode } from "../contracts/appMode.js";
import { resolveModeManifest } from "../domain/modeManifest.js";
import { APP_VERSION } from "../generated/appVersion.js";

declare global {
  type KatexRenderOptions = {
    displayMode?: boolean;
    throwOnError?: boolean;
  };

  type KatexApi = {
    render: (expression: string, element: HTMLElement, options?: KatexRenderOptions) => void;
  };

  interface Window {
    __autoCalcBootstrapCleanup__?: () => void;
    katex?: KatexApi;
  }
}

if (window.__autoCalcBootstrapCleanup__) {
  window.__autoCalcBootstrapCleanup__();
  delete window.__autoCalcBootstrapCleanup__;
}

const root = document.querySelector("#app");
if (!root) {
  throw new Error("#app root not found.");
}
const services = { contentProvider: defaultContentProvider };
setAppServices(services);
const uiRefs = resolveBootstrapUiRefs(document);

const storageRepo = createLocalStorageRepo(window.localStorage);
const importMetaEnv = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
const processEnv = (globalThis as { process?: { env?: Record<string, unknown> } }).process?.env;
const appMode = resolveAppMode(window.location, {
  ...processEnv,
  ...importMetaEnv,
});
const appShellTarget = resolveAppShellTarget(window.location, {
  ...processEnv,
  ...importMetaEnv,
});
const loaded = appMode === "game" ? storageRepo.load() : null;
const runtimeLoaded = appMode === "game" ? normalizeLoadedStateForRuntime(loaded) : null;
const createFreshGameState = (): GameState => {
  const fresh = initialState();
  return {
    ...fresh,
    calculator: {
      ...fresh.calculator,
      singleDigitInitialTotalEntry: true,
    },
  };
};
const modeManifest = resolveModeManifest(appMode);
const bootStateBase = runtimeLoaded ?? modeManifest.createBootState({
  createFreshGameState,
  createSandboxState,
  createMainMenuState,
});
const bootState: GameState = {
  ...bootStateBase,
  ui: {
    ...bootStateBase.ui,
    buttonFlags: {
      ...bootStateBase.ui.buttonFlags,
      ...modeManifest.modeButtonFlags,
    },
  },
};
const store = createStore(bootState, services);
const interactionRuntime = createInteractionRuntime();

type DispatchOptions = {
  internal?: boolean;
};

const ENABLE_CUE_TELEMETRY_DEBUG = false;

const dispatchWithRuntimeGate = (action: Action, options: DispatchOptions = {}): Action => {
  if (!options.internal && interactionRuntime.shouldBlockAction(action)) {
    return action;
  }
  return store.dispatch(action);
};

const uiShellMode = resolveUiShellMode(window.location, {
  ...processEnv,
  ...importMetaEnv,
});

const resolveAppVersionToken = (): string => {
  const importMetaVersion = importMetaEnv?.APP_VERSION;
  if (typeof importMetaVersion === "string" && importMetaVersion.trim()) {
    return importMetaVersion.trim();
  }
  const processVersion = processEnv?.npm_package_version;
  if (typeof processVersion === "string" && processVersion.trim()) {
    return processVersion.trim();
  }
  return APP_VERSION;
};

const shellRenderer = createShellRenderer(root, { mode: uiShellMode, services });
document.body.setAttribute("data-ui-shell", uiShellMode);
document.body.setAttribute("data-app-mode", appMode);
document.body.dataset.appVersion = resolveAppVersionToken();

const renderApp = (state: GameState, uiEffects: UiEffect[] = []): void => {
  shellRenderer.render(state, dispatchWithRuntimeGate, {
    inputBlocked: interactionRuntime.isInputBlocked(),
    uiEffects,
  });
};

let uiController: ReturnType<typeof createBootstrapUiController> | null = null;

const redraw = (): void => {
  const state = store.getState();
  renderApp(state, []);
  uiController?.syncUi(state);
};

const renderAndPersistState = (state: GameState, uiEffects: UiEffect[] = []): void => {
  renderApp(state, uiEffects);
  uiController?.syncUi(state);
  if (appMode === "game") {
    storageRepo.save(state);
  }
};

const getAppModeUrl = (location: Location, mode: AppMode): string => {
  const url = new URL(location.href);
  url.searchParams.set("mode", mode);
  return url.toString();
};

const cueCoordinator = createCueLifecycleCoordinator();
const unlockRevealCoordinator = createUnlockRevealCoordinator({
  cueCoordinator,
  playShellCue: async (target) => {
    await shellRenderer.playTransitionCue(target);
  },
  setInputBlocked: (blocked) => {
    interactionRuntime.setInputBlocked(blocked);
  },
  redraw,
  renderAndPersistState,
  focusStoragePanel: () => {
    shellRenderer.forceActiveView({
      bottomPanelId: "storage",
      includeTransition: true,
    });
  },
});

const allocatorCueCoordinator = createAllocatorCueCoordinator({
  services,
  cueCoordinator,
  playShellCue: async (target) => {
    await shellRenderer.playTransitionCue(target);
  },
  setInputBlocked: (blocked) => {
    interactionRuntime.setInputBlocked(blocked);
  },
  redraw,
  focusStoragePanel: () => {
    shellRenderer.forceActiveView({
      bottomPanelId: "storage",
      includeTransition: true,
    });
  },
});

const unlockTracker = createUnlockTracker(store.getState());
const autoStepScheduler = createAutoStepScheduler(store);

const unsubscribeCueTelemetry =
  ENABLE_CUE_TELEMETRY_DEBUG
    ? subscribeCueTelemetry((event) => {
        console.debug("[cue]", event.cueKind, event.phase, event.durationMs ?? "", event.metadata ?? {});
      })
    : () => {};

const unsubscribe = createStoreSubscriptionCoordinator(store, {
  unlockTracker,
  allocatorCueCoordinator,
  unlockRevealCoordinator,
  getAllocatorIncreaseFromUnlocks: (previous, latest) => getAllocatorIncreaseFromUnlocks(previous, latest, services),
  renderAndPersistState,
  syncAutoStepScheduler: (state) => {
    autoStepScheduler.sync(state);
  },
  consumeUiEffects: () => store.consumeUiEffects?.() ?? [],
  onQuitApplication: () => {
    signalQuitApplication(appShellTarget);
  },
  onRequestModeTransition: (mode, savePolicy) => {
    if (savePolicy === "save_current") {
      storageRepo.save(store.getState());
    }
    if (savePolicy === "clear_save") {
      storageRepo.clear();
    }
    window.location.assign(getAppModeUrl(window.location, mode));
  },
  initialState: store.getState(),
});

uiController = createBootstrapUiController({
  services,
  refs: uiRefs,
  uiShellMode,
  appMode,
  location: window.location,
  document,
  getState: () => store.getState(),
  onResetRun: appMode === "sandbox"
    ? () => {
      store.dispatch({ type: "HYDRATE_SAVE", state: createSandboxState() });
    }
    : createResetRunHandler(store, storageRepo),
  onUnlockAll: () => {
    store.dispatch({ type: "UNLOCK_ALL" });
  },
  onSetKeypadDimensions: (calculatorId, columns, rows) => {
    store.dispatch({ type: "SET_KEYPAD_DIMENSIONS", calculatorId, columns, rows });
  },
  onUpgradeKeypadRow: (calculatorId) => {
    store.dispatch({ type: "UPGRADE_KEYPAD_ROW", calculatorId });
  },
  onUpgradeKeypadColumn: (calculatorId) => {
    store.dispatch({ type: "UPGRADE_KEYPAD_COLUMN", calculatorId });
  },
  onSetAllocatorMaxPoints: (calculatorId, value) => {
    store.dispatch({ type: "ALLOCATOR_SET_MAX_POINTS", calculatorId, value });
  },
  onAddAllocatorMaxPoints: (calculatorId, amount) => {
    store.dispatch({ type: "ALLOCATOR_ADD_MAX_POINTS", calculatorId, amount });
  },
  onSetSessionControlEquations: (calculatorId, equations) => {
    store.dispatch({ type: "SET_SESSION_CONTROL_EQUATIONS", calculatorId, equations });
  },
  onSetActiveCalculator: (calculatorId) => {
    store.dispatch({ type: "SET_ACTIVE_CALCULATOR", calculatorId });
  },
  onNavigateToUiShell: (url) => {
    window.location.assign(url);
  },
  onNavigateToAppMode: (url) => {
    window.location.assign(url);
  },
});

redraw();
autoStepScheduler.startIfNeeded();

window.__autoCalcBootstrapCleanup__ = () => {
  uiController?.dispose();
  uiController = null;
  unsubscribe();
  autoStepScheduler.dispose();
  unsubscribeCueTelemetry();
  shellRenderer.dispose();
};
