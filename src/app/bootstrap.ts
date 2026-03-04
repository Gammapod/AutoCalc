import { createStore } from "./store.js";
import { initialState, KEYPAD_DIM_MAX, KEYPAD_DIM_MIN } from "../domain/state.js";
import { createLocalStorageRepo } from "../infra/persistence/localStorageRepo.js";
import { unlockCatalog } from "../content/unlocks.catalog.js";
import { render } from "../ui/render.js";
import { createShellRenderer } from "../../src_v2/ui/renderAdapter.js";
import { resolveUiShellMode } from "./uiShellMode.js";
import { createResetCalculatorState } from "../domain/reducer.stateBuilders.js";
import { createInteractionRuntime } from "./interactionRuntime.js";
import {
  AUTO_EQUALS_POINT_BONUS,
  createAutoEqualsScheduler,
  normalizeLoadedStateForRuntime,
} from "./autoEqualsScheduler.js";
import { analyzeNumberDomains } from "../domain/analysis.js";
import { formatNumberDomainReport } from "./analysisReport.js";
import type { Action, AllocatorAllocationField, GameState, Key } from "../domain/types.js";

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
const runAnalysisButton = document.querySelector<HTMLButtonElement>("[data-debug-run-analysis]");
const analysisAllUnlockedCheckbox = document.querySelector<HTMLInputElement>("[data-debug-analysis-all-unlocked]");
const analysisReportEl = document.querySelector<HTMLElement>("[data-debug-analysis-report]");
const allocatorDeviceEl = document.querySelector<HTMLElement>("[data-allocator-device]");

const allocatorUnusedEl = document.querySelector<HTMLElement>("[data-allocator-unused]");
const allocatorWidthValueEl = document.querySelector<HTMLElement>("[data-allocator-width]");
const allocatorHeightValueEl = document.querySelector<HTMLElement>("[data-allocator-height]");
const allocatorRangeValueEl = document.querySelector<HTMLElement>("[data-allocator-range]");
const allocatorSpeedValueEl = document.querySelector<HTMLElement>("[data-allocator-speed]");
const allocatorSlotsValueEl = document.querySelector<HTMLElement>("[data-allocator-slots]");
const allocatorEffectiveWidthEl = document.querySelector<HTMLElement>("[data-allocator-effective-width]");
const allocatorEffectiveHeightEl = document.querySelector<HTMLElement>("[data-allocator-effective-height]");
const allocatorEffectiveRangeEl = document.querySelector<HTMLElement>("[data-allocator-effective-range]");
const allocatorEffectiveSpeedEl = document.querySelector<HTMLElement>("[data-allocator-effective-speed]");
const allocatorEffectiveSlotsEl = document.querySelector<HTMLElement>("[data-allocator-effective-slots]");
const allocatorIncWidthButton = document.querySelector<HTMLButtonElement>("[data-allocator-inc-width]");
const allocatorIncHeightButton = document.querySelector<HTMLButtonElement>("[data-allocator-inc-height]");
const allocatorIncRangeButton = document.querySelector<HTMLButtonElement>("[data-allocator-inc-range]");
const allocatorIncSpeedButton = document.querySelector<HTMLButtonElement>("[data-allocator-inc-speed]");
const allocatorIncSlotsButton = document.querySelector<HTMLButtonElement>("[data-allocator-inc-slots]");
const allocatorResetButton = document.querySelector<HTMLButtonElement>("[data-allocator-reset]");
const allocatorSpeedLabelEl = document.querySelector<HTMLElement>("[data-allocator-speed-label]");
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
  !runAnalysisButton ||
  !analysisAllUnlockedCheckbox ||
  !analysisReportEl ||
  !allocatorDeviceEl ||
  !allocatorUnusedEl ||
  !allocatorWidthValueEl ||
  !allocatorHeightValueEl ||
  !allocatorRangeValueEl ||
  !allocatorSpeedValueEl ||
  !allocatorSlotsValueEl ||
  !allocatorEffectiveWidthEl ||
  !allocatorEffectiveHeightEl ||
  !allocatorEffectiveRangeEl ||
  !allocatorEffectiveSpeedEl ||
  !allocatorEffectiveSlotsEl ||
  !allocatorIncWidthButton ||
  !allocatorIncHeightButton ||
  !allocatorIncRangeButton ||
  !allocatorIncSpeedButton ||
  !allocatorIncSlotsButton ||
  !allocatorResetButton ||
  !allocatorSpeedLabelEl
) {
  throw new Error("Required UI controls are missing.");
}

