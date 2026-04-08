import type { RollEntry } from "../../../domain/types.js";
import { buildGraphPoints, isGraphRenderable, type GraphPoint } from "../../../domain/graphProjection.js";
import { normalizePlotRadix, resolveAsymmetricTierDomain } from "./plotPolicy.js";

const GRAPH_WINDOW_SIZE = 25;

export { buildGraphPoints, isGraphRenderable, type GraphPoint };

export const buildGraphYWindow = (
  rollEntries: RollEntry[],
  radix: number = 10,
): { min: number; max: number } => {
  const safeRadix = normalizePlotRadix(radix);
  if (rollEntries.length < 1) {
    return { min: 0, max: safeRadix - 1 };
  }

  const points = buildGraphPoints(rollEntries).filter((point) => point.kind !== "remainder");
  if (points.length < 1) {
    return { min: 0, max: safeRadix - 1 };
  }
  return resolveAsymmetricTierDomain(points.map((point) => point.y), safeRadix);
};

export const buildGraphXWindow = (maxXIndex: number): { min: number; max: number } => {
  if (maxXIndex < GRAPH_WINDOW_SIZE) {
    return { min: 0, max: GRAPH_WINDOW_SIZE };
  }
  return { min: maxXIndex - (GRAPH_WINDOW_SIZE - 1), max: maxXIndex };
};
