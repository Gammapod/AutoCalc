import type { GameState } from "../../../domain/types.js";
import { applyUxRoleAttributes } from "../../shared/readModel.js";
import {
  calculatorValueToArgandPoint,
  resolveHistoryForecastValueForState,
  resolveStepForecastValuesForState,
} from "./numberLineModel.js";
import { expressionToDisplayString } from "../../../domain/expression.js";
import { HISTORY_FLAG } from "../../../domain/state.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const VIEWBOX_SIZE = 100;
const CENTER = 50;
const RADIUS = 45;

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
  circle.setAttribute("cx", CENTER.toString());
  circle.setAttribute("cy", CENTER.toString());
  circle.setAttribute("r", RADIUS.toString());
  applyUxRoleAttributes(circle, { uxRole: "default", uxState: "normal" });
  return circle;
};

const createThetaZeroLine = (documentRef: Document): SVGLineElement => {
  const line = documentRef.createElementNS(SVG_NS, "line");
  line.setAttribute("class", "v2-circle-theta-zero");
  line.setAttribute("x1", CENTER.toString());
  line.setAttribute("y1", CENTER.toString());
  line.setAttribute("x2", (CENTER + RADIUS).toString());
  line.setAttribute("y2", CENTER.toString());
  applyUxRoleAttributes(line, { uxRole: "default", uxState: "normal" });
  return line;
};

const createCenterDot = (documentRef: Document): SVGCircleElement => {
  const dot = documentRef.createElementNS(SVG_NS, "circle");
  dot.setAttribute("class", "v2-circle-center-dot");
  dot.setAttribute("cx", CENTER.toString());
  dot.setAttribute("cy", CENTER.toString());
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

const addRational = (left: { num: bigint; den: bigint }, right: { num: bigint; den: bigint }): { num: bigint; den: bigint } =>
  normalizeRational({
    num: (left.num * right.den) + (right.num * left.den),
    den: left.den * right.den,
  });

const squareRational = (value: { num: bigint; den: bigint }): { num: bigint; den: bigint } =>
  normalizeRational({
    num: value.num * value.num,
    den: value.den * value.den,
  });

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

const integerSqrt = (value: bigint): bigint => {
  if (value < 0n) {
    throw new Error("Square root undefined for negative bigint.");
  }
  if (value < 2n) {
    return value;
  }
  let x0 = value;
  let x1 = (x0 + 1n) / 2n;
  while (x1 < x0) {
    x0 = x1;
    x1 = (x1 + (value / x1)) / 2n;
  }
  return x0;
};

const sqrtIfPerfectSquare = (value: bigint): bigint | null => {
  if (value < 0n) {
    return null;
  }
  const root = integerSqrt(value);
  return root * root === value ? root : null;
};

const formatExactRadicalFromRational = (value: { num: bigint; den: bigint }): string => {
  const normalized = normalizeRational(value);
  if (normalized.num === 0n) {
    return "0";
  }
  const numerator = normalized.num < 0n ? -normalized.num : normalized.num;
  const denominator = normalized.den;
  const sqrtNum = sqrtIfPerfectSquare(numerator);
  const sqrtDen = sqrtIfPerfectSquare(denominator);
  if (sqrtNum !== null && sqrtDen !== null) {
    return sqrtDen === 1n
      ? sqrtNum.toString()
      : `${sqrtNum.toString()}/${sqrtDen.toString()}`;
  }
  if (sqrtDen !== null) {
    return sqrtDen === 1n
      ? `\u221A${numerator.toString()}`
      : `\u221A${numerator.toString()}/${sqrtDen.toString()}`;
  }
  return `\u221A(${rationalToDisplay({ num: numerator, den: denominator })})`;
};

const scalarToDisplay = (value: { kind: "rational"; value: { num: bigint; den: bigint } } | { kind: "expr"; value: unknown }): string =>
  value.kind === "rational"
    ? rationalToDisplay(value.value)
    : expressionToDisplayString(value.value as Parameters<typeof expressionToDisplayString>[0]);

const resolveMagnitudeDisplay = (state: GameState): string => {
  const total = state.calculator.total;
  if (total.kind === "nan") {
    return "NaN";
  }
  if (total.kind === "rational") {
    return rationalToDisplay(absRational(total.value));
  }
  if (total.kind === "expr") {
    return `|${expressionToDisplayString(total.value)}|`;
  }
  const re = total.value.re;
  const im = total.value.im;
  if (re.kind === "rational" && im.kind === "rational") {
    const sumSquares = addRational(squareRational(re.value), squareRational(im.value));
    return formatExactRadicalFromRational(sumSquares);
  }
  return `sqrt((${scalarToDisplay(re)})^2 + (${scalarToDisplay(im)})^2)`;
};

const createMagnitudeLabel = (documentRef: Document, state: GameState): SVGTextElement => {
  const label = documentRef.createElementNS(SVG_NS, "text");
  label.setAttribute("class", "v2-circle-radius-label");
  label.setAttribute("x", (CENTER + (RADIUS * 0.62)).toString());
  label.setAttribute("y", (CENTER + 2.6).toString());
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("dominant-baseline", "hanging");
  applyUxRoleAttributes(label, { uxRole: "default", uxState: "normal" });
  label.textContent = `|r| = ${resolveMagnitudeDisplay(state)}`;
  return label;
};

const createTotalVectorLine = (
  documentRef: Document,
  endpoint: { x: number; y: number },
): SVGLineElement => {
  const line = documentRef.createElementNS(SVG_NS, "line");
  line.setAttribute("class", "v2-number-line-vector");
  line.setAttribute("x1", CENTER.toString());
  line.setAttribute("y1", CENTER.toString());
  line.setAttribute("x2", endpoint.x.toString());
  line.setAttribute("y2", endpoint.y.toString());
  applyUxRoleAttributes(line, { uxRole: "default", uxState: "normal" });
  return line;
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
    applyUxRoleAttributes(line, { uxRole: "analysis", uxState: "active" });
  } else {
    applyUxRoleAttributes(line, { uxRole: "unlock", uxState: "active" });
  }
  return line;
};