const renderAllocatorSpeedLabel = (): void => {
  const katexApi = window.katex;
  if (!katexApi) {
    allocatorSpeedLabelEl.textContent = "\u0394T/1.05\u1d57, t=";
    return;
  }
  try {
    katexApi.render(String.raw`\Delta T / 1.05^{t},\ t=`, allocatorSpeedLabelEl, {
      displayMode: false,
      throwOnError: false,
    });
    allocatorSpeedLabelEl.setAttribute("aria-label", "delta t over 1.05 to the t, t equals");
  } catch {
    allocatorSpeedLabelEl.textContent = "\u0394T/1.05\u1d57, t=";
  }
};

const SEGMENT_NAMES = ["a", "b", "c", "d", "e", "f", "g"] as const;
type SegmentName = (typeof SEGMENT_NAMES)[number];

const DIGIT_SEGMENTS: Record<string, readonly SegmentName[]> = {
  "0": ["a", "b", "c", "d", "e", "f"],
  "1": ["b", "c"],
  "2": ["a", "b", "d", "e", "g"],
  "3": ["a", "b", "c", "d", "g"],
  "4": ["b", "c", "f", "g"],
  "5": ["a", "c", "d", "f", "g"],
  "6": ["a", "c", "d", "e", "f", "g"],
  "7": ["a", "b", "c"],
  "8": ["a", "b", "c", "d", "e", "f", "g"],
  "9": ["a", "b", "c", "d", "f", "g"],
};

const renderAllocatorDisplay = (target: HTMLElement, value: number): void => {
  const text = Math.max(0, Math.trunc(value)).toString();
  target.innerHTML = "";
  const frame = document.createElement("div");
  frame.className = "allocator-seg-frame";
  for (const char of text) {
    const digit = document.createElement("div");
    digit.className = "seg-digit allocator-seg-digit";
    const activeSegments = DIGIT_SEGMENTS[char] ?? [];
    for (const segmentName of SEGMENT_NAMES) {
      const segment = document.createElement("div");
      segment.className = `seg allocator-seg seg-${segmentName}`;
      if (activeSegments.includes(segmentName)) {
        segment.classList.add("seg--on", "allocator-seg--on");
      }
      digit.appendChild(segment);
    }
    frame.appendChild(digit);
  }
  target.appendChild(frame);
};

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
});

const importMetaEnv = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
const processEnv = (globalThis as { process?: { env?: Record<string, unknown> } }).process?.env;
const uiShellMode = resolveUiShellMode(window.location, {
  ...processEnv,
  ...importMetaEnv,
});

const useV2ShellRenderer = uiShellMode === "v2";
const shellRenderer = useV2ShellRenderer ? createShellRenderer(root) : null;
document.body.setAttribute("data-ui-shell", uiShellMode);

const renderApp = (state: GameState): void => {
  if (shellRenderer) {
    shellRenderer.render(state, dispatchWithRuntimeGate, {
      interactionMode: interactionRuntime.getMode(),
      inputBlocked: interactionRuntime.isInputBlocked(),
    });
    return;
  }
  render(root, state, dispatchWithRuntimeGate, {
    interactionMode: interactionRuntime.getMode(),
    inputBlocked: interactionRuntime.isInputBlocked(),
  });
};

const redraw = (): void => {
  renderApp(store.getState());
  syncKeypadDimensionInputs();
  syncAllocatorDeviceInputs();
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
  const allocations = state.allocator.allocations;
  const spent = allocations.width + allocations.height + allocations.range + allocations.speed + allocations.slots;
  return state.allocator.maxPoints - spent;
};

let allocatorUnusedDisplayOverride: number | null = null;

const syncKeypadDimensionInputs = (): void => {
  const state = store.getState();
  keypadWidthInput.value = state.ui.keypadColumns.toString();
  keypadHeightInput.value = state.ui.keypadRows.toString();
};

