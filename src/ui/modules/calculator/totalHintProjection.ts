import { getAppServices } from "../../../contracts/appServices.js";
import { isRationalCalculatorValue } from "../../../domain/calculatorValue.js";
import type { GameState, UnlockDefinition } from "../../../domain/types.js";
import {
  clamp01,
  resolveNearnessRadius,
  resolveUnresolvedHintCandidates,
  toFiniteNumber,
} from "../visualizers/hintProjectionShared.js";

export type TotalThresholdMarkerHint = {
  unlockId: string;
  direction: "at_least" | "at_most";
  threshold: number;
  distance: number;
  radius: number;
  opacity01: number;
};

const resolveCurrentTotal = (state: GameState): number | null => {
  if (!isRationalCalculatorValue(state.calculator.total)) {
    return null;
  }
  const num = toFiniteNumber(state.calculator.total.value.num);
  const den = toFiniteNumber(state.calculator.total.value.den);
  if (num == null || den == null || den === 0) {
    return null;
  }
  const value = num / den;
  return Number.isFinite(value) ? value : null;
};

const resolveDirectionalDistance = (
  current: number,
  direction: "at_least" | "at_most",
  threshold: number,
): number => {
  if (direction === "at_least") {
    return Math.max(0, threshold - current);
  }
  return Math.max(0, current - threshold);
};

export const resolveTotalThresholdMarkerHint = (
  state: GameState,
  catalog: UnlockDefinition[] = getAppServices().contentProvider.unlockCatalog,
): TotalThresholdMarkerHint | null => {
  const current = resolveCurrentTotal(state);
  if (current == null) {
    return null;
  }
  const candidates = resolveUnresolvedHintCandidates(state, ["total_at_least", "total_at_most"], catalog);
  for (const unlock of candidates) {
    const direction = unlock.predicate.type === "total_at_least" ? "at_least" : "at_most";
    const threshold = toFiniteNumber(unlock.predicate.value);
    if (threshold == null) {
      continue;
    }
    const distance = resolveDirectionalDistance(current, direction, threshold);
    const radius = resolveNearnessRadius(threshold);
    const inRange = distance <= radius;
    if (!inRange) {
      continue;
    }
    const opacity01 = clamp01(1 - (distance / radius));
    return {
      unlockId: unlock.id,
      direction,
      threshold,
      distance,
      radius,
      opacity01,
    };
  }
  return null;
};
