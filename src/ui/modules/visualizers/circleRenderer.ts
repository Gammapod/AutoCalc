import type { GameState } from "../../../domain/types.js";
import { applyUxRoleAttributes } from "../../shared/readModel.js";
import {
  calculatorValueToArgandPoint,
  resolveHistoryForecastValueForState,
  resolveStepForecastValuesForState,
} from "./numberLineModel.js";
import { expressionToDisplayString } from "../../../domain/expression.js";
import { addAlgebraic, algebraicToDisplayString, mulAlgebraic, rationalToAlgebraic } from "../../../domain/algebraicScalar.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const VIEWBOX_SIZE = 100;
const CENTER_X = 50;
const CENTER_Y = 46;
const RADIUS = 41;
const LABEL_Y = CENTER_Y + RADIUS + 2;
const LABEL_LINE_DY = 5;

const createSvg = (documentRef: Document): SVGSVGElement => {
  const svg = documentRef.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "v2-circle-plot");
  svg.setAttribute("viewBox", `0 0 ${VIEWBOX_SIZE.toString()} ${VIEWBOX_SIZE.toString()}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Circle polar grid");
  return svg;
};

const createCircleGrid = (documentRef: Document): SVGCircleElement => {
  const circle = documentRef.createElementNS(SVG_NS, "circle");
  circle.setAttribute("class", "v2-circle-grid");
  circle.setAttribute("cx", CENTER_X.toString());
  circle.setAttribute("cy", CENTER_Y.toString());
  circle.setAttribute("r", RADIUS.toString());
  applyUxRoleAttributes(circle, { uxRole: "default", uxState: "normal" });
  return circle;
};

const createThetaZeroLine = (documentRef: Document): SVGLineElement => {
  const line = documentRef.createElementNS(SVG_NS, "line");
  line.setAttribute("class", "v2-circle-theta-zero");
  line.setAttribute("x1", (CENTER_X - RADIUS).toString());
  line.setAttribute("y1", CENTER_Y.toString());
  line.setAttribute("x2", (CENTER_X + RADIUS).toString());
  line.setAttribute("y2", CENTER_Y.toString());
  applyUxRoleAttributes(line, { uxRole: "default", uxState: "normal" });
  return line;
};

const createImaginaryAxisLine = (documentRef: Document): SVGLineElement => {
  const line = documentRef.createElementNS(SVG_NS, "line");
  line.setAttribute("class", "v2-circle-imag-axis");
  line.setAttribute("x1", CENTER_X.toString());
  line.setAttribute("y1", (CENTER_Y - RADIUS).toString());
  line.setAttribute("x2", CENTER_X.toString());
  line.setAttribute("y2", (CENTER_Y + RADIUS).toString());
  applyUxRoleAttributes(line, { uxRole: "imaginary", uxState: "active" });
  return line;
};

const createProjectionToHorizontalDiameter = (
  documentRef: Document,
  endpoint: { x: number; y: number },
): SVGLineElement => {
  const line = documentRef.createElementNS(SVG_NS, "line");
  line.setAttribute("class", "v2-circle-projection-imag");
  line.setAttribute("x1", endpoint.x.toString());
  line.setAttribute("y1", endpoint.y.toString());
  line.setAttribute("x2", endpoint.x.toString());
  line.setAttribute("y2", CENTER_Y.toString());
  applyUxRoleAttributes(line, { uxRole: "imaginary", uxState: "active" });
  return line;
};

const createProjectionToVerticalDiameter = (
  documentRef: Document,
  endpoint: { x: number; y: number },
): SVGLineElement => {
  const line = documentRef.createElementNS(SVG_NS, "line");
  line.setAttribute("class", "v2-circle-projection-real");
  line.setAttribute("x1", endpoint.x.toString());
  line.setAttribute("y1", endpoint.y.toString());
  line.setAttribute("x2", CENTER_X.toString());
  line.setAttribute("y2", endpoint.y.toString());
  applyUxRoleAttributes(line, { uxRole: "default", uxState: "normal" });
  return line;
};

const createCenterDot = (documentRef: Document): SVGCircleElement => {
  const dot = documentRef.createElementNS(SVG_NS, "circle");
  dot.setAttribute("class", "v2-circle-center-dot");
  dot.setAttribute("cx", CENTER_X.toString());
  dot.setAttribute("cy", CENTER_Y.toString());
  dot.setAttribute("r", "1.2");
  applyUxRoleAttributes(dot, { uxRole: "default", uxState: "normal" });
  return dot;
};

const gcd = (left: bigint, right: bigint): bigint => {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
};

const normalizeRational = (value: { num: bigint; den: bigint }): { num: bigint; den: bigint } => {
  if (value.den === 0n) {
    throw new Error("Invalid rational denominator.");
  }
  if (value.num === 0n) {
    return { num: 0n, den: 1n };
  }
  const sign = value.den < 0n ? -1n : 1n;
  const num = value.num * sign;
  const den = value.den * sign;
  const d = gcd(num, den);
  return { num: num / d, den: den / d };
};

const absRational = (value: { num: bigint; den: bigint }): { num: bigint; den: bigint } =>
  normalizeRational({
    num: value.num < 0n ? -value.num : value.num,
    den: value.den,
  });

const rationalToDisplay = (value: { num: bigint; den: bigint }): string => {
  const normalized = normalizeRational(value);
  return normalized.den === 1n
    ? normalized.num.toString()
    : `${normalized.num.toString()}/${normalized.den.toString()}`;
};

const scalarToDisplay = (
  value:
    | { kind: "rational"; value: { num: bigint; den: bigint } }
    | { kind: "alg"; value: { one?: { num: bigint; den: bigint }; sqrt2?: { num: bigint; den: bigint }; sqrt3?: { num: bigint; den: bigint }; sqrt6?: { num: bigint; den: bigint } } }
    | { kind: "expr"; value: unknown },
): string =>
  value.kind === "rational"
    ? rationalToDisplay(value.value)
    : value.kind === "alg"
      ? algebraicToDisplayString(value.value)
    : expressionToDisplayString(value.value as Parameters<typeof expressionToDisplayString>[0]);

type CircleLabelPart = {
  text: string;
  role?: "imaginary";
  lineBreakBefore?: boolean;
};

const scalarToAlgebraic = (
  value:
    | { kind: "rational"; value: { num: bigint; den: bigint } }
    | { kind: "alg"; value: { one?: { num: bigint; den: bigint }; sqrt2?: { num: bigint; den: bigint }; sqrt3?: { num: bigint; den: bigint }; sqrt6?: { num: bigint; den: bigint } } }
    | { kind: "expr"; value: unknown },
): { one?: { num: bigint; den: bigint }; sqrt2?: { num: bigint; den: bigint }; sqrt3?: { num: bigint; den: bigint }; sqrt6?: { num: bigint; den: bigint } } | null => {
  if (value.kind === "rational") {
    return rationalToAlgebraic(value.value);
  }
  if (value.kind === "alg") {
    return value.value;
  }
  return null;
};

const resolveMagnitudeLabelParts = (state: GameState): CircleLabelPart[] => {
  const total = state.calculator.total;
  if (total.kind === "nan") {
    return [{ text: "|r| = NaN" }];
  }
  if (total.kind === "rational") {
    return [{ text: `|r| = ${rationalToDisplay(absRational(total.value))}` }];
  }
  if (total.kind === "expr") {
    return [{ text: `|r| = |${expressionToDisplayString(total.value)}|` }];
  }
  const re = total.value.re;
  const im = total.value.im;
  const reAlg = scalarToAlgebraic(re);
  const imAlg = scalarToAlgebraic(im);
  if (reAlg && imAlg) {
    const normSquared = addAlgebraic(mulAlgebraic(reAlg, reAlg), mulAlgebraic(imAlg, imAlg));
    return [{ text: `r\u00B2 = ${algebraicToDisplayString(normSquared)}` }];
  }
  return [
    { text: `r\u00B2 = (${scalarToDisplay(re)})\u00B2` },
    { text: ` + (${scalarToDisplay(im)})\u00B2`, role: "imaginary", lineBreakBefore: true },
  ];
};

const appendCircleLabelParts = (label: SVGTextElement, parts: readonly CircleLabelPart[]): void => {
  for (const part of parts) {
    const tspan = label.ownerDocument.createElementNS(SVG_NS, "tspan");
    tspan.textContent = part.text;
    if (part.lineBreakBefore) {
      tspan.setAttribute("x", CENTER_X.toString());
      tspan.setAttribute("dy", LABEL_LINE_DY.toString());
    }
    if (part.role === "imaginary") {
      tspan.setAttribute("data-ux-role", "imaginary");
      tspan.setAttribute("data-ux-state", "active");
    }
    label.appendChild(tspan);
  }
};

const createMagnitudeLabel = (documentRef: Document, state: GameState): SVGTextElement => {
  const label = documentRef.createElementNS(SVG_NS, "text");
  label.setAttribute("class", "v2-circle-radius-label");
  label.setAttribute("x", CENTER_X.toString());
  label.setAttribute("y", LABEL_Y.toString());
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("dominant-baseline", "hanging");
  applyUxRoleAttributes(label, { uxRole: "default", uxState: "normal" });
  appendCircleLabelParts(label, resolveMagnitudeLabelParts(state));
  return label;
};

const createSegmentLine = (
  documentRef: Document,
  from: { x: number; y: number },
  to: { x: number; y: number },
  className: "v2-number-line-vector--history" | "v2-number-line-vector--forecast" | "v2-number-line-vector--forecast-step",
): SVGLineElement => {
  const line = documentRef.createElementNS(SVG_NS, "line");
  line.setAttribute("class", className);
  line.setAttribute("x1", from.x.toString());
  line.setAttribute("y1", from.y.toString());
  line.setAttribute("x2", to.x.toString());
  line.setAttribute("y2", to.y.toString());
  if (className === "v2-number-line-vector--history" || className === "v2-number-line-vector--forecast-step") {
    applyUxRoleAttributes(line, {
      uxRole: className === "v2-number-line-vector--history" ? "history" : "step",
      uxState: "active",
    });
  } else {
    applyUxRoleAttributes(line, { uxRole: "unlock", uxState: "active" });
  }
  return line;
};

type CircleCycleOverlaySegment = {
  kind: "chain" | "closure";
  from: { x: number; y: number };
  to: { x: number; y: number };
};

const createCycleSegmentLine = (
  documentRef: Document,
  segment: CircleCycleOverlaySegment,
): SVGLineElement => {
  const line = documentRef.createElementNS(SVG_NS, "line");
  line.setAttribute("class", `v2-number-line-cycle-line v2-number-line-cycle-line--${segment.kind}`);
  line.setAttribute("x1", segment.from.x.toString());
  line.setAttribute("y1", segment.from.y.toString());
  line.setAttribute("x2", segment.to.x.toString());
  line.setAttribute("y2", segment.to.y.toString());
  line.setAttribute("stroke-width", "1");
  line.setAttribute("stroke-dasharray", "none");
  line.setAttribute("vector-effect", "non-scaling-stroke");
  applyUxRoleAttributes(line, { uxRole: "analysis", uxState: "active" });
  return line;
};

const createArrowTip = (
  documentRef: Document,
  endpoint: { x: number; y: number },
  direction: { x: number; y: number },
  className: "v2-number-line-vector-tip--history" | "v2-number-line-vector-tip--forecast" | "v2-number-line-vector-tip--forecast-step",
): SVGPolygonElement => {
  const length = Math.hypot(direction.x, direction.y);
  const ux = length > 1e-9 ? direction.x / length : 1;
  const uy = length > 1e-9 ? direction.y / length : 0;
  const headLength = 3.2;
  const headHalfWidth = 1.35;
  const baseCenterX = endpoint.x - (ux * headLength);
  const baseCenterY = endpoint.y + (uy * headLength);
  const leftX = baseCenterX + (uy * headHalfWidth);
  const leftY = baseCenterY + (ux * headHalfWidth);
  const rightX = baseCenterX - (uy * headHalfWidth);
  const rightY = baseCenterY - (ux * headHalfWidth);

  const tip = documentRef.createElementNS(SVG_NS, "polygon");
  tip.setAttribute(
    "points",
    `${endpoint.x.toString()},${endpoint.y.toString()} ${leftX.toString()},${leftY.toString()} ${rightX.toString()},${rightY.toString()}`,
  );
  tip.setAttribute("class", className);
  if (className === "v2-number-line-vector-tip--history" || className === "v2-number-line-vector-tip--forecast-step") {
    applyUxRoleAttributes(tip, {
      uxRole: className === "v2-number-line-vector-tip--history" ? "history" : "step",
      uxState: "active",
    });
  } else {
    applyUxRoleAttributes(tip, { uxRole: "unlock", uxState: "active" });
  }
  return tip;
};

const resolveUnitDirection = (value: GameState["calculator"]["total"]): { x: number; y: number } | null => {
  const argand = calculatorValueToArgandPoint(value);
  if (!argand) {
    return null;
  }
  const magnitude = Math.hypot(argand.re, argand.im);
  if (!Number.isFinite(magnitude) || magnitude <= 1e-9) {
    return { x: 1, y: 0 };
  }
  return {
    x: argand.re / magnitude,
    y: argand.im / magnitude,
  };
};

const toPerimeterPoint = (direction: { x: number; y: number }): { x: number; y: number } => ({
  x: CENTER_X + (direction.x * RADIUS),
  y: CENTER_Y - (direction.y * RADIUS),
});

const resolveVectorDirection = (state: GameState): { x: number; y: number } | null =>
  resolveUnitDirection(state.calculator.total);

const resolveCircleCycleOverlaySegmentsForState = (state: GameState): CircleCycleOverlaySegment[] => {
  const cycle = state.calculator.rollAnalysis.stopReason === "cycle" ? state.calculator.rollAnalysis.cycle : null;
  if (state.settings.cycle !== "on" || !cycle) {
    return [];
  }
  const latestIndex = state.calculator.rollEntries.length - 1;
  if (latestIndex < 0 || latestIndex < cycle.j) {
    return [];
  }
  if (!Number.isInteger(cycle.periodLength) || cycle.periodLength < 1) {
    return [];
  }
  const spanLength = cycle.periodLength + 1;
  const spanStart = latestIndex - (spanLength - 1);
  if (spanStart < 0) {
    return [];
  }
  const spanEntries = state.calculator.rollEntries.slice(spanStart, latestIndex + 1);
  if (spanEntries.length < 2) {
    return [];
  }
  const endpoints = spanEntries.map((entry) => {
    const direction = resolveUnitDirection(entry.y);
    return direction ? toPerimeterPoint(direction) : null;
  });
  if (endpoints.some((endpoint) => endpoint === null)) {
    return [];
  }
  const resolvedEndpoints = endpoints.filter((endpoint): endpoint is { x: number; y: number } => endpoint !== null);
  if (resolvedEndpoints.length < 2) {
    return [];
  }

  const segments: CircleCycleOverlaySegment[] = [];
  for (let index = 1; index < resolvedEndpoints.length; index += 1) {
    const previous = resolvedEndpoints[index - 1];
    const current = resolvedEndpoints[index];
    if (!previous || !current) {
      continue;
    }
    segments.push({
      kind: "chain",
      from: previous,
      to: current,
    });
  }
  const first = resolvedEndpoints[0];
  const last = resolvedEndpoints[resolvedEndpoints.length - 1];
  if (first && last && Math.abs(first.x - last.x) <= 1e-9 && Math.abs(first.y - last.y) <= 1e-9) {
    segments.push({
      kind: "closure",
      from: first,
      to: last,
    });
  }
  return segments;
};

export const clearCircleVisualizerPanel = (root: Element): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-circle-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "true");
};

export const renderCircleVisualizerPanel = (root: Element, state: GameState): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-circle-panel]");
  if (!panel || typeof document === "undefined") {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "false");

  const svg = createSvg(document);
  svg.appendChild(createCircleGrid(document));
  svg.appendChild(createThetaZeroLine(document));
  svg.appendChild(createImaginaryAxisLine(document));
  svg.appendChild(createMagnitudeLabel(document, state));
  const direction = resolveVectorDirection(state);
  if (direction) {
    const endpoint = toPerimeterPoint(direction);
    svg.appendChild(createProjectionToHorizontalDiameter(document, endpoint));
    svg.appendChild(createProjectionToVerticalDiameter(document, endpoint));

    const historyEnabled = state.settings.history === "on";
    const previousValue = historyEnabled ? (state.calculator.rollEntries[state.calculator.rollEntries.length - 2]?.y ?? null) : null;
    const previousDirection = previousValue ? resolveUnitDirection(previousValue) : null;
    if (historyEnabled && previousDirection) {
      const previousPoint = toPerimeterPoint(previousDirection);
      svg.appendChild(createSegmentLine(document, previousPoint, endpoint, "v2-number-line-vector--history"));
      svg.appendChild(createArrowTip(document, endpoint, {
        x: endpoint.x - previousPoint.x,
        y: previousPoint.y - endpoint.y,
      }, "v2-number-line-vector-tip--history"));
    }

    const nextHistoryValue = resolveHistoryForecastValueForState(state);
    const nextHistoryDirection = nextHistoryValue ? resolveUnitDirection(nextHistoryValue) : null;
    if (nextHistoryDirection) {
      const nextPoint = toPerimeterPoint(nextHistoryDirection);
      svg.appendChild(createSegmentLine(document, endpoint, nextPoint, "v2-number-line-vector--forecast"));
      svg.appendChild(createArrowTip(document, nextPoint, {
        x: nextPoint.x - endpoint.x,
        y: endpoint.y - nextPoint.y,
      }, "v2-number-line-vector-tip--forecast"));
    }

    if (state.settings.stepExpansion === "on") {
      const stepDirections = resolveStepForecastValuesForState(state)
        .map((value) => resolveUnitDirection(value))
        .filter((value): value is { x: number; y: number } => value !== null);
      let fromPoint = endpoint;
      for (const stepDirection of stepDirections) {
        const stepPoint = toPerimeterPoint(stepDirection);
        svg.appendChild(createSegmentLine(document, fromPoint, stepPoint, "v2-number-line-vector--forecast-step"));
        svg.appendChild(createArrowTip(document, stepPoint, {
          x: stepPoint.x - fromPoint.x,
          y: fromPoint.y - stepPoint.y,
        }, "v2-number-line-vector-tip--forecast-step"));
        fromPoint = stepPoint;
      }
    }

    const cycleSegments = resolveCircleCycleOverlaySegmentsForState(state);
    for (const cycleSegment of cycleSegments) {
      svg.appendChild(createCycleSegmentLine(document, cycleSegment));
    }
  }
  svg.appendChild(createCenterDot(document));
  panel.appendChild(svg);
};
