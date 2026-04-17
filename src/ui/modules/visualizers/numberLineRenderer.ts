import type { GameState } from "../../../domain/types.js";
import { applyUxRoleAttributes } from "../../shared/readModel.js";
import {
  NUMBER_LINE_GEOMETRY,
  NUMBER_LINE_VECTOR_ARROW_TIP,
  resolveNumberLineMode,
  resolveNumberLineCycleOverlaySegmentsForState,
  resolvePlotRangeForState,
  resolveVectorLayersForState,
  type NumberLineGeometry,
  type NumberLineVectorLayer,
  type Point,
  type Segment,
} from "./numberLineModel.js";
import { formatBoundaryLabel, NUMBER_LINE_REAL_LABEL_FIT } from "./plotPolicy.js";

type AxisKey = "x" | "y";
export type NumberLineLabelZone = "real_left" | "real_right" | "imag_top" | "imag_bottom";
export type NumberLineLabelFitPolicy = "natural" | "constrain_spacing";
export type NumberLineLabelSpec = {
  zone: NumberLineLabelZone;
  text: string;
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  fitPolicy: NumberLineLabelFitPolicy;
  fitMaxWidthUnits?: number;
  fitMinLength?: number;
};

const buildAsciiNumberLine = (): string => "\u2190\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2192";

const hasCurrentRollError = (state: GameState): boolean =>
  Boolean(state.calculator.rollEntries[state.calculator.rollEntries.length - 1]?.error);

const buildPolygonPoints = (points: readonly Point[]): string =>
  points.map((point) => `${point.x.toString()},${point.y.toString()}`).join(" ");

const appendLine = (
  documentRef: Document,
  svg: SVGElement,
  segment: Segment,
  className:
    | "v2-number-line-axis"
    | "v2-number-line-grid-mark"
    | "v2-number-line-center-tick"
    | "v2-number-line-vector"
    | "v2-number-line-vector--current-error"
    | "v2-number-line-vector--history"
    | "v2-number-line-vector--forecast"
    | "v2-number-line-vector--forecast-step"
    | "v2-number-line-cycle-line"
    | "v2-number-line-cycle-line--chain"
    | "v2-number-line-cycle-line--closure",
  roleOverride?: "imaginary",
): void => {
  const svgNs = "http://www.w3.org/2000/svg";
  const line = documentRef.createElementNS(svgNs, "line");
  line.setAttribute("x1", segment.from.x.toString());
  line.setAttribute("y1", segment.from.y.toString());
  line.setAttribute("x2", segment.to.x.toString());
  line.setAttribute("y2", segment.to.y.toString());
  line.setAttribute("class", className);
  if (roleOverride === "imaginary" && className === "v2-number-line-axis") {
    line.classList.add("v2-number-line-axis--imaginary");
  }
  if (className === "v2-number-line-vector--current-error") {
    applyUxRoleAttributes(line, { uxRole: "error", uxState: "active" });
  } else if (
    className === "v2-number-line-vector--history"
    || className === "v2-number-line-vector--forecast-step"
    || className === "v2-number-line-cycle-line"
    || className === "v2-number-line-cycle-line--chain"
    || className === "v2-number-line-cycle-line--closure"
  ) {
    applyUxRoleAttributes(line, { uxRole: "analysis", uxState: "active" });
  } else if (className === "v2-number-line-vector--forecast") {
    applyUxRoleAttributes(line, { uxRole: "unlock", uxState: "active" });
  } else if (roleOverride === "imaginary") {
    applyUxRoleAttributes(line, { uxRole: "imaginary", uxState: "active" });
  } else {
    applyUxRoleAttributes(line, { uxRole: "default", uxState: "normal" });
  }
  svg.appendChild(line);
};

const appendArrow = (
  documentRef: Document,
  svg: SVGElement,
  points: [Point, Point, Point],
  roleOverride?: "imaginary",
): void => {
  const svgNs = "http://www.w3.org/2000/svg";
  const arrow = documentRef.createElementNS(svgNs, "polygon");
  arrow.setAttribute("points", buildPolygonPoints(points));
  arrow.setAttribute("class", "v2-number-line-arrowhead");
  if (roleOverride === "imaginary") {
    arrow.classList.add("v2-number-line-arrowhead--imaginary");
    applyUxRoleAttributes(arrow, { uxRole: "imaginary", uxState: "active" });
  } else {
    applyUxRoleAttributes(arrow, { uxRole: "default", uxState: "normal" });
  }
  svg.appendChild(arrow);
};

