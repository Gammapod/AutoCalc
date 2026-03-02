import type { CalculatorValue, RollErrorEntry } from "../../../src/domain/types.js";
export {
  buildOperationSlotDisplay,
  buildRollViewModel,
  buildUnlockRows,
  formatKeyLabel,
  formatOperatorForDisplay,
  getKeyVisualGroup,
} from "../../../src/ui/shared/renderReadModel.js";

export type GraphPoint = {
  x: number;
  y: number;
  hasError: boolean;
};

export const buildGraphPoints = (roll: CalculatorValue[], rollErrors: RollErrorEntry[] = []): GraphPoint[] => {
  const errorByRollIndex = new Set(rollErrors.map((entry) => entry.rollIndex));
  const points: GraphPoint[] = [];
  for (let index = 0; index < roll.length; index += 1) {
    const value = roll[index];
    if (value.kind !== "rational") {
      continue;
    }
    points.push({
      x: points.length,
      y: Number(value.value.num) / Number(value.value.den),
      hasError: errorByRollIndex.has(index),
    });
  }
  return points;
};

export const isGraphVisible = (roll: CalculatorValue[]): boolean => roll.length > 0;