const createTotalVectorTip = (
  documentRef: Document,
  endpoint: { x: number; y: number },
  direction: { x: number; y: number },
): SVGPolygonElement => {
  const headLength = 3.6;
  const headHalfWidth = 1.6;
  const baseCenterX = endpoint.x - (direction.x * headLength);
  const baseCenterY = endpoint.y + (direction.y * headLength);
  const leftX = baseCenterX + (direction.y * headHalfWidth);
  const leftY = baseCenterY + (direction.x * headHalfWidth);
  const rightX = baseCenterX - (direction.y * headHalfWidth);
  const rightY = baseCenterY - (direction.x * headHalfWidth);

  const tip = documentRef.createElementNS(SVG_NS, "polygon");
  tip.setAttribute(
    "points",
    `${endpoint.x.toString()},${endpoint.y.toString()} ${leftX.toString()},${leftY.toString()} ${rightX.toString()},${rightY.toString()}`,
  );
  tip.setAttribute("class", "v2-number-line-vector-tip");
  applyUxRoleAttributes(tip, { uxRole: "default", uxState: "normal" });
  return tip;
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
    applyUxRoleAttributes(tip, { uxRole: "analysis", uxState: "active" });
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
  x: CENTER + (direction.x * RADIUS),
  y: CENTER - (direction.y * RADIUS),
});

const resolveVectorDirection = (state: GameState): { x: number; y: number } | null =>
  resolveUnitDirection(state.calculator.total);

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
  svg.appendChild(createMagnitudeLabel(document, state));
  const direction = resolveVectorDirection(state);
  if (direction) {
    const endpoint = toPerimeterPoint(direction);

    const historyEnabled = Boolean(state.ui.buttonFlags[HISTORY_FLAG]);
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
    if (historyEnabled && nextHistoryDirection) {
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

    svg.appendChild(createTotalVectorLine(document, endpoint));
    svg.appendChild(createTotalVectorTip(document, endpoint, direction));
  }
  svg.appendChild(createCenterDot(document));
  panel.appendChild(svg);
};
