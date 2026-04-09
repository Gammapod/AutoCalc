import type { CalculatorValue, GameState, ScalarValue } from "../../../domain/types.js";
import { isScalarValueZero } from "../../../domain/calculatorValue.js";
import { expressionToRational } from "../../../domain/expression.js";
import { algebraicToApproxNumber, algebraicToRational } from "../../../domain/algebraicScalar.js";
import { HISTORY_FLAG } from "../../../domain/state.js";
import { applyAutoStepTick } from "../../../domain/reducer.input.core.js";
import { handleEqualsInput } from "../../../domain/reducer.input.handlers.execution.js";
import { resolveSymmetricTierRange } from "./plotPolicy.js";

export type NumberLineMode = "real" | "complex_grid";
export type Point = { x: number; y: number };
export type Segment = { from: Point; to: Point };
export type NumberLineVectorKind = "current" | "history" | "forecast_history" | "forecast_step";
export type NumberLineVectorTipKind = "dot" | "arrow";
export type NumberLineVectorLayer = {
  kind: NumberLineVectorKind;
  tipKind: NumberLineVectorTipKind;
  segment: Segment;
  magnitudeSq: number;
  recencyOrder: number;
};
export type NumberLineGeometry = {
  subdivisions: {
    parts: number;
    centerIndex: number;
    x: number[];
    y: number[];
  };
  horizontal: {
    axis: Segment;
    arrowLeft: [Point, Point, Point];
    arrowRight: [Point, Point, Point];
  };
  vertical: {
    axis: Segment;
    arrowUp: [Point, Point, Point];
    arrowDown: [Point, Point, Point];
  };
  realTicks: {
    y1: number;
    y2: number;
  };
  centerTick: Segment;
  origin: Point;
  plotBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
};

export const NUMBER_LINE_VECTOR_ARROW_TIP = {
  headLength: 1.15,
  headWidth: 0.82,
  minSegmentLength: 0.0001,
} as const;

const SUBDIVISION_PARTS = 18;

const resolveSubdivisionValues = (start: number, end: number): number[] => {
  const step = (end - start) / SUBDIVISION_PARTS;
  return Array.from({ length: SUBDIVISION_PARTS + 1 }, (_unused, index) => start + (step * index));
};

