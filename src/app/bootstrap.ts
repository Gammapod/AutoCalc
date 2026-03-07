import { createStore } from "./store.js";
import { initialState, KEYPAD_DIM_MAX, KEYPAD_DIM_MIN } from "../domain/state.js";
import { createLocalStorageRepo } from "../infra/persistence/localStorageRepo.js";
import { playProgrammaticKeyPressFeedback } from "../ui/modules/programmaticKeyFeedback.js";
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
import { createAllocatorResetHoldController } from "./allocatorResetHoldController.js";
import { createModeTransitionCoordinator } from "./modeTransitionCoordinator.js";
import { createUnlockRevealCoordinator, createUnlockTracker } from "./unlockCueCoordinator.js";
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

const debugToggle = document.querySelector<HTMLInputElement>("[data-debug-toggle]");
const debugMenu = document.querySelector<HTMLElement>("[data-debug-menu]");
const clearSaveButton = document.querySelector<HTMLButtonElement>("[data-debug-clear-save]");
const unlockAllButton = document.querySelector<HTMLButtonElement>("[data-debug-unlock-all]");
const keypadWidthInput = document.querySelector<HTMLInputElement>("[data-debug-keypad-width]");
const keypadHeightInput = document.querySelector<HTMLInputElement>("[data-debug-keypad-height]");
const applyKeypadSizeButton = document.querySelector<HTMLButtonElement>("[data-debug-apply-keypad-size]");
const upgradeKeypadRowButton = document.querySelector<HTMLButtonElement>("[data-debug-upgrade-keypad-row]");
const upgradeKeypadColumnButton = document.querySelector<HTMLButtonElement>("[data-debug-upgrade-keypad-column]");
const debugMaxPointsInput = document.querySelector<HTMLInputElement>("[data-debug-max-points]");
const applyMaxPointsButton = document.querySelector<HTMLButtonElement>("[data-debug-apply-max-points]");
const debugRollStateEl = document.querySelector<HTMLElement>("[data-debug-roll-state]");
const toggleUiShellLink = document.querySelector<HTMLAnchorElement>("[data-debug-toggle-ui-shell]");
const allocatorResetButton = document.querySelector<HTMLButtonElement>("[data-mode-toggle]");

if (
  !debugToggle ||
  !debugMenu ||
  !clearSaveButton ||
  !unlockAllButton ||
  !keypadWidthInput ||
  !keypadHeightInput ||
  !applyKeypadSizeButton ||
  !upgradeKeypadRowButton ||
  !upgradeKeypadColumnButton ||
  !debugMaxPointsInput ||
  !applyMaxPointsButton ||
  !debugRollStateEl ||
  !toggleUiShellLink ||
  !allocatorResetButton
) {
  throw new Error("Required UI controls are missing.");
}

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

const getOppositeUiShellMode = (mode: "mobile" | "desktop"): "mobile" | "desktop" =>
  mode === "mobile" ? "desktop" : "mobile";

const getUiShellToggleUrl = (mode: "mobile" | "desktop"): string => {
  const url = new URL(window.location.href);
  url.searchParams.set("ui", getOppositeUiShellMode(mode));
  return url.toString();
};

const syncUiShellToggleLink = (): void => {
  const targetMode = getOppositeUiShellMode(uiShellMode);
  toggleUiShellLink.textContent = `Switch to ${targetMode === "desktop" ? "Desktop" : "Mobile"} UI`;
  toggleUiShellLink.setAttribute("href", getUiShellToggleUrl(uiShellMode));
};

const shellRenderer = createShellRenderer(root, { mode: uiShellMode });
document.body.setAttribute("data-ui-shell", uiShellMode);
syncUiShellToggleLink();

const renderApp = (state: GameState): void => {
  shellRenderer.render(state, dispatchWithRuntimeGate, {
    interactionMode: interactionRuntime.getMode(),
    inputBlocked: interactionRuntime.isInputBlocked(),
  });
};

const syncDebugUiState = (): void => {
  const isOpen = debugToggle.checked;
  debugMenu.hidden = !isOpen;
  document.body.setAttribute("data-debug-menu-open", isOpen ? "true" : "false");
};

