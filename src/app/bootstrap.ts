import { createStore } from "./store.js";
import { initialState, KEYPAD_DIM_MAX, KEYPAD_DIM_MIN } from "../domain/state.js";
import { createLocalStorageRepo } from "../infra/persistence/localStorageRepo.js";
import { render } from "../ui/render.js";
import { createShellRenderer } from "../../src_v2/ui/renderAdapter.js";
import { resolveUiShellMode } from "./uiShellMode.js";
import {
  AUTO_EQUALS_POINT_BONUS,
  createAutoEqualsScheduler,
  normalizeLoadedStateForRuntime,
} from "./autoEqualsScheduler.js";
import { analyzeNumberDomains } from "../domain/analysis.js";
import { formatNumberDomainReport } from "./analysisReport.js";
import type { AllocatorAllocationField, GameState } from "../domain/types.js";

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
const autoEqualsScheduler = createAutoEqualsScheduler(store);

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
    shellRenderer.render(state, store.dispatch);
    return;
  }
  render(root, state, store.dispatch);
};

const redraw = (): void => {
  renderApp(store.getState());
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

const syncKeypadDimensionInputs = (): void => {
  const state = store.getState();
  keypadWidthInput.value = state.ui.keypadColumns.toString();
  keypadHeightInput.value = state.ui.keypadRows.toString();
};

const syncAllocatorDeviceInputs = (): void => {
  const state = store.getState();
  const allocations = state.allocator.allocations;
  const unused = getUnusedPoints(state);
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

  allocatorIncWidthButton.disabled = unused <= 0;
  allocatorIncHeightButton.disabled = unused <= 0;
  allocatorIncRangeButton.disabled = unused <= 0;
  allocatorIncSpeedButton.disabled = unused <= 0;
  allocatorIncSlotsButton.disabled = unused <= 0;

  debugMaxPointsInput.value = state.allocator.maxPoints.toString();
};

renderAllocatorSpeedLabel();
redraw();
autoEqualsScheduler.startIfNeeded();
const unsubscribe = store.subscribe((state) => {
  autoEqualsScheduler.sync(state);
  const latest = store.getState();
  renderApp(latest);
  syncKeypadDimensionInputs();
  syncAllocatorDeviceInputs();
  storageRepo.save(latest);
});

window.__autoCalcBootstrapCleanup__ = () => {
  unsubscribe();
  shellRenderer?.dispose();
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
  const value = clampNonNegativeInteger(Number(debugMaxPointsInput.value), state.allocator.maxPoints);
  store.dispatch({ type: "ALLOCATOR_SET_MAX_POINTS", value });
});

runAnalysisButton.addEventListener("click", () => {
  const report = analyzeNumberDomains(store.getState(), new Date(), {
    useAllUnlockedKeys: analysisAllUnlockedCheckbox.checked,
  });
  analysisReportEl.textContent = formatNumberDomainReport(report);
});

const bindAllocatorStep = (button: HTMLButtonElement, field: AllocatorAllocationField, delta: 1 | -1): void => {
  button.addEventListener("click", () => {
    store.dispatch({ type: "ALLOCATOR_ADJUST", field, delta });
  });
};

bindAllocatorStep(allocatorIncWidthButton, "width", 1);
bindAllocatorStep(allocatorIncHeightButton, "height", 1);
bindAllocatorStep(allocatorIncRangeButton, "range", 1);
bindAllocatorStep(allocatorIncSpeedButton, "speed", 1);
bindAllocatorStep(allocatorIncSlotsButton, "slots", 1);

allocatorResetButton.addEventListener("click", () => {
  store.dispatch({ type: "RESET_ALLOCATOR_DEVICE" });
});

syncDebugUiState();
syncKeypadDimensionInputs();
syncAllocatorDeviceInputs();
