import { createStore } from "./store.js";
import { initialState } from "../domain/state.js";
import { createLocalStorageRepo } from "../infra/persistence/localStorageRepo.js";
import { playProgrammaticKeyPressFeedback } from "../ui/modules/input/pressFeedback.js";
import { createShellRenderer } from "../ui/renderAdapter.js";
import { resolveUiShellMode } from "./uiShellMode.js";
import { createInteractionRuntime } from "./interactionRuntime.js";
import {
  createAutoEqualsScheduler,
} from "./autoEqualsScheduler.js";
import { createCueLifecycleCoordinator } from "./workflows/cueLifecycle.js";
import { subscribeCueTelemetry } from "./workflows/cueTelemetry.js";
import { createAllocatorCueCoordinator, getAllocatorIncreaseFromUnlocks } from "./allocatorCueCoordinator.js";
import { createUnlockRevealCoordinator, createUnlockTracker } from "./unlockCueCoordinator.js";
import { resolveBootstrapUiRefs } from "../ui/bootstrap/bootstrapUiRefs.js";
import { createBootstrapUiController } from "../ui/bootstrap/bootstrapUiController.js";
import { createResetRunHandler, createStoreSubscriptionCoordinator } from "./bootstrap/subscriptionCoordinator.js";
import type { Action, GameState } from "../domain/types.js";
import { resolveAppMode } from "./appMode.js";
import { createSandboxState } from "../domain/sandboxPreset.js";
import { normalizeLoadedStateForRuntime } from "../infra/persistence/runtimeLoadNormalizer.js";
import { setAppServices } from "../contracts/appServices.js";
import { defaultContentProvider } from "../content/defaultContentProvider.js";

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
const loaded = appMode === "game" ? storageRepo.load() : null;
const runtimeLoaded = appMode === "game" ? normalizeLoadedStateForRuntime(loaded) : null;
const bootState = runtimeLoaded ??
  (appMode === "sandbox"
    ? createSandboxState()
    : (() => {
      const fresh = initialState();
      return {
        ...fresh,
        calculator: {
          ...fresh.calculator,
          singleDigitInitialTotalEntry: true,
        },
      };
    })());
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

const autoEqualsScheduler = createAutoEqualsScheduler(store, {
  dispatchAction: (action) => {
    dispatchWithRuntimeGate(action);
  },
  onAutoKeyActivated: (key) => {
    window.requestAnimationFrame(() => {
      playProgrammaticKeyPressFeedback(root, key);
    });
  },
});

const uiShellMode = resolveUiShellMode(window.location, {
  ...processEnv,
  ...importMetaEnv,
});

const shellRenderer = createShellRenderer(root, { mode: uiShellMode, services });
document.body.setAttribute("data-ui-shell", uiShellMode);
document.body.setAttribute("data-app-mode", appMode);

const renderApp = (state: GameState): void => {
  shellRenderer.render(state, dispatchWithRuntimeGate, {
    inputBlocked: interactionRuntime.isInputBlocked(),
  });
};

let uiController: ReturnType<typeof createBootstrapUiController> | null = null;

const redraw = (): void => {
  const state = store.getState();
  renderApp(state);
  uiController?.syncUi(state);
};

const renderAndPersistState = (state: GameState): void => {
  renderApp(state);
  uiController?.syncUi(state);
  if (appMode === "game") {
    storageRepo.save(state);
  }
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

const unsubscribeCueTelemetry =
  ENABLE_CUE_TELEMETRY_DEBUG
    ? subscribeCueTelemetry((event) => {
        console.debug("[cue]", event.cueKind, event.phase, event.durationMs ?? "", event.metadata ?? {});
      })
    : () => {};

const unsubscribe = createStoreSubscriptionCoordinator(store, {
  autoEqualsScheduler,
  unlockTracker,
  allocatorCueCoordinator,
  unlockRevealCoordinator,
  getAllocatorIncreaseFromUnlocks: (previous, latest) => getAllocatorIncreaseFromUnlocks(previous, latest, services),
  renderAndPersistState,
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
  onSetKeypadDimensions: (columns, rows) => {
    store.dispatch({ type: "SET_KEYPAD_DIMENSIONS", columns, rows });
  },
  onUpgradeKeypadRow: () => {
    store.dispatch({ type: "UPGRADE_KEYPAD_ROW" });
  },
  onUpgradeKeypadColumn: () => {
    store.dispatch({ type: "UPGRADE_KEYPAD_COLUMN" });
  },
  onSetAllocatorMaxPoints: (value) => {
    store.dispatch({ type: "ALLOCATOR_SET_MAX_POINTS", value });
  },
  onNavigateToUiShell: (url) => {
    window.location.assign(url);
  },
  onNavigateToAppMode: (url) => {
    window.location.assign(url);
  },
});

redraw();
autoEqualsScheduler.startIfNeeded();

window.__autoCalcBootstrapCleanup__ = () => {
  uiController?.dispose();
  uiController = null;
  unsubscribe();
  unsubscribeCueTelemetry();
  shellRenderer.dispose();
  autoEqualsScheduler.dispose();
};
