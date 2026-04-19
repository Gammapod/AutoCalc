import { getAppServices } from "../../../contracts/appServices.js";
import { isRationalCalculatorValue } from "../../../domain/calculatorValue.js";
import { evaluateUnlockPredicate } from "../../../domain/unlockEngine.js";
import type { GameState, UnlockDefinition } from "../../../domain/types.js";

export type GraphTargetYLineHint = {
  unlockId: string;
  targetY: number;
  distance: number;
  radius: number;
  opacity01: number;
};

export type GraphTargetYLineNearness = {
  distance: number;
  radius: number;
  opacity01: number;
  inRange: boolean;
};

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) {
    return value > 0 ? 1 : 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
};

const toNumber = (value: bigint): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export const resolveGraphTargetYLineNearness = (currentY: number, targetY: number): GraphTargetYLineNearness => {
  const safeCurrent = Number.isFinite(currentY) ? currentY : 0;
  const safeTarget = Number.isFinite(targetY) ? targetY : 0;
  const distance = Math.abs(safeCurrent - safeTarget);
  const radius = Math.max(3, Math.abs(safeTarget) / 4);
  const inRange = distance <= radius;
  const opacity01 = clamp01(1 - (distance / radius));
  return { distance, radius, opacity01, inRange };
};

const resolveCurrentTotalY = (state: GameState): number | null => {
  if (!isRationalCalculatorValue(state.calculator.total)) {
    return null;
  }
  const num = toNumber(state.calculator.total.value.num);
  const den = toNumber(state.calculator.total.value.den);
  if (num == null || den == null || den === 0) {
    return null;
  }
  const value = num / den;
  return Number.isFinite(value) ? value : null;
};

const resolveUnresolvedTotalEqualsUnlocks = (
  state: GameState,
  catalog: UnlockDefinition[],
): UnlockDefinition[] =>
  catalog
    .filter((unlock) => unlock.predicate.type === "total_equals")
    .filter((unlock) => !state.completedUnlockIds.includes(unlock.id))
    .filter((unlock) => !evaluateUnlockPredicate(unlock.predicate, state))
    .sort((left, right) => left.id.localeCompare(right.id));

export const resolveGraphTargetYLineHint = (
  state: GameState,
  catalog: UnlockDefinition[] = getAppServices().contentProvider.unlockCatalog,
): GraphTargetYLineHint | null => {
  const currentY = resolveCurrentTotalY(state);
  if (currentY == null) {
    return null;
  }

  const candidates = resolveUnresolvedTotalEqualsUnlocks(state, catalog);
  for (const unlock of candidates) {
    if (unlock.predicate.type !== "total_equals") {
      continue;
    }
    const targetY = toNumber(unlock.predicate.value);
    if (targetY == null) {
      continue;
    }
    const nearness = resolveGraphTargetYLineNearness(currentY, targetY);
    if (!nearness.inRange) {
      continue;
    }
    return {
      unlockId: unlock.id,
      targetY,
      distance: nearness.distance,
      radius: nearness.radius,
      opacity01: nearness.opacity01,
    };
  }
  return null;
};
