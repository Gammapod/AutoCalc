import { getAppServices } from "../../../contracts/appServices.js";
import { isRationalCalculatorValue } from "../../../domain/calculatorValue.js";
import type { GameState, UnlockDefinition } from "../../../domain/types.js";
import {
  resolveNearness,
  resolveUnresolvedHintCandidates,
  toFiniteNumber,
} from "./hintProjectionShared.js";

export type NumberLineGoalPlotHint = {
  unlockId: string;
  target: number;
  opacity01: number;
  distance: number;
  radius: number;
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

export const resolveNumberLineGoalPlotHint = (
  state: GameState,
  catalog: UnlockDefinition[] = getAppServices().contentProvider.unlockCatalog,
): NumberLineGoalPlotHint | null => {
  const current = resolveCurrentTotal(state);
  if (current == null) {
    return null;
  }

  const candidates = resolveUnresolvedHintCandidates(state, ["total_equals"], catalog);
  for (const unlock of candidates) {
    const target = toFiniteNumber(unlock.predicate.value);
    if (target == null) {
      continue;
    }
    const nearness = resolveNearness(current, target);
    if (!nearness.inRange) {
      continue;
    }
    return {
      unlockId: unlock.id,
      target,
      opacity01: nearness.opacity01,
      distance: nearness.distance,
      radius: nearness.radius,
    };
  }
  return null;
};
