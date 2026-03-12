import { isRationalCalculatorValue } from "../../../domain/calculatorValue.js";
import { getSeedRow, getStepRows } from "../../../domain/rollEntries.js";
import type { RollEntry } from "../../../domain/types.js";

export type GraphPoint = {
  x: number;
  y: number;
  kind?: "seed" | "roll" | "remainder";
  hasError: boolean;
};

const GRAPH_WINDOW_SIZE = 25;
const MAX_UNLOCKED_TOTAL_DIGITS = 12;

export const buildGraphPoints = (
  rollEntries: RollEntry[],
): GraphPoint[] => {
  const points: GraphPoint[] = [];
  const seed = getSeedRow(rollEntries)?.y;
  if (seed && isRationalCalculatorValue(seed)) {
    points.push({
      x: 0,
      y: Number(seed.value.num) / Number(seed.value.den),
      kind: "seed",
      hasError: false,
    });
  }
  const stepRows = getStepRows(rollEntries);
  for (let index = 0; index < stepRows.length; index += 1) {
    const entry = stepRows[index];
    const x = index + 1;
    const value = entry.y;
    if (!isRationalCalculatorValue(value)) {
      if (entry.remainder) {
        points.push({
          x,
          y: Number(entry.remainder.num) / Number(entry.remainder.den),
          kind: "remainder",
          hasError: false,
        });
      }
      continue;
    }
    points.push({
      x,
      y: Number(value.value.num) / Number(value.value.den),
      kind: "roll",
      hasError: Boolean(entry.error),
    });
    if (entry.remainder) {
      points.push({
        x,
        y: Number(entry.remainder.num) / Number(entry.remainder.den),
        kind: "remainder",
        hasError: false,
      });
    }
  }
  return points;
};

export const buildGraphYWindow = (
  unlockedTotalDigits: number,
): { min: number; max: number } => {
  const clampedDigits = Math.max(1, Math.min(MAX_UNLOCKED_TOTAL_DIGITS, Math.trunc(unlockedTotalDigits)));
  const maxMagnitude = Math.pow(10, clampedDigits) - 1;
  return { min: -maxMagnitude, max: maxMagnitude };
};

export const buildGraphXWindow = (maxXIndex: number): { min: number; max: number } => {
  if (maxXIndex < GRAPH_WINDOW_SIZE) {
    return { min: 0, max: GRAPH_WINDOW_SIZE };
  }
  return { min: maxXIndex - (GRAPH_WINDOW_SIZE - 1), max: maxXIndex };
};

export const isGraphRenderable = (rollEntries: RollEntry[]): boolean =>
  buildGraphPoints(rollEntries).length > 0;
