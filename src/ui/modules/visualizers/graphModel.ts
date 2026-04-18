import type { RollCycleMetadata, RollEntry } from "../../../domain/types.js";
import { buildGraphPoints, isGraphRenderable, type GraphPoint } from "../../../domain/graphProjection.js";
import { normalizePlotRadix, resolveAsymmetricTierDomain } from "./plotPolicy.js";

const GRAPH_WINDOW_SIZE = 25;

export { buildGraphPoints, isGraphRenderable, type GraphPoint };

export type GraphCycleOverlaySegmentKind = "chain" | "closure";

export type GraphCycleOverlaySegment = {
  kind: GraphCycleOverlaySegmentKind;
  from: { x: number; y: number };
  to: { x: number; y: number };
};

const isRealGraphPoint = (point: GraphPoint): boolean =>
  point.kind === "seed" || point.kind === "roll";
const isImaginaryGraphPoint = (point: GraphPoint): boolean =>
  point.kind === "imaginary";

const clipSegmentToXWindow = (
  segment: GraphCycleOverlaySegment,
  xWindow: { min: number; max: number },
): GraphCycleOverlaySegment | null => {
  const min = xWindow.min;
  const max = xWindow.max;
  const from = segment.from;
  const to = segment.to;
  const dx = to.x - from.x;

  const inside = (x: number): boolean => x >= min && x <= max;
  if (inside(from.x) && inside(to.x)) {
    return segment;
  }
  if (Math.abs(dx) < 1e-12) {
    return null;
  }

  let t0 = 0;
  let t1 = 1;
  const updateBounds = (p: number, q: number): boolean => {
    if (Math.abs(p) < 1e-12) {
      return q >= 0;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) {
        return false;
      }
      if (r > t0) {
        t0 = r;
      }
      return true;
    }
    if (r < t0) {
      return false;
    }
    if (r < t1) {
      t1 = r;
    }
    return true;
  };

  if (!updateBounds(-dx, from.x - min) || !updateBounds(dx, max - from.x)) {
    return null;
  }
  if (t0 > t1) {
    return null;
  }

  const lerp = (start: number, end: number, t: number): number => start + ((end - start) * t);
  return {
    kind: segment.kind,
    from: {
      x: lerp(from.x, to.x, t0),
      y: lerp(from.y, to.y, t0),
    },
    to: {
      x: lerp(from.x, to.x, t1),
      y: lerp(from.y, to.y, t1),
    },
  };
};

export const resolveGraphCycleOverlaySegments = (
  points: readonly GraphPoint[],
  options: {
    cycleEnabled: boolean;
    cycle: RollCycleMetadata | null;
    xWindow: { min: number; max: number };
  },
): GraphCycleOverlaySegment[] => {
  if (!options.cycleEnabled || !options.cycle) {
    return [];
  }
  const periodLength = options.cycle.periodLength;
  if (!Number.isInteger(periodLength) || periodLength < 1) {
    return [];
  }

  const spanLength = periodLength + 1;
  const realPoints = points.filter((point) => isRealGraphPoint(point));
  const latestSpan = resolveCycleSpanFromLatest(realPoints, spanLength, (point) => point.kind === "roll");
  if (!latestSpan) {
    return [];
  }

  return buildCycleSegments(latestSpan)
    .map((segment) => clipSegmentToXWindow(segment, options.xWindow))
    .filter((segment): segment is GraphCycleOverlaySegment => Boolean(segment));
};

const resolveCycleSpanFromLatest = (
  channelPoints: readonly GraphPoint[],
  spanLength: number,
  isLatestPoint: (point: GraphPoint) => boolean,
): GraphPoint[] | null => {
  let latestIndex = -1;
  for (let index = channelPoints.length - 1; index >= 0; index -= 1) {
    if (isLatestPoint(channelPoints[index]!)) {
      latestIndex = index;
      break;
    }
  }
  if (latestIndex < 0) {
    return null;
  }
  const spanStart = latestIndex - (spanLength - 1);
  if (spanStart < 0) {
    return null;
  }
  const span = channelPoints.slice(spanStart, latestIndex + 1);
  return span.length >= 2 ? span : null;
};

const buildCycleSegments = (span: readonly GraphPoint[]): GraphCycleOverlaySegment[] => {
  const segments: GraphCycleOverlaySegment[] = [];
  for (let index = 1; index < span.length; index += 1) {
    segments.push({
      kind: "chain",
      from: { x: span[index - 1]!.x, y: span[index - 1]!.y },
      to: { x: span[index]!.x, y: span[index]!.y },
    });
  }
  const first = span[0];
  const last = span[span.length - 1];
  if (first && last && Math.abs(first.y - last.y) < 1e-12) {
    segments.push({
      kind: "closure",
      from: { x: first.x, y: first.y },
      to: { x: last.x, y: last.y },
    });
  }
  return segments;
};

export const resolveGraphImaginaryCycleOverlaySegments = (
  points: readonly GraphPoint[],
  options: {
    cycleEnabled: boolean;
    cycle: RollCycleMetadata | null;
    xWindow: { min: number; max: number };
  },
): GraphCycleOverlaySegment[] => {
  if (!options.cycleEnabled || !options.cycle) {
    return [];
  }
  const periodLength = options.cycle.periodLength;
  if (!Number.isInteger(periodLength) || periodLength < 1) {
    return [];
  }

  let latestRollX: number | null = null;
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];
    if (point?.kind === "roll") {
      latestRollX = point.x;
      break;
    }
  }
  if (latestRollX === null) {
    return [];
  }

  const imaginaryPoints = points
    .filter((point) => isImaginaryGraphPoint(point) && point.x <= latestRollX);
  const spanLength = periodLength + 1;
  const latestSpan = resolveCycleSpanFromLatest(imaginaryPoints, spanLength, (point) => point.x === latestRollX);
  if (!latestSpan) {
    return [];
  }

  return buildCycleSegments(latestSpan)
    .map((segment) => clipSegmentToXWindow(segment, options.xWindow))
    .filter((segment): segment is GraphCycleOverlaySegment => Boolean(segment));
};

export const buildGraphYWindow = (
  rollEntries: RollEntry[],
  radix: number = 10,
): { min: number; max: number } => {
  const safeRadix = normalizePlotRadix(radix);
  if (rollEntries.length < 1) {
    return { min: 0, max: safeRadix - 1 };
  }

  const points = buildGraphPoints(rollEntries);
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
