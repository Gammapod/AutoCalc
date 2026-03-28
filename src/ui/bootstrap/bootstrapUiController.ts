import { KEYPAD_DIM_MAX, KEYPAD_DIM_MIN } from "../../domain/state.js";
import type { CalculatorId, ControlEquation, ControlField, GameState } from "../../domain/types.js";
import type { AppMode } from "../../contracts/appMode.js";
import type { AppServices } from "../../contracts/appServices.js";
import type { BootstrapUiRefs } from "./bootstrapUiRefs.js";
import { serializeRollEntriesForDebug } from "../../infra/debug/rollStateSerializer.js";
import { getEffectiveControlProfile } from "../../domain/controlProfileRuntime.js";
import { getLambdaDerivedValues } from "../../domain/lambdaControl.js";
import { deriveCatalogPartialProgressPredicateTypes, deriveCatalogProgressCoverage } from "../../domain/unlockHintProgress.js";

type UiShellMode = "mobile" | "desktop";

type BootstrapUiControllerDeps = {
  services: AppServices;
  refs: BootstrapUiRefs;
  uiShellMode: UiShellMode;
  appMode: AppMode;
  location: Location;
  document: Document;
  getState: () => GameState;
  onResetRun: () => void;
  onUnlockAll: () => void;
  onSetKeypadDimensions: (calculatorId: CalculatorId, columns: number, rows: number) => void;
  onUpgradeKeypadRow: (calculatorId: CalculatorId) => void;
  onUpgradeKeypadColumn: (calculatorId: CalculatorId) => void;
  onSetAllocatorMaxPoints: (calculatorId: CalculatorId, value: number) => void;
  onAddAllocatorMaxPoints: (calculatorId: CalculatorId, amount: number) => void;
  onSetSessionControlEquations: (calculatorId: CalculatorId, equations: Record<ControlField, ControlEquation>) => void;
  onSetActiveCalculator: (calculatorId: CalculatorId) => void;
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

const getAppModeToggleTarget = (mode: AppMode): AppMode => {
  if (mode === "game") {
    return "sandbox";
  }
  if (mode === "sandbox") {
    return "game";
  }
  return "game";
};

const getAppModeToggleUrl = (location: Location, mode: AppMode): string => {
  const url = new URL(location.href);
  url.searchParams.set("mode", getAppModeToggleTarget(mode));
  return url.toString();
};

const CONTROL_FIELDS: readonly ControlField[] = ["alpha", "beta", "gamma", "delta", "epsilon"];

const toSelectedCalculatorId = (value: string): CalculatorId =>
  value === "g" ? "g" : value === "menu" ? "menu" : "f";

const renderMatrixEditor = (root: HTMLElement, equations: Record<ControlField, ControlEquation>): void => {
  const headers = ["out", "a", "b", "g", "d", "e", "c"];
  const topRow = headers
    .map((header) => `<div class="debug-matrix-cell debug-matrix-cell--label">${header}</div>`)
    .join("");
  const rows = CONTROL_FIELDS.map((target) => {
    const eq = equations[target];
    const coeffInputs = CONTROL_FIELDS.map((source) =>
      `<div class="debug-matrix-cell"><input type="number" step="0.1" data-eq-target="${target}" data-eq-source="${source}" value="${eq.coefficients[source].toString()}" /></div>`).join("");
    return `<div class="debug-matrix-cell debug-matrix-cell--label">${target}</div>${coeffInputs}<div class="debug-matrix-cell"><input type="number" step="0.1" data-eq-target="${target}" data-eq-source="constant" value="${eq.constant.toString()}" /></div>`;
  }).join("");
  root.innerHTML = `<div class="debug-matrix-grid">${topRow}${rows}</div>`;
};

const readMatrixEditor = (root: HTMLElement, fallback: Record<ControlField, ControlEquation>): Record<ControlField, ControlEquation> => {
  const parsed: Record<ControlField, ControlEquation> = { ...fallback };
  for (const target of CONTROL_FIELDS) {
    const base = fallback[target];
    const next: ControlEquation = {
      coefficients: { ...base.coefficients },
      constant: base.constant,
    };
    for (const source of CONTROL_FIELDS) {
      const input = root.querySelector<HTMLInputElement>(`[data-eq-target="${target}"][data-eq-source="${source}"]`);
      const numeric = Number(input?.value ?? base.coefficients[source]);
      next.coefficients[source] = Number.isFinite(numeric) ? numeric : base.coefficients[source];
    }
    const constantInput = root.querySelector<HTMLInputElement>(`[data-eq-target="${target}"][data-eq-source="constant"]`);
    const constant = Number(constantInput?.value ?? base.constant);
    next.constant = Number.isFinite(constant) ? constant : base.constant;
    parsed[target] = next;
  }
  return parsed;
};

const copyTextToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to document-based copy path below.
  }

  try {
    const fallbackTextarea = document.createElement("textarea");
    fallbackTextarea.value = text;
    fallbackTextarea.setAttribute("readonly", "true");
    fallbackTextarea.style.position = "fixed";
    fallbackTextarea.style.opacity = "0";
    document.body.appendChild(fallbackTextarea);
    fallbackTextarea.focus();
    fallbackTextarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(fallbackTextarea);
    return copied;
  } catch {
    return false;
  }
};

