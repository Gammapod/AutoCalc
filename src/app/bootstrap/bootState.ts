import { initialState } from "../../domain/state.js";
import { createSandboxState } from "../../domain/sandboxPreset.js";
import { createMainMenuState } from "../../domain/mainMenuPreset.js";
import { normalizeLoadedStateForRuntime } from "../../infra/persistence/runtimeLoadNormalizer.js";
import { resolveModeManifest } from "../../domain/modeManifest.js";
import { commitLegacyProjection, isCalculatorId } from "../../domain/multiCalculator.js";
import { normalizeRuntimeStateInvariants } from "../../domain/runtimeStateInvariants.js";
import type { AppMode } from "../../contracts/appMode.js";
import type { GameState } from "../../domain/types.js";

type BootstrapStorageRepo = {
  load: () => GameState | null;
};

export const createFreshGameState = (): GameState => {
  const fresh = initialState();
  const calculator = {
    ...fresh.calculator,
    singleDigitInitialTotalEntry: true,
  };
  return {
    ...fresh,
    calculator,
    calculators: fresh.calculators
      ? {
          ...fresh.calculators,
          f: fresh.calculators.f
            ? {
                ...fresh.calculators.f,
                calculator,
              }
            : fresh.calculators.f,
        }
      : fresh.calculators,
  };
};

export const buildBootStateForMode = (mode: AppMode, storageRepo: BootstrapStorageRepo): GameState => {
  const loaded = mode === "game" ? storageRepo.load() : null;
  const runtimeLoaded = mode === "game" ? normalizeLoadedStateForRuntime(loaded) : null;
  const modeManifest = resolveModeManifest(mode);
  const bootStateBase = runtimeLoaded ?? modeManifest.createBootState({
    createFreshGameState,
    createSandboxState,
    createMainMenuState,
  });
  const bootStateUnnormalized: GameState = {
    ...bootStateBase,
    ui: {
      ...bootStateBase.ui,
      buttonFlags: {
        ...bootStateBase.ui.buttonFlags,
        ...modeManifest.modeButtonFlags,
      },
    },
  };
  const normalized = normalizeRuntimeStateInvariants(bootStateUnnormalized);
  const activeCalculatorId = normalized.activeCalculatorId;
  if (activeCalculatorId && isCalculatorId(activeCalculatorId) && normalized.calculators?.[activeCalculatorId]) {
    return commitLegacyProjection(normalized, normalized, activeCalculatorId);
  }
  return normalized;
};