const syncAllocatorDeviceInputs = (): void => {
  const state = store.getState();
  const allocations = state.allocator.allocations;
  const unused = allocatorUnusedDisplayOverride ?? getUnusedPoints(state);
  const allocatorLocked = interactionRuntime.getMode() === "calculator";
  const inputBlocked = interactionRuntime.isInputBlocked();
  const effectiveWidth = 1 + allocations.width;
  const effectiveHeight = 1 + allocations.height;
  const effectiveRange = 1 + allocations.range;
  const effectiveSlots = state.unlocks.maxSlots;

  renderAllocatorDisplay(allocatorUnusedEl, unused);

  renderAllocatorDisplay(allocatorWidthValueEl, effectiveWidth);
  renderAllocatorDisplay(allocatorHeightValueEl, effectiveHeight);
  renderAllocatorDisplay(allocatorRangeValueEl, effectiveRange);
  renderAllocatorDisplay(allocatorSpeedValueEl, allocations.speed);
  renderAllocatorDisplay(allocatorSlotsValueEl, effectiveSlots);

  allocatorIncWidthButton.disabled = inputBlocked || allocatorLocked || unused <= 0;
  allocatorIncHeightButton.disabled = inputBlocked || allocatorLocked || unused <= 0;
  allocatorIncRangeButton.disabled = inputBlocked || allocatorLocked || unused <= 0;
  allocatorIncSpeedButton.disabled = inputBlocked || allocatorLocked || unused <= 0;
  allocatorIncSlotsButton.disabled = inputBlocked || allocatorLocked || unused <= 0;
  allocatorResetButton.disabled = inputBlocked;
  allocatorResetButton.textContent = interactionRuntime.getMode() === "calculator" ? "Allocate \uD835\uDF40" : "RETURN";
  allocatorDeviceEl.dataset.allocatorLocked = allocatorLocked ? "true" : "false";

  debugMaxPointsInput.value = state.allocator.maxPoints.toString();
};

renderAllocatorSpeedLabel();
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
  const value = clampNonNegativeInteger(Number(debugMaxPointsInput.value), state.allocator.maxPoints);
  store.dispatch({ type: "ALLOCATOR_SET_MAX_POINTS", value });
});

runAnalysisButton.addEventListener("click", () => {
  const state = store.getState();
  const report = analyzeNumberDomains(state, new Date(), {
    useAllUnlockedKeys: analysisAllUnlockedCheckbox.checked,
  });
  analysisReportEl.textContent = formatNumberDomainReport(report, state);
});

const bindAllocatorStep = (button: HTMLButtonElement, field: AllocatorAllocationField, delta: 1 | -1): void => {
  button.addEventListener("click", () => {
    dispatchWithRuntimeGate({ type: "ALLOCATOR_ADJUST", field, delta });
  });
};

bindAllocatorStep(allocatorIncWidthButton, "width", 1);
bindAllocatorStep(allocatorIncHeightButton, "height", 1);
bindAllocatorStep(allocatorIncRangeButton, "range", 1);
bindAllocatorStep(allocatorIncSpeedButton, "speed", 1);
bindAllocatorStep(allocatorIncSlotsButton, "slots", 1);

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
  dispatchWithRuntimeGate({ type: "RESET_ALLOCATOR_DEVICE" }, { internal: true });
  moveAllKeysToStorage();
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
  allocatorUnusedDisplayOverride = previousUnused;
  allocatorUnusedEl.classList.add("allocator-display--cue", "allocator-display--cue-pending");
  redraw();
  try {
    if (shellRenderer) {
      await shellRenderer.playTransitionCue("allocator");
      shellRenderer.forceActiveView({
        bottomPanelId: "allocator",
        includeTransition: true,
      });
    } else {
      await sleep(520);
    }
    allocatorUnusedEl.classList.add("allocator-display--cue-focus");
    await sleep(ALLOCATOR_CUE_PRE_APPLY_MS);
    allocatorUnusedDisplayOverride = nextUnused;
    allocatorUnusedEl.classList.remove("allocator-display--cue-pending");
    allocatorUnusedEl.classList.add("allocator-display--cue-applied");
    redraw();
    await sleep(ALLOCATOR_CUE_POST_APPLY_MS);
  } finally {
    allocatorUnusedDisplayOverride = null;
    allocatorUnusedEl.classList.remove(
      "allocator-display--cue",
      "allocator-display--cue-pending",
      "allocator-display--cue-focus",
      "allocator-display--cue-applied",
    );
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
    if (shellRenderer) {
      await shellRenderer.playTransitionCue(targetMode === "modify" ? "allocator" : "calculator");
    } else {
      await sleep(520);
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
          bottomPanelId: "allocator",
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
    dispatchWithRuntimeGate({ type: "ALLOCATOR_ALLOCATE_PRESSED" });
    await runModeTransition("modify");
    return;
  }
  dispatchWithRuntimeGate({ type: "ALLOCATOR_RETURN_PRESSED" });
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