export const createBootstrapUiController = ({
  services,
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
  onAddAllocatorMaxPoints,
  onSetSessionControlEquations,
  onSetActiveCalculator,
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
    const matrixOpen = isOpen && refs.debugMatrixToggle.checked;
    refs.debugMenu.hidden = !isOpen;
    refs.debugMatrixWindow.hidden = !matrixOpen;
    document.body.setAttribute("data-debug-menu-open", isOpen ? "true" : "false");
  };

  const syncUiShellToggleLink = (): void => {
    const targetMode = getOppositeUiShellMode(uiShellMode);
    refs.toggleUiShellLink.textContent = targetMode === "desktop"
      ? services.contentProvider.uiText.switches.desktop
      : services.contentProvider.uiText.switches.mobile;
    refs.toggleUiShellLink.setAttribute("href", getUiShellToggleUrl(location, uiShellMode));
  };

  const syncAppModeToggleLink = (): void => {
    const targetMode = getAppModeToggleTarget(appMode);
    refs.toggleAppModeLink.textContent = targetMode === "sandbox"
      ? services.contentProvider.uiText.switches.sandbox
      : services.contentProvider.uiText.switches.game;
    refs.toggleAppModeLink.setAttribute("href", getAppModeToggleUrl(location, appMode));
  };

  const syncUi = (state: GameState): void => {
    const selectedCalculatorId = toSelectedCalculatorId(refs.debugCalculatorSelect.value || state.activeCalculatorId || "f");
    const selectedInstance = state.calculators?.[selectedCalculatorId];
    const selectedProjected = selectedInstance ?? state;
    const selectedProfile = getEffectiveControlProfile({
      ...state,
      activeCalculatorId: selectedCalculatorId,
    });
    syncDebugMenuVisibility();
    syncUiShellToggleLink();
    syncAppModeToggleLink();
    refs.debugCalculatorSelect.value = selectedCalculatorId;
    refs.keypadWidthInput.value = selectedProjected.ui.keypadColumns.toString();
    refs.keypadHeightInput.value = selectedProjected.ui.keypadRows.toString();
    refs.debugMaxPointsInput.value = selectedProjected.lambdaControl.maxPoints.toString();
    renderMatrixEditor(refs.debugMatrixEditor, selectedProfile.equations);

    const serializedRollState = serializeRollEntriesForDebug(state);
    const hintCoverage = deriveCatalogProgressCoverage(services.contentProvider.unlockCatalog);
    const partialProgressPredicateTypes = deriveCatalogPartialProgressPredicateTypes(services.contentProvider.unlockCatalog);
    refs.debugRollStateEl.textContent = JSON.stringify(
      {
        rollEntries: serializedRollState,
        rollAnalysis: state.calculator.rollAnalysis,
        unlockHintProgress: {
          partialProgressPredicateTypes,
          missingPredicateTypes: hintCoverage.missingPredicateTypes,
          missingHintUnlockIds: hintCoverage.missingHintUnlockIds,
        },
      },
      null,
      2,
    );
  };

  listen(refs.debugToggle, "change", syncDebugMenuVisibility);
  listen(refs.debugMatrixToggle, "change", syncDebugMenuVisibility);

  listen(refs.clearSaveButton, "click", () => {
    onResetRun();
  });

  listen(refs.unlockAllButton, "click", () => {
    onUnlockAll();
  });

  listen(refs.applyKeypadSizeButton, "click", () => {
    const state = getState();
    const calculatorId = toSelectedCalculatorId(refs.debugCalculatorSelect.value || state.activeCalculatorId || "f");
    const instance = state.calculators?.[calculatorId];
    const columns = clampDimensionInput(Number(refs.keypadWidthInput.value), instance?.ui.keypadColumns ?? state.ui.keypadColumns);
    const rows = clampDimensionInput(Number(refs.keypadHeightInput.value), instance?.ui.keypadRows ?? state.ui.keypadRows);
    onSetKeypadDimensions(calculatorId, columns, rows);
  });

  listen(refs.upgradeKeypadRowButton, "click", () => {
    const state = getState();
    onUpgradeKeypadRow(toSelectedCalculatorId(refs.debugCalculatorSelect.value || state.activeCalculatorId || "f"));
  });

  listen(refs.upgradeKeypadColumnButton, "click", () => {
    const state = getState();
    onUpgradeKeypadColumn(toSelectedCalculatorId(refs.debugCalculatorSelect.value || state.activeCalculatorId || "f"));
  });

  listen(refs.applyMaxPointsButton, "click", () => {
    const state = getState();
    const calculatorId = toSelectedCalculatorId(refs.debugCalculatorSelect.value || state.activeCalculatorId || "f");
    const instance = state.calculators?.[calculatorId];
    const value = clampNonNegativeInteger(Number(refs.debugMaxPointsInput.value), instance?.lambdaControl.maxPoints ?? state.lambdaControl.maxPoints);
    onSetAllocatorMaxPoints(calculatorId, value);
  });

  listen(refs.addMaxPointsButton, "click", () => {
    const state = getState();
    onAddAllocatorMaxPoints(toSelectedCalculatorId(refs.debugCalculatorSelect.value || state.activeCalculatorId || "f"), 1);
  });

  listen(refs.applyControlMatrixButton, "click", () => {
    const state = getState();
    const calculatorId = toSelectedCalculatorId(refs.debugCalculatorSelect.value || state.activeCalculatorId || "f");
    const profile = getEffectiveControlProfile({
      ...state,
      activeCalculatorId: calculatorId,
    });
    const equations = readMatrixEditor(refs.debugMatrixEditor, profile.equations);
    onSetSessionControlEquations(calculatorId, equations);
  });

  listen(refs.copyCalculatorSnapshotButton, "click", () => {
    const state = getState();
    const calculatorId = toSelectedCalculatorId(refs.debugCalculatorSelect.value || state.activeCalculatorId || "f");
    const selectedInstance = state.calculators?.[calculatorId];
    const selectedProjected = selectedInstance ?? state;
    const selectedProfile = getEffectiveControlProfile({
      ...state,
      activeCalculatorId: calculatorId,
    });
    const lambdaDerived = getLambdaDerivedValues(selectedProjected.lambdaControl, selectedProfile);
    const snapshot = {
      schema: "debug_calculator_snapshot_v1",
      capturedAt: new Date().toISOString(),
      calculatorId,
      lambdaControl: selectedProjected.lambdaControl,
      allocator: selectedProjected.allocator,
      keypad: {
        columns: selectedProjected.ui.keypadColumns,
        rows: selectedProjected.ui.keypadRows,
        keyLayout: selectedProjected.ui.keyLayout,
      },
      controlMatrix: {
        equations: selectedProfile.equations,
        effectiveFields: lambdaDerived.effectiveFields,
      },
    };
    const serialized = JSON.stringify(snapshot, null, 2);
    void copyTextToClipboard(serialized).then((copied) => {
      refs.debugRollStateEl.textContent = copied
        ? `Copied calculator snapshot for '${calculatorId}' to clipboard.\n\n${serialized}`
        : `Clipboard copy failed. Snapshot JSON:\n\n${serialized}`;
    });
  });

  listen(refs.debugCalculatorSelect, "change", () => {
    const calculatorId = toSelectedCalculatorId(refs.debugCalculatorSelect.value);
    onSetActiveCalculator(calculatorId);
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
