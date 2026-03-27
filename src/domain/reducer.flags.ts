import type { GameState } from "./types.js";
import {
  OVERFLOW_ERROR_SEEN_ID,
} from "./state.js";
import {
  clampRationalToBoundary,
  computeOverflowBoundary,
  exceedsMagnitudeBoundary,
  isRationalCalculatorValue,
  OVERFLOW_ERROR_CODE,
  toRationalCalculatorValue,
} from "./calculatorValue.js";
import { appendSeedIfMissing, appendStepRow, createRollEntry } from "./rollEntries.js";
import { getRollYPrimeFactorization } from "./rollDerived.js";
import { applySettingsSelection, resolveSettingSelectionForFlag } from "./settings.js";

const applyBinaryModeOverflowIfNeeded = (previous: GameState, next: GameState): GameState => {
  if (next.settings.base !== "base2" || previous.settings.base === "base2") {
    return next;
  }
  if (!isRationalCalculatorValue(next.calculator.total)) {
    return next;
  }

  const boundary = computeOverflowBoundary(next.unlocks.maxTotalDigits, 2);
  if (!exceedsMagnitudeBoundary(next.calculator.total.value, boundary)) {
    return next;
  }

  const clampedTotal = toRationalCalculatorValue(clampRationalToBoundary(next.calculator.total.value, boundary));
  const factorization = getRollYPrimeFactorization(clampedTotal);
  const overflowEntry = createRollEntry(clampedTotal, {
    ...(factorization ? { factorization } : {}),
    error: {
      code: OVERFLOW_ERROR_CODE,
      kind: "overflow",
    },
  });
  const withSeed = appendSeedIfMissing(next.calculator.rollEntries, next.calculator.total);
  const nextRollEntries = appendStepRow(withSeed, overflowEntry);
  const withOverflowMarker = next.completedUnlockIds.includes(OVERFLOW_ERROR_SEEN_ID)
    ? next.completedUnlockIds
    : [...next.completedUnlockIds, OVERFLOW_ERROR_SEEN_ID];

  return {
    ...next,
    calculator: {
      ...next.calculator,
      total: clampedTotal,
      pendingNegativeTotal: false,
      singleDigitInitialTotalEntry: false,
      rollEntries: nextRollEntries,
      rollAnalysis: {
        stopReason: "invalid",
        cycle: null,
      },
    },
    completedUnlockIds: withOverflowMarker,
  };
};

export const applyToggleFlag = (state: GameState, flag: string): GameState => {
  const trimmed = flag.trim();
  if (trimmed.length === 0) {
    return state;
  }
  const settingSelection = resolveSettingSelectionForFlag(trimmed);
  if (settingSelection) {
    const nextSettings = applySettingsSelection(state, settingSelection);
    if (nextSettings === state.settings) {
      return state;
    }
    const nextState: GameState = {
      ...state,
      settings: nextSettings,
      ui: {
        ...state.ui,
        activeVisualizer: nextSettings.visualizer,
      },
    };
    return applyBinaryModeOverflowIfNeeded(state, nextState);
  }

  const current = Boolean(state.ui.buttonFlags[trimmed]);
  if (current) {
    const nextFlags = { ...state.ui.buttonFlags };
    delete nextFlags[trimmed];
    return {
      ...state,
      ui: {
        ...state.ui,
        buttonFlags: nextFlags,
      },
    };
  }

  const toggledOnState: GameState = {
    ...state,
    ui: {
      ...state.ui,
      buttonFlags: {
        ...state.ui.buttonFlags,
        [trimmed]: true,
      },
    },
  };
  return toggledOnState;
};