export const NUMBER_LINE_GEOMETRY: NumberLineGeometry = {
  subdivisions: {
    parts: SUBDIVISION_PARTS,
    centerIndex: SUBDIVISION_PARTS / 2,
    x: resolveSubdivisionValues(4, 96),
    y: resolveSubdivisionValues(-34, 58),
  },
  horizontal: {
    axis: { from: { x: 2, y: 12 }, to: { x: 98, y: 12 } },
    arrowLeft: [{ x: 0, y: 12 }, { x: 4, y: 10 }, { x: 4, y: 14 }],
    arrowRight: [{ x: 100, y: 12 }, { x: 96, y: 10 }, { x: 96, y: 14 }],
  },
  vertical: {
    axis: { from: { x: 50, y: -36 }, to: { x: 50, y: 60 } },
    arrowUp: [{ x: 50, y: -38 }, { x: 48, y: -34 }, { x: 52, y: -34 }],
    arrowDown: [{ x: 50, y: 62 }, { x: 48, y: 58 }, { x: 52, y: 58 }],
  },
  realTicks: {
    y1: 10.75,
    y2: 13.25,
  },
  centerTick: { from: { x: 50, y: 9.5 }, to: { x: 50, y: 14.5 } },
  origin: { x: 50, y: 12 },
  plotBounds: {
    minX: 4,
    maxX: 96,
    minY: -34,
    maxY: 58,
  },
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const toScalarNumber = (value: ScalarValue): number | null => {
  if (value.kind === "rational") {
    if (value.value.den === 0n) {
      return null;
    }
    return Number(value.value.num) / Number(value.value.den);
  }
  if (value.kind === "alg") {
    const asRational = algebraicToRational(value.value);
    if (asRational) {
      if (asRational.den === 0n) {
        return null;
      }
      return Number(asRational.num) / Number(asRational.den);
    }
    return algebraicToApproxNumber(value.value);
  }
  const asRational = expressionToRational(value.value);
  if (!asRational || asRational.den === 0n) {
    return null;
  }
  return Number(asRational.num) / Number(asRational.den);
};

export const hasNonZeroImaginaryPart = (state: GameState): boolean =>
  state.calculator.total.kind === "complex" && !isScalarValueZero(state.calculator.total.value.im);

export const resolveNumberLineMode = (state: GameState): NumberLineMode =>
  hasNonZeroImaginaryPart(state) ? "complex_grid" : "real";

export const calculatorValueToArgandPoint = (value: CalculatorValue): { re: number; im: number } | null => {
  if (value.kind === "nan") {
    return null;
  }
  if (value.kind === "complex") {
    const re = toScalarNumber(value.value.re);
    const im = toScalarNumber(value.value.im);
    if (re === null || im === null) {
      return null;
    }
    return { re, im };
  }
  if (value.kind === "rational") {
    if (value.value.den === 0n) {
      return null;
    }
    return { re: Number(value.value.num) / Number(value.value.den), im: 0 };
  }
  const asRational = expressionToRational(value.value);
  if (!asRational || asRational.den === 0n) {
    return null;
  }
  return { re: Number(asRational.num) / Number(asRational.den), im: 0 };
};

const resolveRadix = (state: GameState): number => (state.settings.base === "base2" ? 2 : 10);

export const resolveForecastValueForState = (state: GameState): CalculatorValue | null => {
  const stepForecastValues = resolveStepForecastValuesForState(state);
  return stepForecastValues[stepForecastValues.length - 1] ?? null;
};

export const resolveStepForecastValuesForState = (state: GameState): CalculatorValue[] => {
  if (state.settings.stepExpansion !== "on") {
    return [];
  }
  if (state.calculator.rollEntries.length < 1) {
    return [];
  }
  const nextState = applyAutoStepTick(state);
  const nextStepValue =
    nextState !== state
      ? (nextState.calculator.rollEntries.length > state.calculator.rollEntries.length
        ? (nextState.calculator.rollEntries[nextState.calculator.rollEntries.length - 1]?.y ?? null)
        : nextState.calculator.stepProgress.currentTotal)
      : null;
  if (state.calculator.stepProgress.active) {
    const values = [...state.calculator.stepProgress.executedSlotResults];
    if (nextStepValue) {
      values.push(nextStepValue);
    }
    return values;
  }
  if (nextStepValue) {
    return [nextStepValue];
  }
  return [];
};

export const resolveHistoryForecastValueForState = (state: GameState): CalculatorValue | null => {
  const historyEnabled = Boolean(state.ui.buttonFlags[HISTORY_FLAG]);
  if (!historyEnabled) {
    return null;
  }
  if (state.calculator.rollEntries.length < 1) {
    return null;
  }
  const simulated = handleEqualsInput(state);
  if (simulated === state) {
    return null;
  }
  const priorRollCount = state.calculator.rollEntries.length;
  const nextRollCount = simulated.calculator.rollEntries.length;
  if (nextRollCount > priorRollCount) {
    return simulated.calculator.rollEntries[nextRollCount - 1]?.y ?? null;
  }
  if (simulated.calculator.stepProgress.currentTotal) {
    return simulated.calculator.stepProgress.currentTotal;
  }
  return simulated.calculator.total;
};

const resolveSegmentMagnitudeSq = (segment: Segment): number => {
  const dx = segment.to.x - segment.from.x;
  const dy = segment.to.y - segment.from.y;
  return (dx * dx) + (dy * dy);
};

const sortVectorLayers = (layers: readonly NumberLineVectorLayer[]): NumberLineVectorLayer[] =>
  [...layers].sort((left, right) => {
    if (left.magnitudeSq !== right.magnitudeSq) {
      return right.magnitudeSq - left.magnitudeSq;
    }
    return left.recencyOrder - right.recencyOrder;
  });

export const resolvePlotRangeForState = (state: GameState): number => {
  const radix = resolveRadix(state);
  const plottedValues: CalculatorValue[] = [];
  const latestRoll = state.calculator.rollEntries[state.calculator.rollEntries.length - 1];
  if (latestRoll?.y) {
    plottedValues.push(latestRoll.y);
  }
  const historyEnabled = Boolean(state.ui.buttonFlags[HISTORY_FLAG]);
  if (historyEnabled) {
    const previousRoll = state.calculator.rollEntries[state.calculator.rollEntries.length - 2];
    if (previousRoll?.y) {
      plottedValues.push(previousRoll.y);
    }
  }
  const historyForecastValue = resolveHistoryForecastValueForState(state);
  if (historyForecastValue) {
    plottedValues.push(historyForecastValue);
  }
  plottedValues.push(...resolveStepForecastValuesForState(state));

  let maxAbsComponent = 0;
  for (const value of plottedValues) {
    const argand = calculatorValueToArgandPoint(value);
    if (!argand) {
      continue;
    }
    maxAbsComponent = Math.max(maxAbsComponent, Math.abs(argand.re), Math.abs(argand.im));
  }
  if (!Number.isFinite(maxAbsComponent) || maxAbsComponent < 0) {
    maxAbsComponent = 0;
  }
  return resolveSymmetricTierRange(maxAbsComponent, radix);
};

export const resolveVectorEndpoint = (
  geometry: NumberLineGeometry,
  argand: { re: number; im: number },
  range: number,
): Point => {
  const halfWidth = (geometry.plotBounds.maxX - geometry.plotBounds.minX) / 2;
  const halfHeight = (geometry.plotBounds.maxY - geometry.plotBounds.minY) / 2;
  const normalizedRe = clamp(argand.re / range, -1, 1);
  const normalizedIm = clamp(argand.im / range, -1, 1);
  return {
    x: geometry.origin.x + (normalizedRe * halfWidth),
    y: geometry.origin.y - (normalizedIm * halfHeight),
  };
};

export const resolveVectorSegmentForState = (
  state: GameState,
  geometry: NumberLineGeometry = NUMBER_LINE_GEOMETRY,
): Segment | null => {
  if (state.calculator.rollEntries.length < 1) {
    return null;
  }
  const latestRoll = state.calculator.rollEntries[state.calculator.rollEntries.length - 1];
  const value = latestRoll?.y ?? state.calculator.total;
  const argand = calculatorValueToArgandPoint(value);
  if (!argand) {
    return null;
  }
  return {
    from: geometry.origin,
    to: resolveVectorEndpoint(geometry, argand, resolvePlotRangeForState(state)),
  };
};

export const resolveForecastVectorSegmentForState = (
  state: GameState,
  geometry: NumberLineGeometry = NUMBER_LINE_GEOMETRY,
): Segment | null => {
  const forecastValue = resolveStepForecastValuesForState(state)[0] ?? null;
  if (!forecastValue) {
    return null;
  }
  const argand = calculatorValueToArgandPoint(forecastValue);
  if (!argand) {
    return null;
  }
  const currentSegment = resolveVectorSegmentForState(state, geometry);
  if (!currentSegment) {
    return null;
  }
  return {
    from: currentSegment.to,
    to: resolveVectorEndpoint(geometry, argand, resolvePlotRangeForState(state)),
  };
};

export const resolveStepForecastVectorSegmentsForState = (
  state: GameState,
  geometry: NumberLineGeometry = NUMBER_LINE_GEOMETRY,
): Segment[] => {
  const currentSegment = resolveVectorSegmentForState(state, geometry);
  if (!currentSegment) {
    return [];
  }
  const forecastValues = resolveStepForecastValuesForState(state);
  if (forecastValues.length < 1) {
    return [];
  }
  const range = resolvePlotRangeForState(state);
  const endpoints = forecastValues
    .map((value) => calculatorValueToArgandPoint(value))
    .filter((value): value is { re: number; im: number } => Boolean(value))
    .map((argand) => resolveVectorEndpoint(geometry, argand, range));
  if (endpoints.length < 1) {
    return [];
  }
  const segments: Segment[] = [];
  let from = currentSegment.to;
  for (const endpoint of endpoints) {
    segments.push({ from, to: endpoint });
    from = endpoint;
  }
  return segments;
};

export const resolveHistoryForecastVectorSegmentForState = (
  state: GameState,
  geometry: NumberLineGeometry = NUMBER_LINE_GEOMETRY,
): Segment | null => {
  const forecastValue = resolveHistoryForecastValueForState(state);
  if (!forecastValue) {
    return null;
  }
  const argand = calculatorValueToArgandPoint(forecastValue);
  if (!argand) {
    return null;
  }
  const currentSegment = resolveVectorSegmentForState(state, geometry);
  if (!currentSegment) {
    return null;
  }
  return {
    from: currentSegment.to,
    to: resolveVectorEndpoint(geometry, argand, resolvePlotRangeForState(state)),
  };
};

export const resolveHistoryVectorSegmentForState = (
  state: GameState,
  geometry: NumberLineGeometry = NUMBER_LINE_GEOMETRY,
): Segment | null => {
  const historyEnabled = Boolean(state.ui.buttonFlags[HISTORY_FLAG]);
  if (!historyEnabled || state.calculator.rollEntries.length < 2) {
    return null;
  }
  const currentSegment = resolveVectorSegmentForState(state, geometry);
  if (!currentSegment) {
    return null;
  }
  const previousRoll = state.calculator.rollEntries[state.calculator.rollEntries.length - 2]?.y;
  const argand = previousRoll ? calculatorValueToArgandPoint(previousRoll) : null;
  if (!argand) {
    return null;
  }
  const previousPoint = resolveVectorEndpoint(geometry, argand, resolvePlotRangeForState(state));
  return {
    from: previousPoint,
    to: currentSegment.to,
  };
};

export const resolveVectorLayersForState = (
  state: GameState,
  geometry: NumberLineGeometry = NUMBER_LINE_GEOMETRY,
): NumberLineVectorLayer[] => {
  const layers: NumberLineVectorLayer[] = [];
  const currentSegment = resolveVectorSegmentForState(state, geometry);
  if (currentSegment) {
    layers.push({
      kind: "current",
      tipKind: "dot",
      segment: currentSegment,
      magnitudeSq: resolveSegmentMagnitudeSq(currentSegment),
      recencyOrder: 1,
    });
  }

  const historySegment = resolveHistoryVectorSegmentForState(state, geometry);
  if (historySegment) {
    layers.push({
      kind: "history",
      tipKind: "arrow",
      segment: historySegment,
      magnitudeSq: resolveSegmentMagnitudeSq(historySegment),
      recencyOrder: 0,
    });
  }

  const historyForecastSegment = resolveHistoryForecastVectorSegmentForState(state, geometry);
  if (historyForecastSegment) {
    layers.push({
      kind: "forecast_history",
      tipKind: "arrow",
      segment: historyForecastSegment,
      magnitudeSq: resolveSegmentMagnitudeSq(historyForecastSegment),
      recencyOrder: 2,
    });
  }

  const stepForecastSegments = resolveStepForecastVectorSegmentsForState(state, geometry);
  stepForecastSegments.forEach((stepForecastSegment, index) => {
    layers.push({
      kind: "forecast_step",
      tipKind: "arrow",
      segment: stepForecastSegment,
      magnitudeSq: resolveSegmentMagnitudeSq(stepForecastSegment),
      recencyOrder: 3 + index,
    });
  });

  return sortVectorLayers(layers);
};
