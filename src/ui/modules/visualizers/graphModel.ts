import { buildGraphPoints, isGraphRenderable, type GraphPoint } from "../../../domain/graphProjection.js";

const GRAPH_WINDOW_SIZE = 25;
const MAX_UNLOCKED_TOTAL_DIGITS = 12;

export { buildGraphPoints, isGraphRenderable, type GraphPoint };

export const buildGraphYWindow = (
  unlockedTotalDigits: number,
  radix: number = 10,
): { min: number; max: number } => {
  const clampedDigits = Math.max(1, Math.min(MAX_UNLOCKED_TOTAL_DIGITS, Math.trunc(unlockedTotalDigits)));
  const safeRadix = Math.max(2, Math.trunc(radix));
  const maxMagnitude = Math.pow(safeRadix, clampedDigits) - 1;
  return { min: -maxMagnitude, max: maxMagnitude };
};

export const buildGraphXWindow = (maxXIndex: number): { min: number; max: number } => {
  if (maxXIndex < GRAPH_WINDOW_SIZE) {
    return { min: 0, max: GRAPH_WINDOW_SIZE };
  }
  return { min: maxXIndex - (GRAPH_WINDOW_SIZE - 1), max: maxXIndex };
};
