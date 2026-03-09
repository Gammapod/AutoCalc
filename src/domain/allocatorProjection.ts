import { applySetKeypadDimensions } from "./reducer.layout.js";
import {
  buildAllocatorSnapshot,
  getEffectiveKeypadColumns,
  getEffectiveKeypadRows,
  getEffectiveMaxSlots,
  getEffectiveMaxTotalDigits,
  getLambdaSpentPoints,
  sanitizeLambdaControl,
} from "./lambdaControl.js";
import { LAMBDA_SPENT_POINTS_DROPPED_TO_ZERO_SEEN_ID } from "./state.js";
import type { GameState, LambdaControl } from "./types.js";

const rationalEquals = (
  a?: { num: bigint; den: bigint },
  b?: { num: bigint; den: bigint },
): boolean => {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.num === b.num && a.den === b.den;
};

const lambdaControlEquals = (a: LambdaControl, b: LambdaControl): boolean =>
  a.maxPoints === b.maxPoints &&
  a.alpha === b.alpha &&
  a.beta === b.beta &&
  a.gamma === b.gamma &&
  a.overrides.delta === b.overrides.delta &&
  rationalEquals(a.overrides.epsilon, b.overrides.epsilon);

export const applyAllocatorRuntimeProjection = (
  state: GameState,
  lambdaControl: LambdaControl,
): GameState => {
  const nextControl = sanitizeLambdaControl(lambdaControl);
  const previousSpent = getLambdaSpentPoints(state.lambdaControl);
  const nextSpent = getLambdaSpentPoints(nextControl);
  const markSpentDropSeen =
    previousSpent === 1
    && nextSpent === 0
    && !state.completedUnlockIds.includes(LAMBDA_SPENT_POINTS_DROPPED_TO_ZERO_SEEN_ID);
  const withControl = lambdaControlEquals(nextControl, state.lambdaControl)
    ? state
    : { ...state, lambdaControl: nextControl };
  const withMarker = markSpentDropSeen
    ? {
      ...withControl,
      completedUnlockIds: [...withControl.completedUnlockIds, LAMBDA_SPENT_POINTS_DROPPED_TO_ZERO_SEEN_ID],
    }
    : withControl;
  const columns = getEffectiveKeypadColumns(withMarker.lambdaControl);
  const rows = getEffectiveKeypadRows(withMarker.lambdaControl);
  const maxDigits = getEffectiveMaxTotalDigits(withMarker.lambdaControl);
  const maxSlots = getEffectiveMaxSlots(withMarker.lambdaControl);
  const resized = applySetKeypadDimensions(withMarker, columns, rows);
  const allocator = buildAllocatorSnapshot(resized.lambdaControl);
  if (
    resized.unlocks.maxTotalDigits === maxDigits &&
    resized.unlocks.maxSlots === maxSlots &&
    resized.allocator.maxPoints === allocator.maxPoints &&
    resized.allocator.allocations.width === allocator.allocations.width &&
    resized.allocator.allocations.height === allocator.allocations.height &&
    resized.allocator.allocations.range === allocator.allocations.range &&
    resized.allocator.allocations.speed === allocator.allocations.speed &&
    resized.allocator.allocations.slots === allocator.allocations.slots
  ) {
    return resized;
  }
  return {
    ...resized,
    allocator,
    unlocks: {
      ...resized.unlocks,
      maxTotalDigits: maxDigits,
      maxSlots,
    },
  };
};
