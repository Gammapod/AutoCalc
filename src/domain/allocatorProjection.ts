import { applySetKeypadDimensions } from "./reducer.layout.js";
import {
  buildAllocatorSnapshot,
  getEffectiveKeypadColumns,
  getEffectiveKeypadRows,
  getEffectiveMaxSlots,
  getEffectiveMaxTotalDigits,
  sanitizeLambdaControl,
} from "./lambdaControl.js";
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
  const withControl = lambdaControlEquals(nextControl, state.lambdaControl)
    ? state
    : { ...state, lambdaControl: nextControl };
  const columns = getEffectiveKeypadColumns(withControl.lambdaControl);
  const rows = getEffectiveKeypadRows(withControl.lambdaControl);
  const maxDigits = getEffectiveMaxTotalDigits(withControl.lambdaControl);
  const maxSlots = getEffectiveMaxSlots(withControl.lambdaControl);
  const resized = applySetKeypadDimensions(withControl, columns, rows);
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
