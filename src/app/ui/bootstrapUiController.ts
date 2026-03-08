import { KEYPAD_DIM_MAX, KEYPAD_DIM_MIN } from "../../domain/state.js";
import type { GameState } from "../../domain/types.js";
import { createAllocatorResetHoldController } from "../allocatorResetHoldController.js";
import type { InteractionMode } from "../interactionRuntime.js";
import type { BootstrapUiRefs } from "./bootstrapUiRefs.js";

type UiShellMode = "mobile" | "desktop";

type BootstrapUiControllerDeps = {
  refs: BootstrapUiRefs;
  uiShellMode: UiShellMode;
  location: Location;
  document: Document;
  getState: () => GameState;
  isInputBlocked: () => boolean;
  getInteractionMode: () => InteractionMode;
  onAllocatorModeActivate: () => Promise<void>;
  onResetRun: () => void;
  onUnlockAll: () => void;
  onSetKeypadDimensions: (columns: number, rows: number) => void;
  onUpgradeKeypadRow: () => void;
  onUpgradeKeypadColumn: () => void;
  onSetAllocatorMaxPoints: (value: number) => void;
  onNavigateToUiShell: (url: string) => void;
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

const serializeRationalForDebug = (value: { num: bigint; den: bigint }): { num: string; den: string } => ({
  num: value.num.toString(),
  den: value.den.toString(),
});

const getOppositeUiShellMode = (mode: UiShellMode): UiShellMode =>
  mode === "mobile" ? "desktop" : "mobile";

const getUiShellToggleUrl = (location: Location, mode: UiShellMode): string => {
  const url = new URL(location.href);
  url.searchParams.set("ui", getOppositeUiShellMode(mode));
  return url.toString();
};

export const createBootstrapUiController = ({
  refs,
  uiShellMode,
  location,
  document,
  getState,
  isInputBlocked,
  getInteractionMode,
  onAllocatorModeActivate,
  onResetRun,
  onUnlockAll,
  onSetKeypadDimensions,
  onUpgradeKeypadRow,
  onUpgradeKeypadColumn,
  onSetAllocatorMaxPoints,
  onNavigateToUiShell,
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
    refs.toggleUiShellLink.textContent = `Switch to ${targetMode === "desktop" ? "Desktop" : "Mobile"} UI`;
    refs.toggleUiShellLink.setAttribute("href", getUiShellToggleUrl(location, uiShellMode));
  };

  const syncUi = (state: GameState): void => {
    syncDebugMenuVisibility();
    syncUiShellToggleLink();
    refs.keypadWidthInput.value = state.ui.keypadColumns.toString();
    refs.keypadHeightInput.value = state.ui.keypadRows.toString();
    refs.debugMaxPointsInput.value = state.lambdaControl.maxPoints.toString();
    refs.allocatorResetButton.disabled = isInputBlocked();
    refs.allocatorResetButton.textContent = getInteractionMode() === "calculator" ? "Modify Layout" : "Return";

    const serializedRollState = state.calculator.rollEntries.map((entry, index) => ({
      x: index,
      y:
        entry.y.kind === "nan"
          ? { kind: "nan" as const }
          : entry.y.kind === "rational"
            ? { kind: "rational" as const, value: serializeRationalForDebug(entry.y.value) }
            : { kind: "expr" as const, value: JSON.stringify(entry.y.value) },
      ...(entry.remainder ? { remainder: serializeRationalForDebug(entry.remainder) } : {}),
      ...(entry.error ? { error: entry.error } : {}),
    }));
    refs.debugRollStateEl.textContent = JSON.stringify(serializedRollState, null, 2);
  };

  const allocatorResetHoldController = createAllocatorResetHoldController({
    button: refs.allocatorResetButton,
    isInputBlocked,
    onActivated: onAllocatorModeActivate,
  });

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

  return {
    syncUi,
    dispose: () => {
      allocatorResetHoldController.dispose();
      for (const cleanup of cleanupListeners.splice(0)) {
        cleanup();
      }
    },
  };
};
