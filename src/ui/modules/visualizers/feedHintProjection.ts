import { getAppServices } from "../../../contracts/appServices.js";
import { isRationalCalculatorValue } from "../../../domain/calculatorValue.js";
import type { GameState, RationalValue, RollEntry, UnlockDefinition } from "../../../domain/types.js";
import {
  clamp01,
  resolveUnresolvedHintCandidates,
  toFiniteNumber,
} from "./hintProjectionShared.js";

export type FeedCycleLengthHint = {
  unlockId: string;
  startX: number;
  endX: number;
  opacity01: number;
};

export type FeedCycleDiameterHint = {
  unlockId: string;
  minX: number;
  maxX: number;
  opacity01: number;
};

const compareRational = (left: RationalValue, right: RationalValue): -1 | 0 | 1 => {
  const leftCross = left.num * right.den;
  const rightCross = right.num * left.den;
  if (leftCross < rightCross) {
    return -1;
  }
  if (leftCross > rightCross) {
    return 1;
  }
  return 0;
};

const subtractRational = (left: RationalValue, right: RationalValue): RationalValue => ({
  num: left.num * right.den - right.num * left.den,
  den: left.den * right.den,
});

const resolveActiveCycleSpan = (state: GameState): { startIndex: number; endIndex: number; entries: RollEntry[] } | null => {
  const cycle = state.calculator.rollAnalysis.stopReason === "cycle" ? state.calculator.rollAnalysis.cycle : null;
  if (!cycle || cycle.periodLength < 1) {
    return null;
  }
  const endIndex = state.calculator.rollEntries.length - 1;
  if (endIndex < 0 || endIndex < cycle.j) {
    return null;
  }
  const startIndex = endIndex - cycle.periodLength;
  if (startIndex < 0) {
    return null;
  }
  const entries = state.calculator.rollEntries.slice(startIndex, endIndex + 1);
  if (entries.length < 2) {
    return null;
  }
  return { startIndex, endIndex, entries };
};

export const resolveFeedCycleLengthHint = (
  state: GameState,
  catalog: UnlockDefinition[] = getAppServices().contentProvider.unlockCatalog,
): FeedCycleLengthHint | null => {
  const span = resolveActiveCycleSpan(state);
  if (!span) {
    return null;
  }
  const candidate = resolveUnresolvedHintCandidates(state, ["roll_cycle_period_at_least"], catalog)[0] ?? null;
  if (!candidate) {
    return null;
  }
  const required = candidate.predicate.length;
  if (!Number.isFinite(required) || required <= 0) {
    return null;
  }
  const cycle = state.calculator.rollAnalysis.cycle;
  const periodLength = cycle?.periodLength ?? 0;
  const opacity01 = clamp01(periodLength / required);
  if (opacity01 <= 0) {
    return null;
  }
  return {
    unlockId: candidate.id,
    startX: span.startIndex,
    endX: span.endIndex,
    opacity01,
  };
};

export const resolveFeedCycleDiameterHint = (
  state: GameState,
  catalog: UnlockDefinition[] = getAppServices().contentProvider.unlockCatalog,
): FeedCycleDiameterHint | null => {
  const span = resolveActiveCycleSpan(state);
  if (!span) {
    return null;
  }
  const candidate = resolveUnresolvedHintCandidates(state, ["roll_cycle_diameter_at_least"], catalog)[0] ?? null;
  if (!candidate) {
    return null;
  }
  const target = toFiniteNumber(candidate.predicate.diameter);
  if (target == null || target <= 0) {
    return null;
  }

  let minEntry: { x: number; value: RationalValue } | null = null;
  let maxEntry: { x: number; value: RationalValue } | null = null;
  for (let offset = 0; offset < span.entries.length; offset += 1) {
    const entry = span.entries[offset];
    if (!entry || !isRationalCalculatorValue(entry.y)) {
      return null;
    }
    const value = entry.y.value;
    const x = span.startIndex + offset;
    if (!minEntry || compareRational(value, minEntry.value) < 0) {
      minEntry = { x, value };
    }
    if (!maxEntry || compareRational(value, maxEntry.value) > 0) {
      maxEntry = { x, value };
    }
  }
  if (!minEntry || !maxEntry) {
    return null;
  }

  const diameter = subtractRational(maxEntry.value, minEntry.value);
  const diameterNum = toFiniteNumber(diameter.num);
  const diameterDen = toFiniteNumber(diameter.den);
  if (diameterNum == null || diameterDen == null || diameterDen === 0) {
    return null;
  }
  const diameterValue = diameterNum / diameterDen;
  if (!Number.isFinite(diameterValue)) {
    return null;
  }
  const opacity01 = clamp01(diameterValue / target);
  if (opacity01 <= 0) {
    return null;
  }

  return {
    unlockId: candidate.id,
    minX: minEntry.x,
    maxX: maxEntry.x,
    opacity01,
  };
};
