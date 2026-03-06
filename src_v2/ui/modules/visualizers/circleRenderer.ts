import type { GameState } from "../../../../src/domain/types.js";
import {
  detectResidueWheelSpec,
  projectRadialPoints,
  projectResidueWheelPoints,
  resolveCircleRenderMode,
  type CircleSegment,
} from "./circleModel.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const VIEWBOX_SIZE = 100;
const CENTER = VIEWBOX_SIZE / 2;
const PLOT_RADIUS = 48;

export const clearCircleVisualizerPanel = (root: Element): void => {
  const circlePanel = root.querySelector<HTMLElement>("[data-v2-circle-panel]");
  if (!circlePanel) {
    return;
  }
  circlePanel.innerHTML = "";
  delete circlePanel.dataset.v2CircleMode;
  circlePanel.setAttribute("aria-hidden", "true");
};

const appendTraceSegment = (svg: SVGElement, tracePoints: CircleSegment): void => {
  if (tracePoints.length < 2) {
    return;
  }
  const trace = document.createElementNS(SVG_NS, "polyline");
  trace.setAttribute("class", "v2-circle-trace");
  trace.setAttribute("points", tracePoints.map((point) => `${point.px.toFixed(2)},${point.py.toFixed(2)}`).join(" "));
  svg.insertBefore(trace, svg.firstChild);
};

export const renderCircleVisualizerPanel = (root: Element, state: GameState): void => {
  const circlePanel = root.querySelector<HTMLElement>("[data-v2-circle-panel]");
  if (!circlePanel) {
    return;
  }
  const mode = resolveCircleRenderMode(state);
  const residueWheelSpec = mode === "residue_wheel" ? detectResidueWheelSpec(state) : null;

  circlePanel.innerHTML = "";
  circlePanel.dataset.v2CircleMode = mode;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "v2-circle-plot");
  svg.setAttribute("viewBox", `0 0 ${VIEWBOX_SIZE.toString()} ${VIEWBOX_SIZE.toString()}`);
  svg.setAttribute("aria-hidden", "true");

  const frameCircle = document.createElementNS(SVG_NS, "circle");
  frameCircle.setAttribute("class", "v2-circle-frame");
  frameCircle.setAttribute("cx", CENTER.toString());
  frameCircle.setAttribute("cy", CENTER.toString());
  frameCircle.setAttribute("r", PLOT_RADIUS.toString());
  svg.appendChild(frameCircle);

  const centerDot = document.createElementNS(SVG_NS, "circle");
  centerDot.setAttribute("class", "v2-circle-center");
  centerDot.setAttribute("cx", CENTER.toString());
  centerDot.setAttribute("cy", CENTER.toString());
  centerDot.setAttribute("r", "1.2");
  svg.appendChild(centerDot);

  if (residueWheelSpec) {
    const projected = projectResidueWheelPoints(state.calculator.rollEntries, residueWheelSpec, CENTER, PLOT_RADIUS);
    for (const segment of projected.segments) {
      appendTraceSegment(svg, segment);
    }
    for (const point of projected.dots) {
      const dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("class", "v2-circle-point");
      dot.setAttribute("cx", point.px.toFixed(2));
      dot.setAttribute("cy", point.py.toFixed(2));
      dot.setAttribute("r", "1.4");
      svg.appendChild(dot);
    }
  } else {
    const projected = projectRadialPoints(state, CENTER, PLOT_RADIUS);
    appendTraceSegment(svg, projected.trace);
    for (const point of projected.dots) {
      const dot = document.createElementNS(SVG_NS, "circle");
      dot.setAttribute("class", point.hasError ? "v2-circle-point v2-circle-point--error" : "v2-circle-point");
      dot.setAttribute("cx", point.px.toFixed(2));
      dot.setAttribute("cy", point.py.toFixed(2));
      dot.setAttribute("r", point.hasError ? "1.8" : "1.4");
      svg.appendChild(dot);
    }
  }

  circlePanel.appendChild(svg);
  circlePanel.setAttribute("aria-hidden", "false");
};
