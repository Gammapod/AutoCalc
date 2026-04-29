import { initialState } from "../../domain/state.js";
import { createSandboxState } from "../../domain/sandboxPreset.js";
import { createMainMenuState } from "../../domain/mainMenuPreset.js";
import { normalizeLoadedStateForRuntime } from "../../infra/persistence/runtimeLoadNormalizer.js";
import { resolveModeManifest } from "../../domain/modeManifest.js";
import { normalizeRuntimeStateInvariants } from "../../domain/runtimeStateInvariants.js";
import type { AppMode } from "../../contracts/appMode.js";
import type { GameState } from "../../domain/types.js";

type BootstrapStorageRepo = {
  load: () => GameState | null;
};

export const createFreshGameState = (): GameState => {
  const fresh = initialState();
  return {
    ...fresh,
    calculator: {
      ...fresh.calculator,
      singleDigitInitialTotalEntry: true,
    },
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
  return normalizeRuntimeStateInvariants(bootStateUnnormalized);
};
