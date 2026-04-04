import type { GameState } from "../../../domain/types.js";
import {
  NUMBER_LINE_GEOMETRY,
  resolveNumberLineMode,
  resolveVectorSegmentForState,
  type NumberLineGeometry,
  type Point,
  type Segment,
} from "./numberLineModel.js";

type AxisKey = "x" | "y";

const buildAsciiNumberLine = (): string => "\u2190\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2192";

const buildPolygonPoints = (points: readonly Point[]): string =>
  points.map((point) => `${point.x.toString()},${point.y.toString()}`).join(" ");

const appendLine = (
  documentRef: Document,
  svg: SVGElement,
  segment: Segment,
  className: "v2-number-line-axis" | "v2-number-line-grid-mark" | "v2-number-line-center-tick" | "v2-number-line-vector",
): void => {
  const svgNs = "http://www.w3.org/2000/svg";
  const line = documentRef.createElementNS(svgNs, "line");
  line.setAttribute("x1", segment.from.x.toString());
  line.setAttribute("y1", segment.from.y.toString());
  line.setAttribute("x2", segment.to.x.toString());
  line.setAttribute("y2", segment.to.y.toString());
  line.setAttribute("class", className);
  svg.appendChild(line);
};

const appendArrow = (documentRef: Document, svg: SVGElement, points: [Point, Point, Point]): void => {
  const svgNs = "http://www.w3.org/2000/svg";
  const arrow = documentRef.createElementNS(svgNs, "polygon");
  arrow.setAttribute("points", buildPolygonPoints(points));
  arrow.setAttribute("class", "v2-number-line-arrowhead");
  svg.appendChild(arrow);
};

const appendSubdivisionLines = (
  documentRef: Document,
  svg: SVGElement,
  values: readonly number[],
  axis: AxisKey,
  segmentBounds: { start: number; end: number },
  centerIndex: number,
): void => {
  for (let index = 0; index < values.length; index += 1) {
    if (index === centerIndex) {
      continue;
    }
    if (axis === "x") {
      appendLine(
        documentRef,
        svg,
        {
          from: { x: values[index], y: segmentBounds.start },
          to: { x: values[index], y: segmentBounds.end },
        },
        "v2-number-line-grid-mark",
      );
    } else {
      appendLine(
        documentRef,
        svg,
        {
          from: { x: segmentBounds.start, y: values[index] },
          to: { x: segmentBounds.end, y: values[index] },
        },
        "v2-number-line-grid-mark",
      );
    }
  }
};

const renderBaseHorizontalAxis = (documentRef: Document, svg: SVGElement, geometry: NumberLineGeometry): void => {
  appendLine(documentRef, svg, geometry.horizontal.axis, "v2-number-line-axis");
  appendArrow(documentRef, svg, geometry.horizontal.arrowLeft);
  appendArrow(documentRef, svg, geometry.horizontal.arrowRight);
};

const renderRealTicks = (documentRef: Document, svg: SVGElement, geometry: NumberLineGeometry): void => {
  appendSubdivisionLines(
    documentRef,
    svg,
    geometry.subdivisions.x,
    "x",
    { start: geometry.realTicks.y1, end: geometry.realTicks.y2 },
    geometry.subdivisions.centerIndex,
  );
  appendLine(documentRef, svg, geometry.centerTick, "v2-number-line-center-tick");
};

const renderComplexGrid = (documentRef: Document, svg: SVGElement, geometry: NumberLineGeometry): void => {
  appendSubdivisionLines(
    documentRef,
    svg,
    geometry.subdivisions.x,
    "x",
    { start: geometry.vertical.axis.from.y, end: geometry.vertical.axis.to.y },
    geometry.subdivisions.centerIndex,
  );
  appendLine(documentRef, svg, geometry.vertical.axis, "v2-number-line-axis");
  appendArrow(documentRef, svg, geometry.vertical.arrowUp);
  appendArrow(documentRef, svg, geometry.vertical.arrowDown);
  appendSubdivisionLines(
    documentRef,
    svg,
    geometry.subdivisions.y,
    "y",
    { start: geometry.horizontal.axis.from.x, end: geometry.horizontal.axis.to.x },
    geometry.subdivisions.centerIndex,
  );
};

const renderVectorIfAvailable = (documentRef: Document, svg: SVGElement, state: GameState): void => {
  const segment = resolveVectorSegmentForState(state, NUMBER_LINE_GEOMETRY);
  if (!segment) {
    return;
  }
  appendLine(documentRef, svg, segment, "v2-number-line-vector");

  const svgNs = "http://www.w3.org/2000/svg";
  const tip = documentRef.createElementNS(svgNs, "circle");
  tip.setAttribute("cx", segment.to.x.toString());
  tip.setAttribute("cy", segment.to.y.toString());
  tip.setAttribute("r", "1.05");
  tip.setAttribute("class", "v2-number-line-vector-tip");
  svg.appendChild(tip);
};

export const clearNumberLineVisualizerPanel = (root: Element): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-number-line-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "true");
};

export const renderNumberLineVisualizerPanel = (root: Element, state: GameState): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-number-line-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "false");

  if (typeof document === "undefined") {
    panel.textContent = resolveNumberLineMode(state) === "complex_grid"
      ? "\u2191\n|\n|\n|\n|\n\u2193\n\n\u2190\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2192"
      : buildAsciiNumberLine();
    return;
  }

  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");
  svg.setAttribute("class", "v2-number-line-plot");
  svg.setAttribute("viewBox", "0 0 100 24");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Horizontal number line with arrows and center tick");

  const mode = resolveNumberLineMode(state);
  renderBaseHorizontalAxis(document, svg, NUMBER_LINE_GEOMETRY);
  if (mode === "complex_grid") {
    renderComplexGrid(document, svg, NUMBER_LINE_GEOMETRY);
  } else {
    renderRealTicks(document, svg, NUMBER_LINE_GEOMETRY);
  }
  renderVectorIfAvailable(document, svg, state);

  panel.appendChild(svg);
};

