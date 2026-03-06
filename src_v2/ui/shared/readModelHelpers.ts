import type { RollEntry } from "../../../src/domain/types.js";
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
  hasError: boolean;
};

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
    if (value.kind !== "rational") {
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

export const isGraphVisible = (rollEntries: RollEntry[]): boolean => rollEntries.length > 0;
