import type { GraphLayout } from "./graphLayoutModel.js";
import type { GraphCycleOverlaySegment } from "./graphModel.js";

export type GraphOverlayColors = {
  gridColor: string;
  axisColor: string;
  labelColor: string;
  cycleColor: string;
  cycleImaginaryColor: string;
  targetLineColor: string;
  targetLineHighlightColor: string;
};

export type GraphTargetYLineOverlay = {
  y: number;
  opacity01: number;
};

const SVG_NS = "http://www.w3.org/2000/svg";

const ensureOverlay = (screen: HTMLElement): SVGSVGElement => {
  const existing = screen.querySelector<SVGSVGElement>("[data-grapher-overlay]");
  if (existing) {
    return existing;
  }
  const overlay = screen.ownerDocument.createElementNS(SVG_NS, "svg");
  overlay.setAttribute("data-grapher-overlay", "true");
  overlay.style.position = "absolute";
  overlay.style.inset = "0";
  overlay.style.pointerEvents = "none";
  overlay.style.overflow = "visible";
  overlay.style.zIndex = "2";
  screen.appendChild(overlay);
  return overlay;
};

const line = (
  documentRef: Document,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
): SVGLineElement => {
  const node = documentRef.createElementNS(SVG_NS, "line");
  node.setAttribute("x1", x1.toFixed(2));
  node.setAttribute("y1", y1.toFixed(2));
  node.setAttribute("x2", x2.toFixed(2));
  node.setAttribute("y2", y2.toFixed(2));
  node.setAttribute("stroke", color);
  node.setAttribute("stroke-width", width.toString());
  node.setAttribute("vector-effect", "non-scaling-stroke");
  return node;
};

const text = (
  documentRef: Document,
  value: string,
  x: number,
  y: number,
  color: string,
  fontSizePx: number,
  anchor: "start" | "end" | "middle" = "start",
  baseline: "middle" | "hanging" | "ideographic" = "middle",
): SVGTextElement => {
  const node = documentRef.createElementNS(SVG_NS, "text");
  node.textContent = value;
  node.setAttribute("x", x.toFixed(2));
  node.setAttribute("y", y.toFixed(2));
  node.setAttribute("fill", color);
  node.setAttribute("font-size", `${fontSizePx}px`);
  node.setAttribute("font-family", "\"Cascadia Mono\", \"Cascadia Code\", Consolas, \"DejaVu Sans Mono\", \"Courier New\", monospace");
  node.setAttribute("text-anchor", anchor);
  node.setAttribute("dominant-baseline", baseline);
  return node;
};

const xToPx = (layout: GraphLayout, value: number): number => {
  const span = layout.xDomain.max - layout.xDomain.min;
  if (!Number.isFinite(span) || span <= 0) {
    return layout.plot.left;
  }
  return layout.plot.left + (((value - layout.xDomain.min) / span) * (layout.plot.right - layout.plot.left));
};

const yToPx = (layout: GraphLayout, value: number): number => {
  const span = layout.yDomain.max - layout.yDomain.min;
  if (!Number.isFinite(span) || span <= 0) {
    return layout.plot.bottom;
  }
  return layout.plot.bottom - (((value - layout.yDomain.min) / span) * (layout.plot.bottom - layout.plot.top));
};

export const clearGraphOverlay = (root: Element): void => {
  const overlay = root.querySelector<SVGSVGElement>("[data-grapher-overlay]");
  if (overlay) {
    overlay.remove();
  }
};

