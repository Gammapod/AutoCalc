import { isRationalCalculatorValue } from "../../../../src/domain/calculatorValue.js";
import type { RollEntry } from "../../../../src/domain/types.js";

export type GraphPoint = {
  x: number;
  y: number;
  hasError: boolean;
};

const GRAPH_WINDOW_SIZE = 25;
const MAX_UNLOCKED_TOTAL_DIGITS = 12;

export const buildGraphPoints = (rollEntries: RollEntry[]): GraphPoint[] => {
  const points: GraphPoint[] = [];
  let previousVisibleErrorCode: string | undefined;
  for (let index = 0; index < rollEntries.length; index += 1) {
    const entry = rollEntries[index];
    const errorCode = entry.error?.code;
    if (errorCode && errorCode === previousVisibleErrorCode) {
      continue;
    }
    const value = entry.y;
    if (!isRationalCalculatorValue(value)) {
      previousVisibleErrorCode = errorCode;
      continue;
    }
    points.push({
      x: points.length,
      y: Number(value.value.num) / Number(value.value.den),
      hasError: Boolean(errorCode),
    });
    previousVisibleErrorCode = errorCode;
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

export const isGraphRenderable = (rollEntries: RollEntry[]): boolean => buildGraphPoints(rollEntries).length > 0;
