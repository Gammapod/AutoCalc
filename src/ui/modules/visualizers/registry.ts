import type { VisualizerModule } from "./types.js";
import { clearFeedVisualizerPanel, renderFeedVisualizerPanel } from "./feedRenderer.js";
import { clearGrapherV2Module, renderGrapherV2Module } from "../grapherRenderer.js";
import { clearAlgebraicVisualizerPanel, renderAlgebraicVisualizerPanel } from "./algebraicRenderer.js";
import {
  clearFactorizationVisualizerPanel,
  renderFactorizationVisualizerPanel,
} from "./factorizationRenderer.js";
import { clearTitleVisualizerPanel, renderTitleVisualizerPanel } from "./titleRenderer.js";
import { clearHelpVisualizerPanel, renderHelpVisualizerPanel } from "./helpRenderer.js";
import {
  clearReleaseNotesVisualizerPanel,
  renderReleaseNotesVisualizerPanel,
} from "./releaseNotesRenderer.js";
import {
  clearNumberLineVisualizerPanel,
  renderNumberLineVisualizerPanel,
} from "./numberLineRenderer.js";
import { resolveNumberLineMode } from "./numberLineModel.js";
import { clearCircleVisualizerPanel, renderCircleVisualizerPanel } from "./circleRenderer.js";

export const VISUALIZER_REGISTRY: readonly VisualizerModule[] = [
  {
    id: "graph",
    fit: {
      kind: "plot_scale_clip",
      overflow: "forbid_scroll",
      budget: { topPx: 8, bodyPx: 118, bottomPx: 8 },
    },
    size: {
      mode: "ratio",
      ratio: 0.60,
    },
    render: (root, state) => renderGrapherV2Module(root, state),
    clear: (root) => {
      clearGrapherV2Module(root);
    },
  },
  {
    id: "feed",
    fit: {
      kind: "text_wrap_clamp",
      overflow: "forbid_scroll",
      budget: { topPx: 8, bodyPx: 118, bottomPx: 8, maxLines: 12 },
    },
    size: {
      mode: "text_budget",
      minLines: 1,
      targetLines: 7,
      maxLines: 12,
    },
    render: renderFeedVisualizerPanel,
    clear: clearFeedVisualizerPanel,
  },
  {
    id: "title",
    fit: {
      kind: "text_wrap_clamp",
      overflow: "forbid_scroll",
      budget: { topPx: 8, bodyPx: 118, bottomPx: 8, maxLines: 3 },
    },
    size: {
      mode: "text_budget",
      minLines: 2,
      targetLines: 3,
      maxLines: 4,
    },
    render: renderTitleVisualizerPanel,
    clear: clearTitleVisualizerPanel,
  },
  {
    id: "release_notes",
    fit: {
      kind: "text_wrap_clamp",
      overflow: "forbid_scroll",
      budget: { topPx: 8, bodyPx: 118, bottomPx: 8, maxLines: 9 },
    },
    size: {
      mode: "text_budget",
      minLines: 6,
      targetLines: 7,
      maxLines: 9,
    },
    render: renderReleaseNotesVisualizerPanel,
    clear: clearReleaseNotesVisualizerPanel,
  },
  {
    id: "help",
    fit: {
      kind: "text_wrap_clamp",
      overflow: "forbid_scroll",
      budget: { topPx: 8, bodyPx: 118, bottomPx: 8, maxLines: 9 },
    },
    size: {
      mode: "text_budget",
      minLines: 6,
      targetLines: 7,
      maxLines: 9,
    },
    render: renderHelpVisualizerPanel,
    clear: clearHelpVisualizerPanel,
  },
  {
    id: "factorization",
    fit: {
      kind: "text_wrap_clamp",
      overflow: "forbid_scroll",
      budget: { topPx: 8, bodyPx: 118, bottomPx: 8, maxLines: 9 },
    },
    size: {
      mode: "text_budget",
      minLines: 6,
      targetLines: 7,
      maxLines: 9,
    },
    render: renderFactorizationVisualizerPanel,
    clear: clearFactorizationVisualizerPanel,
  },
  {
    id: "number_line",
    fit: {
      kind: "plot_scale_clip",
      overflow: "forbid_scroll",
      budget: { topPx: 8, bodyPx: 118, bottomPx: 8 },
    },
    size: {
      mode: "ratio",
      ratio: 0.29,
    },
    resolveSize: (state) =>
      resolveNumberLineMode(state) === "complex_grid"
        ? { mode: "ratio", ratio: 1 }
        : { mode: "ratio", ratio: 0.29 },
    render: renderNumberLineVisualizerPanel,
    clear: clearNumberLineVisualizerPanel,
  },
  {
    id: "circle",
    fit: {
      kind: "plot_scale_clip",
      overflow: "forbid_scroll",
      budget: { topPx: 8, bodyPx: 118, bottomPx: 8 },
    },
    size: {
      mode: "ratio",
      ratio: 1,
    },
    render: renderCircleVisualizerPanel,
    clear: clearCircleVisualizerPanel,
  },
  {
    id: "algebraic",
    fit: {
      kind: "text_wrap_clamp",
      overflow: "forbid_scroll",
      budget: { topPx: 8, bodyPx: 118, bottomPx: 8, maxLines: 6 },
    },
    size: {
      mode: "text_budget",
      minLines: 4,
      targetLines: 5,
      maxLines: 6,
    },
    render: renderAlgebraicVisualizerPanel,
    clear: clearAlgebraicVisualizerPanel,
  },
];