export const renderGraphOverlay = (
  root: Element,
  layout: GraphLayout,
  colors: GraphOverlayColors,
  cycleSegments: readonly GraphCycleOverlaySegment[] = [],
  imaginaryCycleSegments: readonly GraphCycleOverlaySegment[] = [],
  targetYLine: GraphTargetYLineOverlay | null = null,
): void => {
  const screen = root.querySelector<HTMLElement>("[data-grapher-device] .grapher-screen");
  if (!screen || !screen.ownerDocument) {
    return;
  }
  screen.style.position = "relative";
  const overlay = ensureOverlay(screen);
  overlay.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
  overlay.setAttribute("width", `${layout.width}`);
  overlay.setAttribute("height", `${layout.height}`);
  overlay.innerHTML = "";

  const doc = screen.ownerDocument;
  const overhang = layout.style.overhangPx;

  for (const tick of layout.yTicks) {
    const y = yToPx(layout, tick.value);
    overlay.appendChild(line(doc, layout.plot.left - overhang, y, layout.plot.right + overhang, y, colors.gridColor, 1));
  }

  for (const tick of layout.xTicks) {
    const x = xToPx(layout, tick.value);
    overlay.appendChild(line(doc, x, layout.plot.top - overhang, x, layout.plot.bottom + overhang, colors.gridColor, 1));
  }

  overlay.appendChild(
    line(
      doc,
      layout.plot.left,
      layout.plot.top - overhang,
      layout.plot.left,
      layout.plot.bottom + overhang,
      colors.axisColor,
      2,
    ),
  );
  const zeroY = yToPx(layout, 0);
  overlay.appendChild(
    line(
      doc,
      layout.plot.left - overhang,
      zeroY,
      layout.plot.right + overhang,
      zeroY,
      colors.axisColor,
      2,
    ),
  );

  if (layout.boundaryLabels.top) {
    overlay.appendChild(
      text(
        doc,
        layout.boundaryLabels.top,
        layout.plot.left,
        layout.style.topLabelInsetPx,
        colors.labelColor,
        layout.style.fontSizePx,
        "start",
        "hanging",
      ),
    );
  }
  if (layout.boundaryLabels.bottom) {
    overlay.appendChild(
      text(
        doc,
        layout.boundaryLabels.bottom,
        layout.plot.left,
        layout.height - layout.style.bottomLabelInsetPx,
        colors.labelColor,
        layout.style.fontSizePx,
        "start",
        "ideographic",
      ),
    );
  }

  overlay.appendChild(
    text(
      doc,
      layout.boundaryLabels.zero,
      layout.plot.left - 8,
      zeroY,
      colors.labelColor,
      layout.style.fontSizePx,
      "end",
      "middle",
    ),
  );

  if (targetYLine && Number.isFinite(targetYLine.y)) {
    const clampedOpacity = Math.max(0, Math.min(1, targetYLine.opacity01));
    const targetLineY = yToPx(layout, targetYLine.y);
    const targetLineBorder = line(
      doc,
      layout.plot.left - overhang,
      targetLineY,
      layout.plot.right + overhang,
      targetLineY,
      colors.targetLineHighlightColor,
      2.4,
    );
    targetLineBorder.setAttribute("class", "v2-grapher-target-y-line-border");
    targetLineBorder.setAttribute("stroke-opacity", Math.min(1, clampedOpacity * 0.95).toFixed(3));
    targetLineBorder.setAttribute("stroke-linecap", "round");
    overlay.appendChild(targetLineBorder);

    const targetLineCore = line(
      doc,
      layout.plot.left - overhang,
      targetLineY,
      layout.plot.right + overhang,
      targetLineY,
      colors.targetLineColor,
      1.3,
    );
    targetLineCore.setAttribute("class", "v2-grapher-target-y-line");
    targetLineCore.setAttribute("stroke-opacity", clampedOpacity.toFixed(3));
    targetLineCore.setAttribute("stroke-linecap", "round");
    overlay.appendChild(targetLineCore);
  }

  const appendCycleSegments = (
    segments: readonly GraphCycleOverlaySegment[],
    color: string,
    channelClassName: "real" | "imaginary",
  ): void => {
    for (const segment of segments) {
      const cycleLine = line(
        doc,
        xToPx(layout, segment.from.x),
        yToPx(layout, segment.from.y),
        xToPx(layout, segment.to.x),
        yToPx(layout, segment.to.y),
        color,
        1,
      );
      cycleLine.setAttribute(
        "class",
        `v2-grapher-cycle-line v2-grapher-cycle-line--${segment.kind} v2-grapher-cycle-line--${channelClassName}`,
      );
      overlay.appendChild(cycleLine);
    }
  };

  appendCycleSegments(cycleSegments, colors.cycleColor, "real");
  appendCycleSegments(imaginaryCycleSegments, colors.cycleImaginaryColor, "imaginary");
};
