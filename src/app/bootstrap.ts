import { createStore } from "./store.js";
import { initialState } from "../domain/state.js";
import { createLocalStorageRepo } from "../infra/persistence/localStorageRepo.js";
import { playProgrammaticKeyPressFeedback } from "../ui/modules/input/pressFeedback.js";
import { createShellRenderer } from "../ui/renderAdapter.js";
import { resolveUiShellMode } from "./uiShellMode.js";
import { createResetCalculatorState } from "../domain/reducer.stateBuilders.js";
import { createInteractionRuntime } from "./interactionRuntime.js";
import { resolveAllocatorModeAction } from "./allocatorModeAction.js";
import {
  createAutoEqualsScheduler,
  normalizeLoadedStateForRuntime,
} from "./autoEqualsScheduler.js";
import { createCueLifecycleCoordinator } from "../ui/layout/cueLifecycle.js";
import { subscribeCueTelemetry } from "../ui/layout/cueTelemetry.js";
import { createAllocatorCueCoordinator, getAllocatorIncreaseFromUnlocks } from "./allocatorCueCoordinator.js";
import { createModeTransitionCoordinator } from "./modeTransitionCoordinator.js";
import { createUnlockRevealCoordinator, createUnlockTracker } from "./unlockCueCoordinator.js";
import { resolveBootstrapUiRefs } from "./ui/bootstrapUiRefs.js";
import { createBootstrapUiController } from "./ui/bootstrapUiController.js";
import type { Action, GameState } from "../domain/types.js";

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
const uiRefs = resolveBootstrapUiRefs(document);

const storageRepo = createLocalStorageRepo(window.localStorage);
const loaded = storageRepo.load();
const runtimeLoaded = normalizeLoadedStateForRuntime(loaded);
const bootState =
  runtimeLoaded ??
  (() => {
    const fresh = initialState();
    return {
      ...fresh,
      calculator: {
        ...fresh.calculator,
        singleDigitInitialTotalEntry: true,
      },
    };
  })();
const store = createStore(bootState);
const interactionRuntime = createInteractionRuntime("calculator");

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

const importMetaEnv = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
const processEnv = (globalThis as { process?: { env?: Record<string, unknown> } }).process?.env;
const uiShellMode = resolveUiShellMode(window.location, {
  ...processEnv,
  ...importMetaEnv,
});

const shellRenderer = createShellRenderer(root, { mode: uiShellMode });
document.body.setAttribute("data-ui-shell", uiShellMode);

const renderApp = (state: GameState): void => {
  shellRenderer.render(state, dispatchWithRuntimeGate, {
    interactionMode: interactionRuntime.getMode(),
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
  storageRepo.save(state);
};

const cueCoordinator = createCueLifecycleCoordinator();
const modeTransitionCoordinator = createModeTransitionCoordinator({
  cueCoordinator,
  playShellCue: async (target) => {
    await shellRenderer.playTransitionCue(target);
  },
  setInputBlocked: (blocked) => {
    interactionRuntime.setInputBlocked(blocked);
  },
  redraw,
  setMode: (mode) => {
    interactionRuntime.setMode(mode);
  },
  resetForModifyMode: () => {
    const state = store.getState();
    dispatchWithRuntimeGate(
      {
        type: "HYDRATE_SAVE",
        state: {
          ...state,
          calculator: createResetCalculatorState(),
        },
      },
      { internal: true },
    );
  },
  focusModifyMode: () => {
    shellRenderer.forceActiveView({
      snapId: "bottom",
      includeTransition: true,
    });
  },
  focusCalculatorMode: () => {
    shellRenderer.forceActiveView({
      snapId: "middle",
      middlePanelId: "calculator",
      includeTransition: true,
    });
  },
});

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

let previousStateForCues = store.getState();

const unsubscribe = store.subscribe((state) => {
  autoEqualsScheduler.sync(state);
  const latest = store.getState();
  const previous = previousStateForCues;
  previousStateForCues = latest;

  const hasNewUnlock = unlockTracker.hasNewUnlock(latest);
  const maxPointIncreaseFromUnlocks = getAllocatorIncreaseFromUnlocks(previous, latest);

  if (!modeTransitionCoordinator.isModeTransitionInFlight() && (maxPointIncreaseFromUnlocks > 0 || hasNewUnlock)) {
    if (maxPointIncreaseFromUnlocks > 0) {
      void (async () => {
        await allocatorCueCoordinator.runAllocatorIncreaseCue();
      })();
    }
    if (hasNewUnlock) {
      void (async () => {
        await unlockRevealCoordinator.runUnlockRevealCue(latest);
      })();
    }
    return;
  }

  renderAndPersistState(latest);
});

const activateAllocatorReset = async (): Promise<void> => {
  if (interactionRuntime.isInputBlocked()) {
    return;
  }
  if (interactionRuntime.getMode() === "calculator") {
    dispatchWithRuntimeGate(resolveAllocatorModeAction("calculator"));
    await modeTransitionCoordinator.runModeTransition("modify");
    return;
  }
  dispatchWithRuntimeGate(resolveAllocatorModeAction("modify"));
  await modeTransitionCoordinator.runModeTransition("calculator");
};

uiController = createBootstrapUiController({
  refs: uiRefs,
  uiShellMode,
  location: window.location,
  document,
  getState: () => store.getState(),
  isInputBlocked: () => interactionRuntime.isInputBlocked(),
  getInteractionMode: () => interactionRuntime.getMode(),
  onAllocatorModeActivate: activateAllocatorReset,
  onResetRun: () => {
    store.dispatch({ type: "RESET_RUN" });
    const reset = store.getState();
    store.dispatch({
      type: "HYDRATE_SAVE",
      state: {
        ...reset,
        calculator: {
          ...reset.calculator,
          singleDigitInitialTotalEntry: true,
        },
      },
    });
    storageRepo.clear();
  },
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
