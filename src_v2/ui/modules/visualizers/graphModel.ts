import { isRationalCalculatorValue } from "../../../../src/domain/calculatorValue.js";
import type { CalculatorValue, RollErrorEntry } from "../../../../src/domain/types.js";

export type GraphPoint = {
  x: number;
  y: number;
  hasError: boolean;
};

const GRAPH_WINDOW_SIZE = 25;
const MAX_UNLOCKED_TOTAL_DIGITS = 12;

export const buildGraphPoints = (roll: CalculatorValue[], rollErrors: RollErrorEntry[] = []): GraphPoint[] => {
  const errorByRollIndex = new Map<number, string>();
  for (const entry of rollErrors) {
    errorByRollIndex.set(entry.rollIndex, entry.code);
  }
  const seenErrorCodes = new Set<string>();
  const points: GraphPoint[] = [];
  for (let index = 0; index < roll.length; index += 1) {
    const errorCode = errorByRollIndex.get(index);
    if (errorCode && seenErrorCodes.has(errorCode)) {
      continue;
    }
    if (errorCode) {
      seenErrorCodes.add(errorCode);
    }
    const value = roll[index];
    if (!isRationalCalculatorValue(value)) {
      continue;
    }
    points.push({
      x: points.length,
      y: Number(value.value.num) / Number(value.value.den),
      hasError: Boolean(errorCode),
    });
  }
  return points;
};

export const buildGraphYWindow = (unlockedTotalDigits: number): { min: number; max: number } => {
  const clampedDigits = Math.max(1, Math.min(MAX_UNLOCKED_TOTAL_DIGITS, Math.trunc(unlockedTotalDigits)));
  const maxMagnitude = Math.pow(10, clampedDigits) - 1;
  return { min: -maxMagnitude, max: maxMagnitude };
};

export const buildGraphXWindow = (rollLength: number): { min: number; max: number } => {
  if (rollLength < GRAPH_WINDOW_SIZE) {
    return { min: 0, max: GRAPH_WINDOW_SIZE };
  }
  return { min: rollLength - GRAPH_WINDOW_SIZE, max: rollLength - 1 };
};

export const isGraphRenderable = (roll: CalculatorValue[], rollErrors: RollErrorEntry[] = []): boolean =>
  buildGraphPoints(roll, rollErrors).length > 0;
