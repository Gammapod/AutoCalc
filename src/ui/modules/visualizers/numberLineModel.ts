import type { CalculatorValue, GameState, ScalarValue } from "../../../domain/types.js";
import { isScalarValueZero } from "../../../domain/calculatorValue.js";
import { expressionToRational } from "../../../domain/expression.js";

export type NumberLineMode = "real" | "complex_grid";
export type Point = { x: number; y: number };
export type Segment = { from: Point; to: Point };
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

export const resolvePlotRangeForState = (state: GameState): number => {
  const radix = resolveRadix(state);
  const maxDigits = Math.max(1, state.unlocks.maxTotalDigits);
  const boundary = (BigInt(radix) ** BigInt(maxDigits)) - 1n;
  const asNumber = Number(boundary);
  if (!Number.isFinite(asNumber) || asNumber <= 0) {
    return 1;
  }
  return asNumber;
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

