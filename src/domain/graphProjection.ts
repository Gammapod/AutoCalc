import { expressionToRational } from "./expression.js";
import { getSeedRow, getStepRows } from "./rollEntries.js";
import type { CalculatorValue, RollEntry, ScalarValue } from "./types.js";
import { algebraicToApproxNumber, algebraicToRational } from "./algebraicScalar.js";

export type GraphPoint = {
  x: number;
  y: number;
  kind?: "seed" | "roll" | "imaginary" | "remainder";
  hasError: boolean;
};

const scalarToNumber = (value: ScalarValue): number | null => {
  if (value.kind === "rational") {
    if (value.value.den === 0n) {
      return null;
    }
    return Number(value.value.num) / Number(value.value.den);
  }
  if (value.kind === "alg") {
    const rational = algebraicToRational(value.value);
    if (rational) {
      if (rational.den === 0n) {
        return null;
      }
      return Number(rational.num) / Number(rational.den);
    }
    return algebraicToApproxNumber(value.value);
  }
  const asRational = expressionToRational(value.value);
  if (!asRational || asRational.den === 0n) {
    return null;
  }
  return Number(asRational.num) / Number(asRational.den);
};

const calculatorValueToRealImag = (value: CalculatorValue): { re: number; im: number } | null => {
  if (value.kind === "nan") {
    return null;
  }
  if (value.kind === "complex") {
    const re = scalarToNumber(value.value.re);
    const im = scalarToNumber(value.value.im);
    if (re === null || im === null) {
      return null;
    }
    return { re, im };
  }
  const scalar: ScalarValue = value.kind === "rational"
    ? { kind: "rational", value: value.value }
    : { kind: "expr", value: value.value };
  const real = scalarToNumber(scalar);
  if (real === null) {
    return null;
  }
  return { re: real, im: 0 };
};

export const buildRawGraphPoints = (rollEntries: RollEntry[]): GraphPoint[] => {
  const points: GraphPoint[] = [];
  const seed = getSeedRow(rollEntries)?.y;
  const seedPair = seed ? calculatorValueToRealImag(seed) : null;
  if (seedPair) {
    points.push({
      x: 0,
      y: seedPair.re,
      kind: "seed",
      hasError: false,
    });
    if (Math.abs(seedPair.im) > 0) {
      points.push({
        x: 0,
        y: seedPair.im,
        kind: "imaginary",
        hasError: false,
      });
    }
  }
  const stepRows = getStepRows(rollEntries);
  for (let index = 0; index < stepRows.length; index += 1) {
    const entry = stepRows[index];
    const x = index + 1;
    const valuePair = calculatorValueToRealImag(entry.y);
    if (!valuePair) {
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
      y: valuePair.re,
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
    if (Math.abs(valuePair.im) > 0) {
      points.push({
        x,
        y: valuePair.im,
        kind: "imaginary",
        hasError: false,
      });
    }
  }
  return points;
};

export const expandImaginaryChannelPoints = (points: readonly GraphPoint[]): GraphPoint[] => {
  const hasNonZeroImaginary = points.some((point) => point.kind === "imaginary" && Math.abs(point.y) > 0);
  if (!hasNonZeroImaginary) {
    return [...points];
  }

  const out: GraphPoint[] = [];
  let index = 0;
  while (index < points.length) {
    const start = index;
    const currentX = points[index].x;
    while (index < points.length && points[index].x === currentX) {
      index += 1;
    }
    const group = points.slice(start, index);
    out.push(...group);

    const hasAnchorPoint = group.some((point) => point.kind === "seed" || point.kind === "roll");
    const hasImaginaryPoint = group.some((point) => point.kind === "imaginary");
    if (hasAnchorPoint && !hasImaginaryPoint) {
      out.push({
        x: currentX,
        y: 0,
        kind: "imaginary",
        hasError: false,
      });
    }
  }

  return out;
};

export const buildGraphPoints = (rollEntries: RollEntry[]): GraphPoint[] =>
  expandImaginaryChannelPoints(buildRawGraphPoints(rollEntries));

export const isGraphRenderable = (rollEntries: RollEntry[]): boolean =>
  buildGraphPoints(rollEntries).length > 0;
