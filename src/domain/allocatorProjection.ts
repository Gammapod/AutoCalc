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
import { getEffectiveControlProfile } from "./controlProfileRuntime.js";

const lambdaControlEquals = (a: LambdaControl, b: LambdaControl): boolean =>
  a.maxPoints === b.maxPoints &&
  a.alpha === b.alpha &&
  a.beta === b.beta &&
  a.gamma === b.gamma &&
  Boolean(a.gammaMinRaised) === Boolean(b.gammaMinRaised);

export const applyAllocatorRuntimeProjection = (
  state: GameState,
  lambdaControl: LambdaControl,
): GameState => {
  const profile = getEffectiveControlProfile(state);
  const nextControl = sanitizeLambdaControl(lambdaControl, profile);
  const previousSpent = getLambdaSpentPoints(state.lambdaControl, profile);
  const nextSpent = getLambdaSpentPoints(nextControl, profile);
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
  const columns = getEffectiveKeypadColumns(withMarker.lambdaControl, profile);
  const rows = getEffectiveKeypadRows(withMarker.lambdaControl, profile);
  const maxDigits = getEffectiveMaxTotalDigits(withMarker.lambdaControl, profile);
  const maxSlots = getEffectiveMaxSlots(withMarker.lambdaControl, profile);
  const resized = applySetKeypadDimensions(withMarker, columns, rows);
  const allocator = buildAllocatorSnapshot(resized.lambdaControl, profile);
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