const clampDimensionInput = (value: number, fallback: number): number => {
  if (!Number.isInteger(value)) {
    return fallback;
  }
  return Math.max(KEYPAD_DIM_MIN, Math.min(KEYPAD_DIM_MAX, value));
};

const clampNonNegativeInteger = (value: number, fallback: number): number => {
  if (!Number.isInteger(value)) {
    return fallback;
  }
  return Math.max(0, value);
};

const syncKeypadDimensionInputs = (): void => {
  const state = store.getState();
  keypadWidthInput.value = state.ui.keypadColumns.toString();
  keypadHeightInput.value = state.ui.keypadRows.toString();
};

const syncAllocatorDeviceInputs = (): void => {
  const state = store.getState();
  debugMaxPointsInput.value = state.lambdaControl.maxPoints.toString();
  allocatorResetButton.disabled = interactionRuntime.isInputBlocked();
  allocatorResetButton.textContent = interactionRuntime.getMode() === "calculator" ? "Modify Layout" : "Return";
};

const serializeRationalForDebug = (value: { num: bigint; den: bigint }): { num: string; den: string } => ({
  num: value.num.toString(),
  den: value.den.toString(),
});

const syncDebugRollState = (): void => {
  const state = store.getState();
  const serializedRollState = state.calculator.rollEntries.map((entry, index) => ({
    x: index,
    y: entry.y.kind === "nan" ? { kind: "nan" as const } : { kind: "rational" as const, value: serializeRationalForDebug(entry.y.value) },
    ...(entry.remainder ? { remainder: serializeRationalForDebug(entry.remainder) } : {}),
    ...(entry.error ? { error: entry.error } : {}),
  }));
  debugRollStateEl.textContent = JSON.stringify(serializedRollState, null, 2);
};

const redraw = (): void => {
  renderApp(store.getState());
  syncKeypadDimensionInputs();
  syncAllocatorDeviceInputs();
  syncDebugRollState();
};

const renderAndPersistState = (state: GameState): void => {
  renderApp(state);
  syncKeypadDimensionInputs();
  syncAllocatorDeviceInputs();
  syncDebugRollState();
  storageRepo.save(state);
};

redraw();
autoEqualsScheduler.startIfNeeded();

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

const allocatorResetHoldController = createAllocatorResetHoldController({
  button: allocatorResetButton,
  isInputBlocked: () => interactionRuntime.isInputBlocked(),
  onActivated: activateAllocatorReset,
});

window.__autoCalcBootstrapCleanup__ = () => {
  allocatorResetHoldController.dispose();
  unsubscribe();
  unsubscribeCueTelemetry();
  shellRenderer.dispose();
  autoEqualsScheduler.dispose();
};

debugToggle.addEventListener("change", () => {
  syncDebugUiState();
});

clearSaveButton.addEventListener("click", () => {
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
});

unlockAllButton.addEventListener("click", () => {
  store.dispatch({ type: "UNLOCK_ALL" });
});

applyKeypadSizeButton.addEventListener("click", () => {
  const state = store.getState();
  const columns = clampDimensionInput(Number(keypadWidthInput.value), state.ui.keypadColumns);
  const rows = clampDimensionInput(Number(keypadHeightInput.value), state.ui.keypadRows);
  store.dispatch({ type: "SET_KEYPAD_DIMENSIONS", columns, rows });
});

upgradeKeypadRowButton.addEventListener("click", () => {
  store.dispatch({ type: "UPGRADE_KEYPAD_ROW" });
});

upgradeKeypadColumnButton.addEventListener("click", () => {
  store.dispatch({ type: "UPGRADE_KEYPAD_COLUMN" });
});

applyMaxPointsButton.addEventListener("click", () => {
  const state = store.getState();
  const value = clampNonNegativeInteger(Number(debugMaxPointsInput.value), state.lambdaControl.maxPoints);
  store.dispatch({ type: "ALLOCATOR_SET_MAX_POINTS", value });
});

toggleUiShellLink.addEventListener("click", (event) => {
  event.preventDefault();
  window.location.assign(getUiShellToggleUrl(uiShellMode));
});

syncDebugUiState();
syncKeypadDimensionInputs();
syncAllocatorDeviceInputs();
syncDebugRollState();
