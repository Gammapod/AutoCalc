import { isRationalCalculatorValue } from "./calculatorValue.js";
import { getSeedRow, getStepRows } from "./rollEntries.js";
import type { RollEntry } from "./types.js";

export type GraphPoint = {
  x: number;
  y: number;
  kind?: "seed" | "roll" | "remainder";
  hasError: boolean;
};

export const buildGraphPoints = (rollEntries: RollEntry[]): GraphPoint[] => {
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

export const isGraphRenderable = (rollEntries: RollEntry[]): boolean =>
  buildGraphPoints(rollEntries).length > 0;