const appendVectorTip = (
  documentRef: Document,
  svg: SVGElement,
  point: Point,
  className:
    | "v2-number-line-vector-tip"
    | "v2-number-line-vector-tip--current-error"
    | "v2-number-line-vector-tip--history"
    | "v2-number-line-vector-tip--forecast"
    | "v2-number-line-vector-tip--forecast-step",
): void => {
  const svgNs = "http://www.w3.org/2000/svg";
  const tip = documentRef.createElementNS(svgNs, "circle");
  tip.setAttribute("cx", point.x.toString());
  tip.setAttribute("cy", point.y.toString());
  tip.setAttribute("r", "1.05");
  tip.setAttribute("class", className);
  if (className === "v2-number-line-vector-tip--current-error") {
    applyUxRoleAttributes(tip, { uxRole: "error", uxState: "active" });
  } else if (className === "v2-number-line-vector-tip--history" || className === "v2-number-line-vector-tip--forecast-step") {
    applyUxRoleAttributes(tip, { uxRole: "analysis", uxState: "active" });
  } else if (className === "v2-number-line-vector-tip--forecast") {
    applyUxRoleAttributes(tip, { uxRole: "unlock", uxState: "active" });
  } else {
    applyUxRoleAttributes(tip, { uxRole: "default", uxState: "normal" });
  }
  svg.appendChild(tip);
};

const appendVectorArrowTip = (
  documentRef: Document,
  svg: SVGElement,
  segment: Segment,
  className:
    | "v2-number-line-vector-tip--current-error"
    | "v2-number-line-vector-tip--history"
    | "v2-number-line-vector-tip--forecast"
    | "v2-number-line-vector-tip--forecast-step",
): void => {
  const dx = segment.to.x - segment.from.x;
  const dy = segment.to.y - segment.from.y;
  const length = Math.hypot(dx, dy);
  if (length <= NUMBER_LINE_VECTOR_ARROW_TIP.minSegmentLength) {
    appendVectorTip(documentRef, svg, segment.to, className);
    return;
  }
  const ux = dx / length;
  const uy = dy / length;
  const { headLength, headWidth } = NUMBER_LINE_VECTOR_ARROW_TIP;
  const baseCenter = {
    x: segment.to.x - (ux * headLength),
    y: segment.to.y - (uy * headLength),
  };
  const left = {
    x: baseCenter.x + (-uy * headWidth),
    y: baseCenter.y + (ux * headWidth),
  };
  const right = {
    x: baseCenter.x - (-uy * headWidth),
    y: baseCenter.y - (ux * headWidth),
  };

  const svgNs = "http://www.w3.org/2000/svg";
  const arrow = documentRef.createElementNS(svgNs, "polygon");
  arrow.setAttribute(
    "points",
    `${segment.to.x.toString()},${segment.to.y.toString()} ${left.x.toString()},${left.y.toString()} ${right.x.toString()},${right.y.toString()}`,
  );
  arrow.setAttribute("class", className);
  if (className === "v2-number-line-vector-tip--current-error") {
    applyUxRoleAttributes(arrow, { uxRole: "error", uxState: "active" });
  } else if (className === "v2-number-line-vector-tip--history" || className === "v2-number-line-vector-tip--forecast-step") {
    applyUxRoleAttributes(arrow, { uxRole: "analysis", uxState: "active" });
  } else {
    applyUxRoleAttributes(arrow, { uxRole: "unlock", uxState: "active" });
  }
  svg.appendChild(arrow);
};

