import type { GameState } from "../../../../src/domain/types.js";
import { buildGraphPoints, buildGraphXWindow, buildGraphYWindow } from "./graphModel.js";

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
  circlePanel.setAttribute("aria-hidden", "true");
};

export const renderCircleVisualizerPanel = (root: Element, _state: GameState): void => {
  const circlePanel = root.querySelector<HTMLElement>("[data-v2-circle-panel]");
  if (!circlePanel) {
    return;
  }
  const points = buildGraphPoints(_state.calculator.rollEntries);
  const xWindow = buildGraphXWindow(points.length);
  const yWindow = buildGraphYWindow(_state.unlocks.maxTotalDigits);
  const maxMagnitude = Math.max(Math.abs(yWindow.min), Math.abs(yWindow.max), 1);
  const angularStepCount = Math.max(1, buildGraphXWindow(0).max);
  const minX = xWindow.min;
  const maxX = xWindow.max;

  circlePanel.innerHTML = "";
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

  const tracePoints: string[] = [];
  for (const point of points) {
    if (point.x < minX || point.x > maxX) {
      continue;
    }
    const ringIndex = point.x % angularStepCount;
    const theta = (ringIndex / angularStepCount) * Math.PI * 2;
    const normalizedMagnitude = Math.min(1, Math.abs(point.y) / maxMagnitude);
    const radial = normalizedMagnitude * PLOT_RADIUS;
    const px = CENTER + Math.cos(theta) * radial;
    const py = CENTER - Math.sin(theta) * radial;
    tracePoints.push(`${px.toFixed(2)},${py.toFixed(2)}`);

    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("class", point.hasError ? "v2-circle-point v2-circle-point--error" : "v2-circle-point");
    dot.setAttribute("cx", px.toFixed(2));
    dot.setAttribute("cy", py.toFixed(2));
    dot.setAttribute("r", point.hasError ? "1.8" : "1.4");
    svg.appendChild(dot);
  }

  if (tracePoints.length >= 2) {
    const trace = document.createElementNS(SVG_NS, "polyline");
    trace.setAttribute("class", "v2-circle-trace");
    trace.setAttribute("points", tracePoints.join(" "));
    svg.insertBefore(trace, svg.firstChild);
  }

  circlePanel.appendChild(svg);
  circlePanel.setAttribute("aria-hidden", "false");
};
