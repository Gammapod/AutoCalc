import type { RollEntry } from "../../../domain/types.js";
import { buildGraphPoints, isGraphRenderable, type GraphPoint } from "../../../domain/graphProjection.js";

const GRAPH_WINDOW_SIZE = 25;

export { buildGraphPoints, isGraphRenderable, type GraphPoint };

const toTierMagnitude = (value: number, radix: number): number => {
  const abs = Math.abs(value);
  if (!Number.isFinite(abs) || abs < 1) {
    return radix - 1;
  }
  const digits = Math.floor(Math.log(abs) / Math.log(radix)) + 1;
  const tier = Math.pow(radix, Math.max(1, digits)) - 1;
  return Number.isFinite(tier) ? tier : Number.MAX_VALUE;
};

export const buildGraphYWindow = (
  rollEntries: RollEntry[],
  radix: number = 10,
): { min: number; max: number } => {
  const safeRadix = Math.max(2, Math.trunc(radix));
  if (rollEntries.length < 1) {
    return { min: 0, max: safeRadix - 1 };
  }

  const points = buildGraphPoints(rollEntries).filter((point) => point.kind !== "remainder");
  if (points.length < 1) {
    return { min: 0, max: safeRadix - 1 };
  }

  let maxPositiveRounded = 0;
  let minNegativeRounded = 0;
  let hasPositive = false;
  let hasNegative = false;
  let hasZero = false;

  for (const point of points) {
    const value = point.y;
    if (!Number.isFinite(value)) {
      continue;
    }
    if (value > 0) {
      const rounded = Math.ceil(value);
      maxPositiveRounded = hasPositive ? Math.max(maxPositiveRounded, rounded) : rounded;
      hasPositive = true;
      continue;
    }
    if (value < 0) {
      const rounded = Math.floor(value);
      minNegativeRounded = hasNegative ? Math.min(minNegativeRounded, rounded) : rounded;
      hasNegative = true;
      continue;
    }
    hasZero = true;
  }

  const min = hasNegative ? -toTierMagnitude(minNegativeRounded, safeRadix) : 0;
  let max = 0;
  if (hasPositive) {
    max = toTierMagnitude(maxPositiveRounded, safeRadix);
  } else if (hasZero) {
    max = safeRadix - 1;
  }

  return { min, max };
};

export const buildGraphXWindow = (maxXIndex: number): { min: number; max: number } => {
  if (maxXIndex < GRAPH_WINDOW_SIZE) {
    return { min: 0, max: GRAPH_WINDOW_SIZE };
  }
  return { min: maxXIndex - (GRAPH_WINDOW_SIZE - 1), max: maxXIndex };
};
