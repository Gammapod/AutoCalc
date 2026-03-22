import type { GameState } from "./types.js";
import {
  BINARY_MODE_FLAG,
  DELTA_RANGE_CLAMP_FLAG,
  MOD_ZERO_TO_DELTA_FLAG,
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

// Toggle UI-level boolean flags used by toggle-style buttons.
const EXCLUSIVE_FLAG_GROUPS: readonly (readonly string[])[] = [
  [DELTA_RANGE_CLAMP_FLAG, MOD_ZERO_TO_DELTA_FLAG],
];

const clearExclusivePeers = (flags: Record<string, boolean>, flag: string): Record<string, boolean> => {
  const nextFlags = { ...flags };
  for (const group of EXCLUSIVE_FLAG_GROUPS) {
    if (!group.includes(flag)) {
      continue;
    }
    for (const candidate of group) {
      if (candidate !== flag) {
        delete nextFlags[candidate];
      }
    }
  }
  return nextFlags;
};

const applyBinaryModeOverflowIfNeeded = (previous: GameState, next: GameState): GameState => {
  if (!next.ui.buttonFlags[BINARY_MODE_FLAG] || previous.ui.buttonFlags[BINARY_MODE_FLAG]) {
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
        ...clearExclusivePeers(state.ui.buttonFlags, trimmed),
        [trimmed]: true,
      },
    },
  };
  return applyBinaryModeOverflowIfNeeded(state, toggledOnState);
};
