import type { CalculatorValue, RollEntry } from "../../../src/domain/types.js";
export {
  buildOperationSlotDisplay,
  buildRollViewModel,
  buildVisibleChecklistRows,
  buildUnlockRows,
  formatKeyLabel,
  formatOperatorForDisplay,
  getKeyVisualGroup,
} from "./readModel.js";

export type GraphPoint = {
  x: number;
  y: number;
  kind?: "seed" | "roll" | "remainder";
  hasError: boolean;
};

export const buildGraphPoints = (
  rollEntries: RollEntry[],
  seedSnapshot?: CalculatorValue,
): GraphPoint[] => {
  const points: GraphPoint[] = [];
  if (seedSnapshot?.kind === "rational") {
    points.push({
      x: 0,
      y: Number(seedSnapshot.value.num) / Number(seedSnapshot.value.den),
      kind: "seed",
      hasError: false,
    });
  }
  for (let index = 0; index < rollEntries.length; index += 1) {
    const entry = rollEntries[index];
    const x = index + 1;
    const value = entry.y;
    if (value.kind !== "rational") {
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

export const isGraphVisible = (rollEntries: RollEntry[]): boolean => rollEntries.length > 0;
