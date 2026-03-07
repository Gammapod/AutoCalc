import { createStore } from "./store.js";
import { initialState, KEYPAD_DIM_MAX, KEYPAD_DIM_MIN } from "../domain/state.js";
import { createLocalStorageRepo } from "../infra/persistence/localStorageRepo.js";
import { unlockCatalog } from "../content/unlocks.catalog.js";
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
import { getLambdaUnusedPoints } from "../domain/lambdaControl.js";
import type { Action, GameState, Key } from "../domain/types.js";

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

const UNLOCK_REVEAL_DURATION_MS = 1200;
const ALLOCATOR_CUE_PRE_APPLY_MS = 480;
const ALLOCATOR_CUE_POST_APPLY_MS = 420;
const ALLOCATOR_RESET_HOLD_MS = 1500;
const ALLOCATOR_RESET_INDICATOR_DELAY_MS = 80;
const ALLOCATOR_RESET_PROGRESS_EXPONENT = 8;

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
    if (!root) {
      return;
    }
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

const redraw = (): void => {
  renderApp(store.getState());
  syncKeypadDimensionInputs();
  syncAllocatorDeviceInputs();
  syncDebugRollState();
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

const getUnusedPoints = (state: GameState): number => {
  return getLambdaUnusedPoints(state.lambdaControl);
};

const syncKeypadDimensionInputs = (): void => {
  const state = store.getState();
  keypadWidthInput.value = state.ui.keypadColumns.toString();
  keypadHeightInput.value = state.ui.keypadRows.toString();
};

const syncAllocatorDeviceInputs = (): void => {
  const state = store.getState();
  debugMaxPointsInput.value = state.lambdaControl.maxPoints.toString();
  if (allocatorResetButton) {
    allocatorResetButton.disabled = interactionRuntime.isInputBlocked();
    allocatorResetButton.textContent = interactionRuntime.getMode() === "calculator" ? "Modify Layout" : "Return";
  }
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

redraw();
autoEqualsScheduler.startIfNeeded();

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

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const moveAllKeysToStorage = (): void => {
  const MAX_RELOCATIONS = 256;
  let relocations = 0;
  while (relocations < MAX_RELOCATIONS) {
    const state = store.getState();
    const keypadIndex = state.ui.keyLayout.findIndex((cell) => cell.kind === "key");
    if (keypadIndex < 0) {
      return;
    }
    const storageIndex = state.ui.storageLayout.findIndex((cell) => cell === null);
    if (storageIndex < 0) {
      return;
    }
    dispatchWithRuntimeGate(
      {
        type: "MOVE_LAYOUT_CELL",
        fromSurface: "keypad",
        fromIndex: keypadIndex,
        toSurface: "storage",
        toIndex: storageIndex,
      },
      { internal: true },
    );
    relocations += 1;
  }
};

const resetForModifyMode = (): void => {
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
};

let modeTransitionInFlight = false;
let unlockRevealInFlight = false;
let allocatorIncreaseCueInFlight = false;

const allocatorIncreaseByUnlockId = new Map(
  unlockCatalog.flatMap((unlock) => {
    if (unlock.effect.type !== "increase_allocator_max_points") {
      return [];
    }
    return [[unlock.id, unlock.effect.amount] as const];
  }),
);

const collectUnlockedKeys = (state: GameState): Set<Key> => {
  const unlocked = new Set<Key>();
  for (const [key, isUnlocked] of Object.entries(state.unlocks.valueAtoms)) {
    if (isUnlocked) {
      unlocked.add(key as Key);
    }
  }
  for (const [key, isUnlocked] of Object.entries(state.unlocks.valueCompose)) {
    if (isUnlocked) {
      unlocked.add(key as Key);
    }
  }
  for (const [key, isUnlocked] of Object.entries(state.unlocks.valueExpression)) {
    if (isUnlocked) {
      unlocked.add(key as Key);
    }
  }
  for (const [key, isUnlocked] of Object.entries(state.unlocks.slotOperators)) {
    if (isUnlocked) {
      unlocked.add(key as Key);
    }
  }
  for (const [key, isUnlocked] of Object.entries(state.unlocks.utilities)) {
    if (isUnlocked) {
      unlocked.add(key as Key);
    }
  }
  for (const [key, isUnlocked] of Object.entries(state.unlocks.memory)) {
    if (isUnlocked) {
      unlocked.add(key as Key);
    }
  }
  for (const [key, isUnlocked] of Object.entries(state.unlocks.steps)) {
    if (isUnlocked) {
      unlocked.add(key as Key);
    }
  }
  for (const [key, isUnlocked] of Object.entries(state.unlocks.visualizers)) {
    if (isUnlocked) {
      unlocked.add(key as Key);
    }
  }
  for (const [key, isUnlocked] of Object.entries(state.unlocks.execution)) {
    if (isUnlocked) {
      unlocked.add(key as Key);
    }
  }
  return unlocked;
};

let knownUnlockedKeys = collectUnlockedKeys(store.getState());

const runUnlockRevealCue = async (stateAtUnlock: GameState): Promise<void> => {
  if (unlockRevealInFlight || modeTransitionInFlight) {
    return;
  }
  unlockRevealInFlight = true;
  interactionRuntime.setInputBlocked(true);
  redraw();
  try {
    if (shellRenderer) {
      await shellRenderer.playTransitionCue("storage");
      shellRenderer.forceActiveView({
        bottomPanelId: "storage",
        includeTransition: true,
      });
    } else {
      await sleep(520);
    }

    renderApp(stateAtUnlock);
    syncKeypadDimensionInputs();
    syncAllocatorDeviceInputs();
    syncDebugRollState();
    storageRepo.save(stateAtUnlock);

    await sleep(UNLOCK_REVEAL_DURATION_MS + 100);
  } finally {
    interactionRuntime.setInputBlocked(false);
    unlockRevealInFlight = false;
    redraw();
  }
};

const runAllocatorIncreaseCue = async (previousUnused: number, nextUnused: number): Promise<void> => {
  if (allocatorIncreaseCueInFlight || modeTransitionInFlight) {
    return;
  }
  allocatorIncreaseCueInFlight = true;
  interactionRuntime.setInputBlocked(true);
  redraw();
  try {
    if (shellRenderer) {
      await shellRenderer.playTransitionCue("storage");
      shellRenderer.forceActiveView({
        bottomPanelId: "storage",
        includeTransition: true,
      });
    } else {
      await sleep(520);
    }
    void previousUnused;
    void nextUnused;
    await sleep(ALLOCATOR_CUE_PRE_APPLY_MS);
    redraw();
    await sleep(ALLOCATOR_CUE_POST_APPLY_MS);
  } finally {
    interactionRuntime.setInputBlocked(false);
    allocatorIncreaseCueInFlight = false;
    redraw();
  }
};

const runModeTransition = async (targetMode: "calculator" | "modify"): Promise<void> => {
  if (modeTransitionInFlight) {
    return;
  }
  modeTransitionInFlight = true;
  interactionRuntime.setInputBlocked(true);
  redraw();
  try {
    if (!shellRenderer || targetMode === "modify") {
      await sleep(520);
    } else {
      await shellRenderer.playTransitionCue("calculator");
    }
    await sleep(500);
    if (targetMode === "modify") {
      resetForModifyMode();
    }
    interactionRuntime.setMode(targetMode);
    redraw();
    if (shellRenderer) {
      if (targetMode === "modify") {
        shellRenderer.forceActiveView({
          snapId: "bottom",
          includeTransition: true,
        });
      } else {
        shellRenderer.forceActiveView({
          snapId: "middle",
          middlePanelId: "calculator",
          includeTransition: true,
        });
      }
    }
    await sleep(240);
  } finally {
    interactionRuntime.setInputBlocked(false);
    modeTransitionInFlight = false;
    redraw();
  }
};

let previousStateForCues = store.getState();
let cueQueue: Promise<void> = Promise.resolve();
const enqueueCue = (runner: () => Promise<void>): void => {
  cueQueue = cueQueue.then(async () => {
    await runner();
  }).catch((error) => {
    console.error("UI cue failed", error);
  });
};

const unsubscribe = store.subscribe((state) => {
  autoEqualsScheduler.sync(state);
  const latest = store.getState();
  const previous = previousStateForCues;
  previousStateForCues = latest;

  const currentUnlockedKeys = collectUnlockedKeys(latest);
  const hasNewUnlock = [...currentUnlockedKeys].some((key) => !knownUnlockedKeys.has(key));
  knownUnlockedKeys = currentUnlockedKeys;

  const previousCompleted = new Set(previous.completedUnlockIds);
  const newlyCompletedUnlockIds = latest.completedUnlockIds.filter((id) => !previousCompleted.has(id));
  const maxPointIncreaseFromUnlocks = newlyCompletedUnlockIds.reduce((sum, unlockId) => {
    return sum + (allocatorIncreaseByUnlockId.get(unlockId) ?? 0);
  }, 0);

  if (!modeTransitionInFlight && (maxPointIncreaseFromUnlocks > 0 || hasNewUnlock)) {
    if (maxPointIncreaseFromUnlocks > 0) {
      enqueueCue(async () => {
        await runAllocatorIncreaseCue(getUnusedPoints(previous), getUnusedPoints(latest));
      });
    }
    if (hasNewUnlock) {
      enqueueCue(async () => {
        await runUnlockRevealCue(latest);
      });
    }
    return;
  }

  renderApp(latest);
  syncKeypadDimensionInputs();
  syncAllocatorDeviceInputs();
  syncDebugRollState();
  storageRepo.save(latest);
});

window.__autoCalcBootstrapCleanup__ = () => {
  stopAllocatorResetHold();
  unsubscribe();
  shellRenderer?.dispose();
  autoEqualsScheduler.dispose();
};

const activateAllocatorReset = async (): Promise<void> => {
  if (interactionRuntime.isInputBlocked()) {
    return;
  }
  if (interactionRuntime.getMode() === "calculator") {
    dispatchWithRuntimeGate(resolveAllocatorModeAction("calculator"));
    await runModeTransition("modify");
    return;
  }
  dispatchWithRuntimeGate(resolveAllocatorModeAction("modify"));
  await runModeTransition("calculator");
};

let allocatorResetHoldTimer: number | null = null;
let allocatorResetIndicatorTimer: number | null = null;
let allocatorResetHoldRaf: number | null = null;
let allocatorResetHolding = false;
let allocatorResetTriggered = false;
let allocatorResetHoldStartedAt = 0;
let allocatorResetKeyboardHold = false;

const clearAllocatorResetHoldVisuals = (): void => {
  allocatorResetButton.classList.remove("allocator-mode-action--holding", "allocator-mode-action--hold-visible");
  allocatorResetButton.style.setProperty("--hold-progress", "0");
};

const updateAllocatorResetHoldProgress = (): void => {
  if (!allocatorResetHolding) {
    return;
  }
  const elapsed = performance.now() - allocatorResetHoldStartedAt;
  const progressWindowMs = ALLOCATOR_RESET_HOLD_MS - ALLOCATOR_RESET_INDICATOR_DELAY_MS;
  const progressElapsed = Math.max(0, elapsed - ALLOCATOR_RESET_INDICATOR_DELAY_MS);
  const linearProgress = Math.max(0, Math.min(1, progressElapsed / progressWindowMs));
  const easedProgress =
    linearProgress <= 0
      ? 0
      : linearProgress >= 1
        ? 1
        : Math.pow(2, ALLOCATOR_RESET_PROGRESS_EXPONENT * (linearProgress - 1));
  allocatorResetButton.style.setProperty("--hold-progress", easedProgress.toFixed(4));
  allocatorResetHoldRaf = window.requestAnimationFrame(updateAllocatorResetHoldProgress);
};

const clearAllocatorResetHoldTimers = (): void => {
  if (allocatorResetHoldTimer !== null) {
    window.clearTimeout(allocatorResetHoldTimer);
    allocatorResetHoldTimer = null;
  }
  if (allocatorResetIndicatorTimer !== null) {
    window.clearTimeout(allocatorResetIndicatorTimer);
    allocatorResetIndicatorTimer = null;
  }
  if (allocatorResetHoldRaf !== null) {
    window.cancelAnimationFrame(allocatorResetHoldRaf);
    allocatorResetHoldRaf = null;
  }
};

const stopAllocatorResetHold = (): void => {
  clearAllocatorResetHoldTimers();
  allocatorResetHolding = false;
  allocatorResetKeyboardHold = false;
  clearAllocatorResetHoldVisuals();
};

const triggerAllocatorResetHold = async (): Promise<void> => {
  if (!allocatorResetHolding || allocatorResetTriggered) {
    return;
  }
  allocatorResetTriggered = true;
  allocatorResetButton.classList.add("allocator-mode-action--hold-visible");
  allocatorResetButton.style.setProperty("--hold-progress", "1");
  stopAllocatorResetHold();
  await activateAllocatorReset();
};

const startAllocatorResetHold = (): void => {
  if (allocatorResetHolding || allocatorResetButton.disabled || interactionRuntime.isInputBlocked()) {
    return;
  }
  allocatorResetHolding = true;
  allocatorResetTriggered = false;
  allocatorResetHoldStartedAt = performance.now();
  allocatorResetButton.classList.add("allocator-mode-action--holding");
  allocatorResetButton.classList.remove("allocator-mode-action--hold-visible");
  allocatorResetButton.style.setProperty("--hold-progress", "0");

  allocatorResetIndicatorTimer = window.setTimeout(() => {
    if (!allocatorResetHolding || allocatorResetTriggered) {
      return;
    }
    allocatorResetButton.classList.add("allocator-mode-action--hold-visible");
  }, ALLOCATOR_RESET_INDICATOR_DELAY_MS);

  allocatorResetHoldTimer = window.setTimeout(() => {
    void triggerAllocatorResetHold();
  }, ALLOCATOR_RESET_HOLD_MS);

  updateAllocatorResetHoldProgress();
};

const cancelAllocatorResetHold = (): void => {
  if (!allocatorResetHolding || allocatorResetTriggered) {
    return;
  }
  stopAllocatorResetHold();
};

allocatorResetButton.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) {
    return;
  }
  startAllocatorResetHold();
});

