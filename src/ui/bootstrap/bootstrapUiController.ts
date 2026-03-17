import { KEYPAD_DIM_MAX, KEYPAD_DIM_MIN } from "../../domain/state.js";
import type { GameState } from "../../domain/types.js";
import type { AppMode } from "../../contracts/appMode.js";
import type { BootstrapUiRefs } from "./bootstrapUiRefs.js";
import { serializeRollEntriesForDebug } from "../../infra/debug/rollStateSerializer.js";
import { getContentProvider } from "../../contracts/contentRegistry.js";

type UiShellMode = "mobile" | "desktop";

type BootstrapUiControllerDeps = {
  refs: BootstrapUiRefs;
  uiShellMode: UiShellMode;
  appMode: AppMode;
  location: Location;
  document: Document;
  getState: () => GameState;
  onResetRun: () => void;
  onUnlockAll: () => void;
  onSetKeypadDimensions: (columns: number, rows: number) => void;
  onUpgradeKeypadRow: () => void;
  onUpgradeKeypadColumn: () => void;
  onSetAllocatorMaxPoints: (value: number) => void;
  onNavigateToUiShell: (url: string) => void;
  onNavigateToAppMode: (url: string) => void;
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

const getOppositeUiShellMode = (mode: UiShellMode): UiShellMode =>
  mode === "mobile" ? "desktop" : "mobile";

const getUiShellToggleUrl = (location: Location, mode: UiShellMode): string => {
  const url = new URL(location.href);
  url.searchParams.set("ui", getOppositeUiShellMode(mode));
  return url.toString();
};

const getOppositeAppMode = (mode: AppMode): AppMode => (mode === "game" ? "sandbox" : "game");

const getAppModeToggleUrl = (location: Location, mode: AppMode): string => {
  const url = new URL(location.href);
  url.searchParams.set("mode", getOppositeAppMode(mode));
  return url.toString();
};

export const createBootstrapUiController = ({
  refs,
  uiShellMode,
  appMode,
  location,
  document,
  getState,
  onResetRun,
  onUnlockAll,
  onSetKeypadDimensions,
  onUpgradeKeypadRow,
  onUpgradeKeypadColumn,
  onSetAllocatorMaxPoints,
  onNavigateToUiShell,
  onNavigateToAppMode,
}: BootstrapUiControllerDeps): {
  syncUi: (state: GameState) => void;
  dispose: () => void;
} => {
  const cleanupListeners: Array<() => void> = [];
  const listen = <T extends EventTarget>(
    target: T,
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean,
  ): void => {
    target.addEventListener(type, handler, options);
    cleanupListeners.push(() => {
      target.removeEventListener(type, handler, options);
    });
  };

  const syncDebugMenuVisibility = (): void => {
    const isOpen = refs.debugToggle.checked;
    refs.debugMenu.hidden = !isOpen;
    document.body.setAttribute("data-debug-menu-open", isOpen ? "true" : "false");
  };

  const syncUiShellToggleLink = (): void => {
    const targetMode = getOppositeUiShellMode(uiShellMode);
    refs.toggleUiShellLink.textContent = targetMode === "desktop"
      ? getContentProvider().uiText.switches.desktop
      : getContentProvider().uiText.switches.mobile;
    refs.toggleUiShellLink.setAttribute("href", getUiShellToggleUrl(location, uiShellMode));
  };

  const syncAppModeToggleLink = (): void => {
    const targetMode = getOppositeAppMode(appMode);
    refs.toggleAppModeLink.textContent = targetMode === "sandbox"
      ? getContentProvider().uiText.switches.sandbox
      : getContentProvider().uiText.switches.game;
    refs.toggleAppModeLink.setAttribute("href", getAppModeToggleUrl(location, appMode));
  };

  const syncUi = (state: GameState): void => {
    syncDebugMenuVisibility();
    syncUiShellToggleLink();
    syncAppModeToggleLink();
    refs.keypadWidthInput.value = state.ui.keypadColumns.toString();
    refs.keypadHeightInput.value = state.ui.keypadRows.toString();
    refs.debugMaxPointsInput.value = state.lambdaControl.maxPoints.toString();

    const serializedRollState = serializeRollEntriesForDebug(state);
    refs.debugRollStateEl.textContent = JSON.stringify(
      {
        rollEntries: serializedRollState,
        rollAnalysis: state.calculator.rollAnalysis,
      },
      null,
      2,
    );
  };

  listen(refs.debugToggle, "change", syncDebugMenuVisibility);

  listen(refs.clearSaveButton, "click", () => {
    onResetRun();
  });

  listen(refs.unlockAllButton, "click", () => {
    onUnlockAll();
  });

  listen(refs.applyKeypadSizeButton, "click", () => {
    const state = getState();
    const columns = clampDimensionInput(Number(refs.keypadWidthInput.value), state.ui.keypadColumns);
    const rows = clampDimensionInput(Number(refs.keypadHeightInput.value), state.ui.keypadRows);
    onSetKeypadDimensions(columns, rows);
  });

  listen(refs.upgradeKeypadRowButton, "click", () => {
    onUpgradeKeypadRow();
  });

  listen(refs.upgradeKeypadColumnButton, "click", () => {
    onUpgradeKeypadColumn();
  });

  listen(refs.applyMaxPointsButton, "click", () => {
    const state = getState();
    const value = clampNonNegativeInteger(Number(refs.debugMaxPointsInput.value), state.lambdaControl.maxPoints);
    onSetAllocatorMaxPoints(value);
  });

  listen(refs.toggleUiShellLink, "click", (event) => {
    event.preventDefault();
    onNavigateToUiShell(getUiShellToggleUrl(location, uiShellMode));
  });

  listen(refs.toggleAppModeLink, "click", (event) => {
    event.preventDefault();
    onNavigateToAppMode(getAppModeToggleUrl(location, appMode));
  });

  return {
    syncUi,
    dispose: () => {
      for (const cleanup of cleanupListeners.splice(0)) {
        cleanup();
      }
    },
  };
};