const appendScaleLabel = (
  documentRef: Document,
  svg: SVGElement,
  label: NumberLineLabelSpec,
): void => {
  const svgNs = "http://www.w3.org/2000/svg";
  const text = documentRef.createElementNS(svgNs, "text");
  text.setAttribute("x", label.x.toString());
  text.setAttribute("y", label.y.toString());
  text.setAttribute("text-anchor", label.anchor);
  text.setAttribute("class", "v2-number-line-scale-label");
  if (
    label.fitPolicy === "constrain_spacing"
    && typeof label.fitMaxWidthUnits === "number"
    && label.text.length > (label.fitMinLength ?? 0)
  ) {
    text.setAttribute("textLength", label.fitMaxWidthUnits.toString());
    text.setAttribute("lengthAdjust", "spacing");
  }
  applyUxRoleAttributes(text, { uxRole: "default", uxState: "normal" });
  text.textContent = label.text;
  svg.appendChild(text);
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

const renderBaseHorizontalAxis = (
  documentRef: Document,
  svg: SVGElement,
  geometry: NumberLineGeometry,
): void => {
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
  appendSubdivisionLines(
    documentRef,
    svg,
    geometry.subdivisions.y,
    "y",
    { start: geometry.horizontal.axis.from.x, end: geometry.horizontal.axis.to.x },
    geometry.subdivisions.centerIndex,
  );
  appendLine(documentRef, svg, geometry.vertical.axis, "v2-number-line-axis", "imaginary");
  appendArrow(documentRef, svg, geometry.vertical.arrowUp, "imaginary");
  appendArrow(documentRef, svg, geometry.vertical.arrowDown, "imaginary");
};

export const resolveNumberLineLabels = (
  mode: ReturnType<typeof resolveNumberLineMode>,
  range: number,
  geometry: NumberLineGeometry = NUMBER_LINE_GEOMETRY,
): NumberLineLabelSpec[] => {
  const leftLabel = formatBoundaryLabel(-range, { zeroPolicy: "zero" });
  const rightLabel = formatBoundaryLabel(range, { zeroPolicy: "zero" });
  const labels: NumberLineLabelSpec[] = [
    {
      zone: "real_left",
      text: leftLabel,
      x: geometry.horizontal.axis.from.x - 6,
      y: 16.8,
      anchor: "start",
      fitPolicy: "constrain_spacing",
      fitMaxWidthUnits: NUMBER_LINE_REAL_LABEL_FIT.maxWidthUnits,
      fitMinLength: NUMBER_LINE_REAL_LABEL_FIT.minLength,
    },
    {
      zone: "real_right",
      text: rightLabel,
      x: geometry.horizontal.axis.to.x + 6,
      y: 16.8,
      anchor: "end",
      fitPolicy: "constrain_spacing",
      fitMaxWidthUnits: NUMBER_LINE_REAL_LABEL_FIT.maxWidthUnits,
      fitMinLength: NUMBER_LINE_REAL_LABEL_FIT.minLength,
    },
  ];

  if (mode === "complex_grid") {
    labels.push(
      {
        zone: "imag_top",
        text: formatBoundaryLabel(range, { appendImaginaryUnit: true, zeroPolicy: "zero" }),
        x: geometry.vertical.axis.from.x,
        y: -40.6,
        anchor: "start",
        fitPolicy: "natural",
      },
      {
        zone: "imag_bottom",
        text: formatBoundaryLabel(-range, { appendImaginaryUnit: true, zeroPolicy: "zero" }),
        x: geometry.vertical.axis.to.x,
        y: 66.2,
        anchor: "start",
        fitPolicy: "natural",
      },
    );
  }

  return labels;
};

const renderScaleLabels = (
  documentRef: Document,
  svg: SVGElement,
  mode: ReturnType<typeof resolveNumberLineMode>,
  range: number,
): void => {
  resolveNumberLineLabels(mode, range, NUMBER_LINE_GEOMETRY).forEach((label) => {
    appendScaleLabel(documentRef, svg, label);
  });
};

const renderCycleOverlayIfAvailable = (documentRef: Document, svg: SVGElement, state: GameState): void => {
  const segments = resolveNumberLineCycleOverlaySegmentsForState(state, NUMBER_LINE_GEOMETRY);
  for (const overlaySegment of segments) {
    const className = overlaySegment.kind === "closure"
      ? "v2-number-line-cycle-line v2-number-line-cycle-line--closure"
      : "v2-number-line-cycle-line v2-number-line-cycle-line--chain";
    appendLine(
      documentRef,
      svg,
      overlaySegment.segment,
      overlaySegment.kind === "closure" ? "v2-number-line-cycle-line--closure" : "v2-number-line-cycle-line--chain",
    );
    const rendered = svg.lastElementChild as SVGElement | null;
    if (rendered) {
      rendered.setAttribute("class", className);
    }
  }
};

const appendCurrentErrorCenterMarker = (documentRef: Document, svg: SVGElement): void => {
  const svgNs = "http://www.w3.org/2000/svg";
  const marker = documentRef.createElementNS(svgNs, "circle");
  marker.setAttribute("cx", NUMBER_LINE_GEOMETRY.origin.x.toString());
  marker.setAttribute("cy", NUMBER_LINE_GEOMETRY.origin.y.toString());
  marker.setAttribute("r", "1.35");
  marker.setAttribute("class", "v2-number-line-error-center-marker");
  applyUxRoleAttributes(marker, { uxRole: "error", uxState: "active" });
  svg.appendChild(marker);
};

const renderVectorIfAvailable = (documentRef: Document, svg: SVGElement, state: GameState): void => {
  const latestHasError = hasCurrentRollError(state);
  let renderedCurrentLayer = false;
  const classByKind: Record<
    NumberLineVectorLayer["kind"],
    {
      line:
        | "v2-number-line-vector"
        | "v2-number-line-vector--current-error"
        | "v2-number-line-vector--history"
        | "v2-number-line-vector--forecast"
        | "v2-number-line-vector--forecast-step";
      tip:
        | "v2-number-line-vector-tip"
        | "v2-number-line-vector-tip--current-error"
        | "v2-number-line-vector-tip--history"
        | "v2-number-line-vector-tip--forecast"
        | "v2-number-line-vector-tip--forecast-step";
    }
  > = {
    current: { line: "v2-number-line-vector", tip: "v2-number-line-vector-tip" },
    history: { line: "v2-number-line-vector--history", tip: "v2-number-line-vector-tip--history" },
    forecast_history: { line: "v2-number-line-vector--forecast", tip: "v2-number-line-vector-tip--forecast" },
    forecast_step: { line: "v2-number-line-vector--forecast-step", tip: "v2-number-line-vector-tip--forecast-step" },
  };

  resolveVectorLayersForState(state, NUMBER_LINE_GEOMETRY).forEach((layer) => {
    const classes = layer.kind === "current" && latestHasError
      ? { line: "v2-number-line-vector--current-error" as const, tip: "v2-number-line-vector-tip--current-error" as const }
      : classByKind[layer.kind];
    appendLine(documentRef, svg, layer.segment, classes.line);
    if (layer.kind === "current") {
      renderedCurrentLayer = true;
    }
    if (layer.tipKind === "dot") {
      appendVectorTip(documentRef, svg, layer.segment.to, classes.tip);
    } else {
      appendVectorArrowTip(
        documentRef,
        svg,
        layer.segment,
        classes.tip as
          | "v2-number-line-vector-tip--current-error"
          | "v2-number-line-vector-tip--history"
          | "v2-number-line-vector-tip--forecast"
          | "v2-number-line-vector-tip--forecast-step",
      );
    }
  });
  if (latestHasError && !renderedCurrentLayer) {
    appendCurrentErrorCenterMarker(documentRef, svg);
  }
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
  applyUxRoleAttributes(svg, { uxRole: "default", uxState: "normal" });
  svg.setAttribute("viewBox", "0 0 100 24");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Horizontal number line with arrows and center tick");

  const mode = resolveNumberLineMode(state);
  const range = resolvePlotRangeForState(state);
  if (mode === "complex_grid") {
    renderComplexGrid(document, svg, NUMBER_LINE_GEOMETRY);
  } else {
    renderRealTicks(document, svg, NUMBER_LINE_GEOMETRY);
  }
  renderBaseHorizontalAxis(document, svg, NUMBER_LINE_GEOMETRY);
  renderScaleLabels(document, svg, mode, range);
  renderCycleOverlayIfAvailable(document, svg, state);
  renderVectorIfAvailable(document, svg, state);

  panel.appendChild(svg);
};
