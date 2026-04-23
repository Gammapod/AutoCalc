import { getAppServices } from "../../../contracts/appServices.js";
import { isRationalCalculatorValue } from "../../../domain/calculatorValue.js";
import { classifyLocalGrowthOrder } from "../../../domain/rollGrowthOrder.js";
import type { GameState, UnlockDefinition } from "../../../domain/types.js";
import {
  resolveNearness,
  resolveUnresolvedHintCandidates,
  toFiniteNumber,
  type HintNearness,
} from "./hintProjectionShared.js";

export type GraphTargetYLineHint = {
  unlockId: string;
  targetY: number;
  distance: number;
  radius: number;
  opacity01: number;
};

export type GraphTargetYLineNearness = HintNearness;

export type GraphTrendBandHint = {
  unlockId: string;
  progressLength: number;
  requiredLength: number;
  opacity01: number;
  points: Array<{ x: number; y: number }>;
};

type TrendPredicateType = "roll_ends_with_incrementing_run" | "roll_ends_with_growth_order_run";

export const resolveGraphTargetYLineNearness = (currentY: number, targetY: number): GraphTargetYLineNearness =>
  resolveNearness(currentY, targetY);

const resolveCurrentTotalY = (state: GameState): number | null => {
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

export const resolveGraphTargetYLineHint = (
  state: GameState,
  catalog: UnlockDefinition[] = getAppServices().contentProvider.unlockCatalog,
): GraphTargetYLineHint | null => {
  const currentY = resolveCurrentTotalY(state);
  if (currentY == null) {
    return null;
  }

  const candidates = resolveUnresolvedHintCandidates(state, ["total_equals"], catalog);
  for (const unlock of candidates) {
    const targetY = toFiniteNumber(unlock.predicate.value);
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

const resolveIntegerRollSuffixProgress = (state: GameState, length: number, step: bigint): number => {
  if (length <= 0 || state.calculator.rollEntries.length < 1) {
    return 0;
  }
  const values = state.calculator.rollEntries.map((entry) => {
    if (!isRationalCalculatorValue(entry.y) || entry.y.value.den !== 1n) {
      return null;
    }
    return entry.y.value.num;
  });
  const maxCandidate = Math.min(length, values.length);
  for (let candidate = maxCandidate; candidate >= 2; candidate -= 1) {
    const tail = values.slice(values.length - candidate);
    if (tail.some((value) => value == null)) {
      continue;
    }
    const integers = tail as bigint[];
    let matched = true;
    for (let index = 1; index < integers.length; index += 1) {
      if (integers[index] !== integers[index - 1] + step) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return candidate;
    }
  }
  return values[values.length - 1] == null ? 0 : 1;
};

const resolveGrowthOrderSuffixProgress = (
  state: GameState,
  length: number,
  order: "linear" | "exponential",
): number => {
  if (length <= 0) {
    return 0;
  }
  let matched = 0;
  for (let index = state.calculator.rollEntries.length - 1; index >= 1 && matched < length; index -= 1) {
    if (classifyLocalGrowthOrder(state, index) !== order) {
      break;
    }
    matched += 1;
  }
  return matched;
};

const resolveTrendProgressLength = (
  state: GameState,
  unlock: (UnlockDefinition & { predicate: Extract<UnlockDefinition["predicate"], { type: TrendPredicateType }> }) | null,
): number => {
  if (!unlock) {
    return 0;
  }
  if (unlock.predicate.type === "roll_ends_with_incrementing_run") {
    return resolveIntegerRollSuffixProgress(state, unlock.predicate.length, unlock.predicate.step ?? 1n);
  }
  return resolveGrowthOrderSuffixProgress(state, unlock.predicate.length, unlock.predicate.order);
};

const resolveTrendPathPoints = (state: GameState, progressLength: number): Array<{ x: number; y: number }> => {
  if (progressLength < 2) {
    return [];
  }
  const fromIndex = Math.max(0, state.calculator.rollEntries.length - progressLength);
  const points: Array<{ x: number; y: number }> = [];
  for (let index = fromIndex; index < state.calculator.rollEntries.length; index += 1) {
    const entry = state.calculator.rollEntries[index];
    if (!entry || !isRationalCalculatorValue(entry.y)) {
      return [];
    }
    const y = toFiniteNumber(entry.y.value.num);
    const den = toFiniteNumber(entry.y.value.den);
    if (y == null || den == null || den === 0) {
      return [];
    }
    points.push({ x: index, y: y / den });
  }
  return points;
};

export const resolveGraphTrendBandHint = (
  state: GameState,
  catalog: UnlockDefinition[] = getAppServices().contentProvider.unlockCatalog,
): GraphTrendBandHint | null => {
  const candidates = resolveUnresolvedHintCandidates(
    state,
    ["roll_ends_with_growth_order_run", "roll_ends_with_incrementing_run"],
    catalog,
  );
  for (const unlock of candidates) {
    const requiredLength = unlock.predicate.length;
    const progressLength = resolveTrendProgressLength(state, unlock);
    if (requiredLength <= 0 || progressLength <= 0) {
      continue;
    }
    const points = resolveTrendPathPoints(state, progressLength);
    if (points.length < 2) {
      continue;
    }
    const opacity01 = Math.max(0, Math.min(1, progressLength / requiredLength));
    if (opacity01 <= 0) {
      continue;
    }
    return {
      unlockId: unlock.id,
      progressLength,
      requiredLength,
      opacity01,
      points,
    };
  }
  return null;
};
