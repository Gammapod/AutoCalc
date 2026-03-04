import type { CalculatorValue, RollErrorEntry } from "../../../src/domain/types.js";
export {
  buildOperationSlotDisplay,
  buildRollViewModel,
  buildVisibleChecklistRows,
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
    if (value.kind !== "rational") {
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

export const isGraphVisible = (roll: CalculatorValue[]): boolean => roll.length > 0;
