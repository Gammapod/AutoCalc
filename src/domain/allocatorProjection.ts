import { applySetKeypadDimensions } from "./reducer.layout.js";
import {
  LAMBDA_POINTS_AWARDED_SEEN_ID,
  LAMBDA_POINTS_REFUNDED_SEEN_ID,
  LAMBDA_POINTS_SPENT_SEEN_ID,
  LAMBDA_SPENT_POINTS_DROPPED_TO_ZERO_SEEN_ID,
} from "./state.js";
import type { GameState, LambdaControl } from "./types.js";
import { projectControlFromInputs, projectControlFromState } from "./controlProjection.js";

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
  const previousProjection = projectControlFromState(state);
  const nextProjection = projectControlFromInputs(lambdaControl, previousProjection.profile, previousProjection.calculatorId);
  const nextControl = nextProjection.control;
  const previousSpent = previousProjection.budget.spent;
  const nextSpent = nextProjection.budget.spent;
  const previousMaxPoints = previousProjection.budget.maxPoints;
  const nextMaxPoints = nextProjection.budget.maxPoints;
  const markSpentDropSeen =
    previousSpent === 1
    && nextSpent === 0
    && !state.completedUnlockIds.includes(LAMBDA_SPENT_POINTS_DROPPED_TO_ZERO_SEEN_ID);
  const withControl = lambdaControlEquals(nextControl, state.lambdaControl)
    ? state
    : { ...state, lambdaControl: nextControl };
  const nextMarkerIds = new Set(withControl.completedUnlockIds);
  if (markSpentDropSeen) {
    nextMarkerIds.add(LAMBDA_SPENT_POINTS_DROPPED_TO_ZERO_SEEN_ID);
  }
  if (nextMaxPoints > previousMaxPoints) {
    nextMarkerIds.add(LAMBDA_POINTS_AWARDED_SEEN_ID);
  }
  if (nextSpent > previousSpent) {
    nextMarkerIds.add(LAMBDA_POINTS_SPENT_SEEN_ID);
  }
  if (nextSpent < previousSpent) {
    nextMarkerIds.add(LAMBDA_POINTS_REFUNDED_SEEN_ID);
  }
  const withMarker = nextMarkerIds.size === withControl.completedUnlockIds.length
    ? withControl
    : {
      ...withControl,
      completedUnlockIds: [...nextMarkerIds],
    };
  const resized = applySetKeypadDimensions(withMarker, nextProjection.keypadColumns, nextProjection.keypadRows);
  const allocator = nextProjection.allocator;
  if (
    resized.unlocks.maxTotalDigits === nextProjection.maxTotalDigits &&
    resized.unlocks.maxSlots === nextProjection.maxSlots &&
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
      maxTotalDigits: nextProjection.maxTotalDigits,
      maxSlots: nextProjection.maxSlots,
    },
  };
};
