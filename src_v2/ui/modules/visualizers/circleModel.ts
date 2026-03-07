import { isRationalCalculatorValue } from "../../../../src/domain/calculatorValue.js";
import type { GameState, RollEntry } from "../../../../src/domain/types.js";
import { buildGraphPoints, buildGraphXWindow, buildGraphYWindow } from "./graphModel.js";
import { resolveGraphSeedSnapshot } from "./seedSnapshot.js";

export type CircleRenderMode = "radial" | "residue_wheel";

export type ResidueWheelSpec = {
  modulus: bigint;
  modulusNumber: number;
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
  trace: CircleSegment;
};

export type ResidueWheelDot = CircleDot & {
  residue: number;
};

export type ResidueWheelProjection = {
  dots: ResidueWheelDot[];
  segments: CircleSegment[];
};

const FALLBACK_ANGULAR_STEP_COUNT = buildGraphXWindow(0).max;

const isIntegerValue = (
  entry: RollEntry,
): entry is RollEntry & { y: { kind: "rational"; value: { num: bigint; den: bigint } } } =>
  isRationalCalculatorValue(entry.y) && entry.y.value.den === 1n;

export const toCanonicalResidueIndex = (value: bigint, modulus: bigint): bigint =>
  ((value % modulus) + modulus) % modulus;

export const detectResidueWheelSpec = (state: GameState): ResidueWheelSpec | null => {
  const slotCount = state.calculator.operationSlots.length;
  if (slotCount === 0) {
    return null;
  }

  const lastSlot = state.calculator.operationSlots[slotCount - 1];
  if (lastSlot.operator !== "\u27E1") {
    return null;
  }
  if (lastSlot.operand <= 1n) {
    return null;
  }

  // Keep wheel mode limited to integer-preserving slot chains.
  if (state.calculator.operationSlots.some((slot) => slot.operator === "/")) {
    return null;
  }

  const modulusNumber = Number(lastSlot.operand);
  if (!Number.isFinite(modulusNumber) || modulusNumber <= 1) {
    return null;
  }

  return {
    modulus: lastSlot.operand,
    modulusNumber,
  };
};

export const resolveCircleRenderMode = (state: GameState): CircleRenderMode =>
  detectResidueWheelSpec(state) ? "residue_wheel" : "radial";

export const projectRadialPoints = (
  state: GameState,
  center: number,
  radius: number,
): RadialProjection => {
  const points = buildGraphPoints(state.calculator.rollEntries, resolveGraphSeedSnapshot(state));
  const xWindow = buildGraphXWindow(state.calculator.rollEntries.length);
  const yWindow = buildGraphYWindow(state.unlocks.maxTotalDigits);
  const maxMagnitude = Math.max(Math.abs(yWindow.min), Math.abs(yWindow.max), 1);
  const angularStepCount = Math.max(1, FALLBACK_ANGULAR_STEP_COUNT);
  const dots: CircleDot[] = [];
  const trace: CircleSegment = [];

  for (const point of points) {
    if (point.x < xWindow.min || point.x > xWindow.max) {
      continue;
    }
    const ringIndex = point.x % angularStepCount;
    const theta = (ringIndex / angularStepCount) * Math.PI * 2;
    const normalizedMagnitude = Math.min(1, Math.abs(point.y) / maxMagnitude);
    const radial = normalizedMagnitude * radius;
    const px = center + Math.cos(theta) * radial;
    const py = center - Math.sin(theta) * radial;
    dots.push({ px, py, hasError: point.hasError });
    trace.push({ px, py });
  }

  return { dots, trace };
};

export const projectResidueWheelPoints = (
  rollEntries: RollEntry[],
  spec: ResidueWheelSpec,
  center: number,
  radius: number,
): ResidueWheelProjection => {
  const xWindow = buildGraphXWindow(rollEntries.length);
  const dots: ResidueWheelDot[] = [];
  const segments: CircleSegment[] = [];
  let currentSegment: CircleSegment = [];

  for (let index = 0; index < rollEntries.length; index += 1) {
    const x = index + 1;
    if (x < xWindow.min || x > xWindow.max) {
      continue;
    }

    const entry = rollEntries[index];
    const validPoint = isIntegerValue(entry) && !entry.error;
    if (!validPoint) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }
      currentSegment = [];
      continue;
    }

    const residue = Number(toCanonicalResidueIndex(entry.y.value.num, spec.modulus));
    const theta = (residue / spec.modulusNumber) * Math.PI * 2;
    const px = center + Math.cos(theta) * radius;
    const py = center - Math.sin(theta) * radius;

    dots.push({ px, py, residue, hasError: false });
    currentSegment.push({ px, py });
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return { dots, segments };
};