allocatorResetButton.addEventListener("pointerup", () => {
  cancelAllocatorResetHold();
});

allocatorResetButton.addEventListener("pointercancel", () => {
  cancelAllocatorResetHold();
});

window.addEventListener("pointerup", cancelAllocatorResetHold);
window.addEventListener("pointercancel", cancelAllocatorResetHold);
window.addEventListener("mouseup", cancelAllocatorResetHold);
window.addEventListener("touchend", cancelAllocatorResetHold);
window.addEventListener("touchcancel", cancelAllocatorResetHold);

allocatorResetButton.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }
  if (event.key !== " " && event.key !== "Enter") {
    return;
  }
  event.preventDefault();
  allocatorResetKeyboardHold = true;
  startAllocatorResetHold();
});

allocatorResetButton.addEventListener("keyup", (event) => {
  if (event.key !== " " && event.key !== "Enter") {
    return;
  }
  event.preventDefault();
  if (!allocatorResetKeyboardHold) {
    return;
  }
  cancelAllocatorResetHold();
});

allocatorResetButton.addEventListener("blur", () => {
  cancelAllocatorResetHold();
});

allocatorResetButton.addEventListener(
  "click",
  (event) => {
    // Activation is handled by press-and-hold timing, not click.
    event.preventDefault();
    event.stopImmediatePropagation();
  },
  { capture: true },
);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") {
    cancelAllocatorResetHold();
  }
});

syncDebugUiState();
syncKeypadDimensionInputs();
syncAllocatorDeviceInputs();
syncDebugRollState();




