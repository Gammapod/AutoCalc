import type { CalculatorId, ControlField, GameState } from "../../domain/types.js";
import { DEBUG_UNLOCK_BYPASS_FLAG } from "../../domain/state.js";
import type { AppMode } from "../../contracts/appMode.js";
import type { AppServices } from "../../contracts/appServices.js";
import type { BootstrapUiRefs } from "./bootstrapUiRefs.js";
import { serializeRollEntriesForDebug } from "../../infra/debug/rollStateSerializer.js";
import { deriveCatalogPartialProgressPredicateTypes, deriveCatalogProgressCoverage } from "../../domain/unlockHintProgress.js";
import { resolveKeyCapability } from "../../domain/keyUnlocks.js";
import { toCoordFromIndex } from "../../domain/keypadLayoutModel.js";
import { withActiveCalculator } from "../../domain/multiCalculator.js";

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
  onToggleFlag: (flag: string) => void;
  onSetControlField: (calculatorId: CalculatorId, field: ControlField, value: number) => void;
  onSetActiveCalculator: (calculatorId: CalculatorId) => void;
  onNavigateToUiShell: (url: string) => void;
  onNavigateToAppMode: (url: string) => void;
};

const CONTROL_FIELDS: readonly ControlField[] = ["alpha", "beta", "gamma", "delta", "delta_q", "epsilon"];

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

const toSelectedCalculatorId = (value: string): CalculatorId =>
  value === "g"
    ? "g"
    : value === "menu"
      ? "menu"
      : value === "f_prime"
        ? "f_prime"
        : value === "g_prime"
          ? "g_prime"
          : value === "h_prime"
            ? "h_prime"
            : value === "i_prime"
              ? "i_prime"
          : "f";

const toSnapshotKeyStatus = (capability: ReturnType<typeof resolveKeyCapability>): "lock" | "installed_only" | "unlock" =>
  capability === "portable"
    ? "unlock"
    : capability === "installed_only"
      ? "installed_only"
      : "lock";

const copyTextToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to document.execCommand path.
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
  onToggleFlag,
  onSetControlField,
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
    refs.debugMenu.hidden = !isOpen;
    document.body.setAttribute("data-debug-menu-open", isOpen ? "true" : "false");
  };

  const syncDebugToggleFromState = (state: GameState): void => {
    const debugUnlockBypassEnabled = Boolean(state.ui.buttonFlags[DEBUG_UNLOCK_BYPASS_FLAG]);
    if (refs.debugToggle.checked !== debugUnlockBypassEnabled) {
      refs.debugToggle.checked = debugUnlockBypassEnabled;
    }
    syncDebugMenuVisibility();
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

    syncDebugToggleFromState(state);
    syncUiShellToggleLink();
    syncAppModeToggleLink();

    refs.debugCalculatorSelect.value = selectedCalculatorId;
    for (const field of CONTROL_FIELDS) {
      refs.debugControlInputs[field].value = selectedProjected.lambdaControl[field].toString();
    }

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
        },
      },
      null,
      2,
    );
  };

  listen(refs.debugToggle, "change", () => {
    syncDebugMenuVisibility();
    const state = getState();
    const debugUnlockBypassEnabled = Boolean(state.ui.buttonFlags[DEBUG_UNLOCK_BYPASS_FLAG]);
    if (debugUnlockBypassEnabled !== refs.debugToggle.checked) {
      onToggleFlag(DEBUG_UNLOCK_BYPASS_FLAG);
    }
  });

  listen(refs.clearSaveButton, "click", () => {
    onResetRun();
  });

  listen(refs.unlockAllButton, "click", () => {
    onUnlockAll();
  });

  listen(refs.applyControlFieldsButton, "click", () => {
    const state = getState();
    const calculatorId = toSelectedCalculatorId(refs.debugCalculatorSelect.value || state.activeCalculatorId || "f");
    const instance = state.calculators?.[calculatorId];
    const fallback = instance?.lambdaControl ?? state.lambdaControl;
    const nextValues: Record<ControlField, number> = {
      alpha: fallback.alpha,
      beta: fallback.beta,
      gamma: fallback.gamma,
      delta: fallback.delta,
      delta_q: fallback.delta_q,
      epsilon: fallback.epsilon,
    };
    for (const field of CONTROL_FIELDS) {
      const rawValue = Number(refs.debugControlInputs[field].value);
      nextValues[field] = Number.isFinite(rawValue) ? Math.trunc(rawValue) : fallback[field];
    }
    for (const field of CONTROL_FIELDS) {
      onSetControlField(calculatorId, field, nextValues[field]);
    }
  });

  listen(refs.copyCalculatorSnapshotButton, "click", () => {
    const state = getState();
    const calculatorId = toSelectedCalculatorId(refs.debugCalculatorSelect.value || state.activeCalculatorId || "f");
    const selectedProjected = withActiveCalculator(state, calculatorId);
    const keyLayoutDebug = selectedProjected.ui.keyLayout.map((cell, index) => {
      const coord = toCoordFromIndex(index, selectedProjected.ui.keypadColumns, selectedProjected.ui.keypadRows);
      const rowColId = `R${coord.row}C${coord.col}`;
      if (cell.kind !== "key") {
        return {
          index,
          rowColId,
          row: coord.row,
          col: coord.col,
          kind: "placeholder" as const,
          area: cell.area,
        };
      }
      const capability = resolveKeyCapability(selectedProjected, cell.key);
      return {
        index,
        rowColId,
        row: coord.row,
        col: coord.col,
        kind: "key" as const,
        key: cell.key,
        status: toSnapshotKeyStatus(capability),
        capability,
      };
    });
    const snapshot = {
      schema: "debug_calculator_snapshot_v3",
      capturedAt: new Date().toISOString(),
      calculatorId,
      lambdaControl: selectedProjected.lambdaControl,
      keypad: {
        columns: selectedProjected.ui.keypadColumns,
        rows: selectedProjected.ui.keypadRows,
        keyLayoutDebug,
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
