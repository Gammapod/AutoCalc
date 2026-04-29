import { createStore } from "./store.js";
import { createLocalStorageRepo } from "../infra/persistence/localStorageRepo.js";
import { createShellRenderer } from "../ui/renderAdapter.js";
import { resolveUiShellMode } from "./uiShellMode.js";
import { createInteractionRuntime } from "./interactionRuntime.js";
import { createCueLifecycleCoordinator } from "./workflows/cueLifecycle.js";
import { subscribeCueTelemetry } from "./workflows/cueTelemetry.js";
import { createUnlockRevealCoordinator, createUnlockTracker } from "./unlockCueCoordinator.js";
import { resolveBootstrapUiRefs } from "../ui/bootstrap/bootstrapUiRefs.js";
import { createStoreSubscriptionCoordinator } from "./bootstrap/subscriptionCoordinator.js";
import { createAutoStepScheduler } from "./autoStepScheduler.js";
import type { Action, GameState, UiEffect } from "../domain/types.js";
import { resolveAppMode } from "./appMode.js";
import { resolveAppShellTarget } from "./appShellTarget.js";
import { signalQuitApplication } from "./quitSignal.js";
import { setAppServices } from "../contracts/appServices.js";
import { defaultContentProvider } from "../content/defaultContentProvider.js";
import type { AppMode } from "../contracts/appMode.js";
import { awaitMotionSettled } from "../ui/layout/motionLifecycleBridge.js";
import { buildPreDispatchBlockedInputFeedback } from "../domain/inputFeedback.js";
import { createPersistenceSaveScheduler } from "./persistenceSaveScheduler.js";
import { createModeTransitionCoordinator } from "./modeTransitionCoordinator.js";
import { buildBootStateForMode } from "./bootstrap/bootState.js";
import { createModeUiController } from "./bootstrap/uiControllerWiring.js";
import { resolveAppVersionToken } from "../ui/shared/appVersion.js";

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
const saveScheduler = createPersistenceSaveScheduler(storageRepo);
const importMetaEnv = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
const processEnv = (globalThis as { process?: { env?: Record<string, unknown> } }).process?.env;
const initialAppMode = resolveAppMode(window.location, {
  ...processEnv,
  ...importMetaEnv,
});
let currentAppMode = initialAppMode;
const appShellTarget = resolveAppShellTarget(window.location, {
  ...processEnv,
  ...importMetaEnv,
});
const buildBootState = (mode: AppMode): GameState => buildBootStateForMode(mode, storageRepo);

const bootState = buildBootState(initialAppMode);
const store = createStore(bootState, services);
const interactionRuntime = createInteractionRuntime();

type DispatchOptions = {
  internal?: boolean;
};

const ENABLE_CUE_TELEMETRY_DEBUG = false;

const dispatchWithRuntimeGate = (action: Action, options: DispatchOptions = {}): Action => {
  if (!options.internal && interactionRuntime.shouldBlockAction(action)) {
    const blockedFeedback = buildPreDispatchBlockedInputFeedback(store.getState(), action);
    store.enqueueUiEffects([blockedFeedback]);
    return action;
  }
  return store.dispatch(action);
};

const uiShellMode = resolveUiShellMode(window.location, {
  ...processEnv,
  ...importMetaEnv,
});

const shellRenderer = createShellRenderer(root, { mode: uiShellMode, services });
document.body.setAttribute("data-ui-shell", uiShellMode);
document.body.setAttribute("data-app-mode", currentAppMode);
document.body.dataset.appVersion = resolveAppVersionToken({
  ...processEnv,
  ...importMetaEnv,
});

const renderApp = (state: GameState, uiEffects: UiEffect[] = []): void => {
  shellRenderer.render(state, dispatchWithRuntimeGate, {
    inputBlocked: interactionRuntime.isInputBlocked(),
    uiEffects,
  });
};

let uiController: ReturnType<typeof createModeUiController> | null = null;

const redraw = (): void => {
  const state = store.getState();
  renderApp(state, []);
  uiController?.syncUi(state);
};

const renderAndPersistState = (state: GameState, uiEffects: UiEffect[] = []): void => {
  renderApp(state, uiEffects);
  uiController?.syncUi(state);
  if (currentAppMode === "game") {
    saveScheduler.schedule(state);
  }
};

const cueCoordinator = createCueLifecycleCoordinator();
const unlockRevealCoordinator = createUnlockRevealCoordinator({
  cueCoordinator,
  motionSettlement: {
    awaitMotionSettled,
  },
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
  unlockRevealCoordinator,
  renderAndPersistState,
  syncAutoStepScheduler: (state) => {
    autoStepScheduler.sync(state);
  },
  consumeUiEffects: () => store.consumeUiEffects?.() ?? [],
  onQuitApplication: () => {
    signalQuitApplication(appShellTarget);
  },
  onRequestModeTransition: (mode, savePolicy) => {
    modeTransitionCoordinator.requestModeTransition(mode, savePolicy);
  },
  initialState: store.getState(),
});
const syncCurrentMode = (mode: AppMode): void => {
  currentAppMode = mode;
  document.body.setAttribute("data-app-mode", currentAppMode);
  uiController?.dispose();
  uiController = createModeUiController({
    services,
    refs: uiRefs,
    uiShellMode,
    appMode: currentAppMode,
    location: window.location,
    document,
    store,
    storageRepo,
  });
};

const modeTransitionCoordinator = createModeTransitionCoordinator({
  store,
  storageRepo,
  saveScheduler,
  buildBootStateForMode: buildBootState,
  setCurrentMode: syncCurrentMode,
});

syncCurrentMode(currentAppMode);

redraw();
autoStepScheduler.startIfNeeded();

window.__autoCalcBootstrapCleanup__ = () => {
  saveScheduler.flushNow();
  saveScheduler.cancel();
  uiController?.dispose();
  uiController = null;
  unsubscribe();
  autoStepScheduler.dispose();
  unsubscribeCueTelemetry();
  shellRenderer.dispose();
};
