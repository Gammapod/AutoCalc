import { createStore } from "./store.js";
import { initialState, KEYPAD_DIM_MAX, KEYPAD_DIM_MIN } from "../domain/state.js";
import { createLocalStorageRepo } from "../infra/persistence/localStorageRepo.js";
import { render } from "../ui/render.js";
import { createAutoEqualsScheduler, normalizeLoadedStateForRuntime } from "./autoEqualsScheduler.js";
import { analyzeNumberDomains } from "../domain/analysis.js";
import { formatNumberDomainReport } from "./analysisReport.js";
import type { AllocatorAllocationField, GameState } from "../domain/types.js";

declare global {
  interface Window {
    __autoCalcBootstrapCleanup__?: () => void;
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
const allocatorMaxPointsEl = document.querySelector<HTMLElement>("[data-allocator-max-points]");
const allocatorWidthValueEl = document.querySelector<HTMLElement>("[data-allocator-width]");
const allocatorHeightValueEl = document.querySelector<HTMLElement>("[data-allocator-height]");
const allocatorRangeValueEl = document.querySelector<HTMLElement>("[data-allocator-range]");
const allocatorSpeedValueEl = document.querySelector<HTMLElement>("[data-allocator-speed]");
const allocatorEffectiveWidthEl = document.querySelector<HTMLElement>("[data-allocator-effective-width]");
const allocatorEffectiveHeightEl = document.querySelector<HTMLElement>("[data-allocator-effective-height]");
const allocatorEffectiveRangeEl = document.querySelector<HTMLElement>("[data-allocator-effective-range]");
const allocatorEffectiveSpeedEl = document.querySelector<HTMLElement>("[data-allocator-effective-speed]");
const allocatorDecWidthButton = document.querySelector<HTMLButtonElement>("[data-allocator-dec-width]");
const allocatorIncWidthButton = document.querySelector<HTMLButtonElement>("[data-allocator-inc-width]");
const allocatorDecHeightButton = document.querySelector<HTMLButtonElement>("[data-allocator-dec-height]");
const allocatorIncHeightButton = document.querySelector<HTMLButtonElement>("[data-allocator-inc-height]");
const allocatorDecRangeButton = document.querySelector<HTMLButtonElement>("[data-allocator-dec-range]");
const allocatorIncRangeButton = document.querySelector<HTMLButtonElement>("[data-allocator-inc-range]");
const allocatorDecSpeedButton = document.querySelector<HTMLButtonElement>("[data-allocator-dec-speed]");
const allocatorIncSpeedButton = document.querySelector<HTMLButtonElement>("[data-allocator-inc-speed]");
const allocatorResetButton = document.querySelector<HTMLButtonElement>("[data-allocator-reset]");
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
  !allocatorMaxPointsEl ||
  !allocatorWidthValueEl ||
  !allocatorHeightValueEl ||
  !allocatorRangeValueEl ||
  !allocatorSpeedValueEl ||
  !allocatorEffectiveWidthEl ||
  !allocatorEffectiveHeightEl ||
  !allocatorEffectiveRangeEl ||
  !allocatorEffectiveSpeedEl ||
  !allocatorDecWidthButton ||
  !allocatorIncWidthButton ||
  !allocatorDecHeightButton ||
  !allocatorIncHeightButton ||
  !allocatorDecRangeButton ||
  !allocatorIncRangeButton ||
  !allocatorDecSpeedButton ||
  !allocatorIncSpeedButton ||
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
const autoEqualsScheduler = createAutoEqualsScheduler(store);

const redraw = (): void => {
  render(root, store.getState(), store.dispatch);
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
  const spent = allocations.width + allocations.height + allocations.range + allocations.speed;
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

  allocatorUnusedEl.textContent = unused.toString();
  allocatorMaxPointsEl.textContent = `max: ${state.allocator.maxPoints.toString()}`;

  allocatorWidthValueEl.textContent = allocations.width.toString();
  allocatorHeightValueEl.textContent = allocations.height.toString();
  allocatorRangeValueEl.textContent = allocations.range.toString();
  allocatorSpeedValueEl.textContent = allocations.speed.toString();

  allocatorEffectiveWidthEl.textContent = `eff: ${(1 + allocations.width).toString()}`;
  allocatorEffectiveHeightEl.textContent = `eff: ${(1 + allocations.height).toString()}`;
  allocatorEffectiveRangeEl.textContent = `eff: ${(1 + allocations.range).toString()}`;
  allocatorEffectiveSpeedEl.textContent = `eff: ${(1 + allocations.speed).toString()}`;

  allocatorIncWidthButton.disabled = unused <= 0;
  allocatorIncHeightButton.disabled = unused <= 0;
  allocatorIncRangeButton.disabled = unused <= 0;
  allocatorIncSpeedButton.disabled = unused <= 0;

  allocatorDecWidthButton.disabled = allocations.width <= 0;
  allocatorDecHeightButton.disabled = allocations.height <= 0;
  allocatorDecRangeButton.disabled = allocations.range <= 0;
  allocatorDecSpeedButton.disabled = allocations.speed <= 0;

  debugMaxPointsInput.value = state.allocator.maxPoints.toString();
};

redraw();
autoEqualsScheduler.startIfNeeded();
const unsubscribe = store.subscribe((state) => {
  autoEqualsScheduler.sync(state);
  const latest = store.getState();
  render(root, latest, store.dispatch);
  syncKeypadDimensionInputs();
  syncAllocatorDeviceInputs();
  storageRepo.save(latest);
});

window.__autoCalcBootstrapCleanup__ = () => {
  unsubscribe();
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

bindAllocatorStep(allocatorDecWidthButton, "width", -1);
bindAllocatorStep(allocatorIncWidthButton, "width", 1);
bindAllocatorStep(allocatorDecHeightButton, "height", -1);
bindAllocatorStep(allocatorIncHeightButton, "height", 1);
bindAllocatorStep(allocatorDecRangeButton, "range", -1);
bindAllocatorStep(allocatorIncRangeButton, "range", 1);
bindAllocatorStep(allocatorDecSpeedButton, "speed", -1);
bindAllocatorStep(allocatorIncSpeedButton, "speed", 1);

allocatorResetButton.addEventListener("click", () => {
  store.dispatch({ type: "RESET_ALLOCATOR_DEVICE" });
});

syncDebugUiState();
syncKeypadDimensionInputs();
syncAllocatorDeviceInputs();
