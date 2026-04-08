import type { RollEntry } from "../../../domain/types.js";
import { buildGraphPoints, buildGraphXWindow, buildGraphYWindow } from "./graphModel.js";
import { formatBoundaryLabel } from "./plotPolicy.js";

export type GraphDomain = { min: number; max: number };

export type GraphPlotRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type GraphGridTick = {
  value: number;
};

export type GraphBoundaryLabels = {
  top: string;
  bottom: string;
  zero: string;
};

export type GraphOverlayStyleTokens = {
  overhangPx: number;
  fontSizePx: number;
  topLabelInsetPx: number;
  bottomLabelInsetPx: number;
};

export type GraphLayout = {
  width: number;
  height: number;
  plot: GraphPlotRect;
  xDomain: GraphDomain;
  yDomain: GraphDomain;
  xTicks: GraphGridTick[];
  yTicks: GraphGridTick[];
  boundaryLabels: GraphBoundaryLabels;
  hasImaginary: boolean;
  style: GraphOverlayStyleTokens;
};

const LEFT_GUTTER_PX = 22;
const RIGHT_GUTTER_PX = 10;
const TOP_GUTTER_PX = 18;
const BOTTOM_GUTTER_PX = 18;
const TOP_PLOT_OFFSET_PX = 4;
const BOTTOM_PLOT_OFFSET_PX = 4;
const GRAPH_VERTICAL_SHIFT_PX = 4;
const MIN_WIDTH_PX = 160;
const MIN_HEIGHT_PX = 120;

const dedupeSorted = (values: readonly number[]): number[] => {
  const sorted = [...values].sort((left, right) => left - right);
  const out: number[] = [];
  for (const value of sorted) {
    if (out.length < 1 || Math.abs(out[out.length - 1] - value) > 1e-9) {
      out.push(value);
    }
  }
  return out;
};

const buildXTicks = (min: number, max: number): GraphGridTick[] => {
  const values: number[] = [min, max];
  const first = Math.ceil(min / 5) * 5;
  for (let value = first; value <= max; value += 5) {
    values.push(value);
  }
  return dedupeSorted(values).map((value) => ({ value }));
};

const buildYTicks = (min: number, max: number): GraphGridTick[] => {
  const segments = 8;
  const span = max - min;
  if (!Number.isFinite(span) || span <= 0) {
    return [{ value: min }, { value: max }];
  }
  const values: number[] = [];
  for (let index = 0; index <= segments; index += 1) {
    values.push(min + ((span * index) / segments));
  }
  if (min < 0 && max > 0) {
    values.push(0);
  }
  return dedupeSorted(values).map((value) => ({ value }));
};

export const resolveGraphLayout = (
  rollEntries: RollEntry[],
  radix: number,
  maxXIndex: number,
  width: number,
  height: number,
): GraphLayout => {
  const safeWidth = Math.max(MIN_WIDTH_PX, Math.round(width));
  const safeHeight = Math.max(MIN_HEIGHT_PX, Math.round(height));
  const xDomain = buildGraphXWindow(maxXIndex);
  const yDomain = buildGraphYWindow(rollEntries, radix);
  const hasImaginary = buildGraphPoints(rollEntries).some((point) => point.kind === "imaginary");

  const plot: GraphPlotRect = {
    left: LEFT_GUTTER_PX,
    right: safeWidth - RIGHT_GUTTER_PX,
    top: TOP_GUTTER_PX + TOP_PLOT_OFFSET_PX - GRAPH_VERTICAL_SHIFT_PX,
    bottom: safeHeight - BOTTOM_GUTTER_PX - BOTTOM_PLOT_OFFSET_PX - GRAPH_VERTICAL_SHIFT_PX,
  };

  return {
    width: safeWidth,
    height: safeHeight,
    plot,
    xDomain,
    yDomain,
    xTicks: buildXTicks(xDomain.min, xDomain.max),
    yTicks: buildYTicks(yDomain.min, yDomain.max),
    boundaryLabels: {
      top: formatBoundaryLabel(yDomain.max, { appendImaginaryUnit: hasImaginary, zeroPolicy: "empty" }),
      bottom: formatBoundaryLabel(yDomain.min, { appendImaginaryUnit: hasImaginary, zeroPolicy: "empty" }),
      zero: formatBoundaryLabel(0, { zeroPolicy: "zero" }),
    },
    hasImaginary,
    style: {
      overhangPx: 5,
      fontSizePx: 11,
      topLabelInsetPx: 8 - GRAPH_VERTICAL_SHIFT_PX,
      bottomLabelInsetPx: 8 + GRAPH_VERTICAL_SHIFT_PX,
    },
  };
};

