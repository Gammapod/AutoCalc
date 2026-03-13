import { isRationalCalculatorValue } from "../../../domain/calculatorValue.js";
import { toStepCount } from "../../../domain/rollEntries.js";
import type { GameState, RollEntry } from "../../../domain/types.js";
import { buildGraphPoints, buildGraphXWindow, buildGraphYWindow } from "./graphModel.js";

export type CircleRenderMode = "radial" | "residue_wheel";

export type ResidueWheelSpec = {
  cycleStartIndex: number;
  cycleEndIndex: number;
  wheelMin: number;
  wheelMaxExclusive: number;
  span: number;
};

export type CircleProjectedPoint = {
  x: number;
  y: number;
  hasError: boolean;
  validForWheel: boolean;
};

export type CircleDot = {
  px: number;
  py: number;
  hasError: boolean;
};

export type CircleSegment = Array<{ px: number; py: number }>;

export type RadialProjection = {
  dots: CircleDot[];
  segments: CircleSegment[];
};

export type ResidueWheelDot = CircleDot & {
  residue: number;
};

export type ResidueWheelProjection = {
  dots: ResidueWheelDot[];
  segments: CircleSegment[];
};

const FALLBACK_ANGULAR_STEP_COUNT = buildGraphXWindow(0).max;

const toFiniteEntryValue = (entry: RollEntry): number | null => {
  if (!isRationalCalculatorValue(entry.y)) {
    return null;
  }
  const value = Number(entry.y.value.num) / Number(entry.y.value.den);
  return Number.isFinite(value) ? value : null;
};

export const detectResidueWheelSpec = (state: GameState): ResidueWheelSpec | null => {
  if (state.calculator.rollAnalysis.stopReason !== "cycle") {
    return null;
  }
  const cycle = state.calculator.rollAnalysis.cycle;
  if (!cycle || state.calculator.rollEntries.length === 0) {
    return null;
  }
  const maxRollIndex = state.calculator.rollEntries.length - 1;
  if (maxRollIndex < 0) {
    return null;
  }
  const cycleStartIndex = Math.max(0, Math.min(maxRollIndex, cycle.i));
  const cycleEndIndex = Math.max(cycleStartIndex, Math.min(maxRollIndex, cycle.j));
  const cycleValues = state.calculator.rollEntries
    .slice(cycleStartIndex, cycleEndIndex + 1)
    .map((entry) => toFiniteEntryValue(entry))
    .filter((value): value is number => value !== null);
  if (cycleValues.length === 0) {
    return null;
  }
  const wheelMin = Math.floor(Math.min(...cycleValues));
  const wheelMaxExclusive = Math.ceil(Math.max(...cycleValues));
  const span = wheelMaxExclusive - wheelMin;
  if (span <= 0) {
    return null;
  }

  return {
    cycleStartIndex,
    cycleEndIndex,
    wheelMin,
    wheelMaxExclusive,
    span,
  };
};

export const resolveCircleRenderMode = (state: GameState): CircleRenderMode =>
  detectResidueWheelSpec(state) ? "residue_wheel" : "radial";

export const toCanonicalWheelIndex = (valueIndex: number, span: number): number =>
  ((valueIndex % span) + span) % span;

export const projectRadialPoints = (
  state: GameState,
  center: number,
  radius: number,
  maxXIndex: number | null = null,
): RadialProjection => {
  const points = buildGraphPoints(state.calculator.rollEntries);
  const xWindow = buildGraphXWindow(toStepCount(state.calculator.rollEntries));
  const yWindow = buildGraphYWindow(state.unlocks.maxTotalDigits);
  const maxMagnitude = Math.max(Math.abs(yWindow.min), Math.abs(yWindow.max), 1);
  const angularStepCount = Math.max(1, FALLBACK_ANGULAR_STEP_COUNT);
  const dots: CircleDot[] = [];
  const segments: CircleSegment[] = [];
  let currentSegment: CircleSegment = [];

  for (const point of points) {
    if (point.x < xWindow.min || point.x > xWindow.max || (maxXIndex !== null && point.x > maxXIndex)) {
      continue;
    }
    const ringIndex = point.x % angularStepCount;
    const theta = (ringIndex / angularStepCount) * Math.PI * 2;
    const normalizedMagnitude = Math.max(-1, Math.min(1, point.y / maxMagnitude));
    const radial = normalizedMagnitude * radius;
    const px = center + Math.cos(theta) * radial;
    const py = center - Math.sin(theta) * radial;
    dots.push({ px, py, hasError: point.hasError });
    if (point.hasError) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }
      currentSegment = [];
      continue;
    }
    currentSegment.push({ px, py });
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return { dots, segments };
};

export const projectResidueWheelPoints = (
  rollEntries: RollEntry[],
  spec: ResidueWheelSpec,
  center: number,
  radius: number,
): ResidueWheelProjection => {
  const xWindow = buildGraphXWindow(Math.max(0, rollEntries.length - 1));
  const dots: ResidueWheelDot[] = [];
  const segments: CircleSegment[] = [];
  let currentSegment: CircleSegment = [];

  for (let index = spec.cycleEndIndex + 1; index < rollEntries.length; index += 1) {
    const x = index;
    if (x < xWindow.min || x > xWindow.max) {
      continue;
    }

    const entry = rollEntries[index];
    const entryValue = toFiniteEntryValue(entry);
    if (entryValue === null) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }
      currentSegment = [];
      continue;
    }

    const valueIndex = Math.floor(entryValue) - spec.wheelMin;
    const residue = toCanonicalWheelIndex(valueIndex, spec.span);
    const theta = (residue / spec.span) * Math.PI * 2;
    const px = center + Math.cos(theta) * radius;
    const py = center - Math.sin(theta) * radius;
    const hasError = Boolean(entry.error);

    dots.push({ px, py, residue, hasError });
    if (hasError) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }
      currentSegment = [];
      continue;
    }
    currentSegment.push({ px, py });
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return { dots, segments };
};
