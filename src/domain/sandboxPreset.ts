import { applyUnlockAllPreset } from "./lifecyclePresets.js";
import { materializeCalculator, projectCalculatorToLegacy } from "./multiCalculator.js";
import { KEY_ID, isMemoryKeyId } from "./keyPresentation.js";
import { initialState } from "./state.js";
import { setButtonUnlocked } from "./buttonStateAccess.js";
import type { GameState, Key } from "./types.js";
import { buttonRegistry } from "./buttonRegistry.js";

const isExcludedSandboxKey = (key: Key): boolean => {
  if (key === KEY_ID.system_save_quit_main_menu) {
    return false;
  }
  if (isMemoryKeyId(key)) {
    return true;
  }
  return key.startsWith("system_");
};

const applySandboxKeyPolicy = (state: GameState): GameState =>
  buttonRegistry.reduce((next, entry) =>
    setButtonUnlocked(next, entry.key, !isExcludedSandboxKey(entry.key)), state);

export const createSandboxState = (): GameState => {
  const unlocked = applyUnlockAllPreset(initialState());
  const withFPrime = materializeCalculator(unlocked, "f_prime");
  const withGPrime = materializeCalculator(withFPrime, "g_prime");
  const withHPrime = materializeCalculator(withGPrime, "h_prime");
  const withPrimes = materializeCalculator(withHPrime, "i_prime");

  const fPrime = withPrimes.calculators?.f_prime;
  const gPrime = withPrimes.calculators?.g_prime;
  const hPrime = withPrimes.calculators?.h_prime;
  const iPrime = withPrimes.calculators?.i_prime;
  if (!fPrime || !gPrime || !hPrime || !iPrime) {
    throw new Error("Sandbox preset failed to materialize prime calculators.");
  }

  const projectedToFPrime = projectCalculatorToLegacy(withPrimes, "f_prime");
  const sandboxUnlocked = applySandboxKeyPolicy(projectedToFPrime);
  const sharedStorageLayout = [...sandboxUnlocked.ui.storageLayout];
  const sandboxButtonFlags = {
    ...sandboxUnlocked.ui.buttonFlags,
    "mode.main_menu": false,
    "mode.sandbox": true,
    "mode.storage_content_visible": true,
  };

  return {
    ...sandboxUnlocked,
    ui: {
      ...sandboxUnlocked.ui,
      buttonFlags: { ...sandboxButtonFlags },
    },
    calculators: {
      f_prime: {
        ...fPrime,
        ui: {
          ...fPrime.ui,
          buttonFlags: { ...sandboxButtonFlags },
          storageLayout: [...sharedStorageLayout],
        },
      },
      g_prime: {
        ...gPrime,
        ui: {
          ...gPrime.ui,
          buttonFlags: { ...sandboxButtonFlags },
          storageLayout: [...sharedStorageLayout],
        },
      },
      h_prime: {
        ...hPrime,
        ui: {
          ...hPrime.ui,
          buttonFlags: { ...sandboxButtonFlags },
          storageLayout: [...sharedStorageLayout],
        },
      },
      i_prime: {
        ...iPrime,
        ui: {
          ...iPrime.ui,
          buttonFlags: { ...sandboxButtonFlags },
          storageLayout: [...sharedStorageLayout],
        },
      },
    },
    calculatorOrder: ["f_prime", "g_prime", "h_prime", "i_prime"],
    activeCalculatorId: "f_prime",
    perCalculatorCompletedUnlockIds: {
      f_prime: [],
      g_prime: [],
      h_prime: [],
      i_prime: [],
    },
    unlocks: {
      ...sandboxUnlocked.unlocks,
      uiUnlocks: {
        ...sandboxUnlocked.unlocks.uiUnlocks,
        storageVisible: true,
      },
    },
  };
};
