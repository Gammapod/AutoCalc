import type { VisualizerModule } from "./types.js";
import { clearFeedVisualizerPanel, renderFeedVisualizerPanel } from "./feedRenderer.js";
import { clearGrapherV2Module, renderGrapherV2Module } from "../grapherRenderer.js";
import { clearCircleVisualizerPanel, renderCircleVisualizerPanel } from "./circleRenderer.js";
import {
  clearEigenAllocatorVisualizerPanel,
  renderEigenAllocatorVisualizerPanel,
} from "./eigenAllocatorRenderer.js";
import { clearAlgebraicVisualizerPanel, renderAlgebraicVisualizerPanel } from "./algebraicRenderer.js";
import {
  clearFactorizationVisualizerPanel,
  renderFactorizationVisualizerPanel,
} from "./factorizationRenderer.js";

export const VISUALIZER_REGISTRY: readonly VisualizerModule[] = [
  {
    id: "graph",
    fit: {
      kind: "plot_scale_clip",
      overflow: "forbid_scroll",
      budget: { topPx: 8, bodyPx: 118, bottomPx: 8 },
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
      budget: { topPx: 8, bodyPx: 118, bottomPx: 8, maxLines: 9 },
    },
    render: renderFeedVisualizerPanel,
    clear: clearFeedVisualizerPanel,
  },
  {
    id: "factorization",
    fit: {
      kind: "text_wrap_clamp",
      overflow: "forbid_scroll",
      budget: { topPx: 8, bodyPx: 118, bottomPx: 8, maxLines: 5 },
    },
    render: renderFactorizationVisualizerPanel,
    clear: clearFactorizationVisualizerPanel,
  },
  {
    id: "circle",
    fit: {
      kind: "plot_scale_clip",
      overflow: "forbid_scroll",
      budget: { topPx: 8, bodyPx: 118, bottomPx: 8 },
    },
    render: renderCircleVisualizerPanel,
    clear: clearCircleVisualizerPanel,
  },
  {
    id: "eigen_allocator",
    fit: {
      kind: "text_wrap_clamp",
      overflow: "forbid_scroll",
      budget: { topPx: 8, bodyPx: 118, bottomPx: 8, maxLines: 6 },
    },
    render: renderEigenAllocatorVisualizerPanel,
    clear: clearEigenAllocatorVisualizerPanel,
  },
  {
    id: "algebraic",
    fit: {
      kind: "text_wrap_clamp",
      overflow: "forbid_scroll",
      budget: { topPx: 8, bodyPx: 118, bottomPx: 8, maxLines: 6 },
    },
    render: renderAlgebraicVisualizerPanel,
    clear: clearAlgebraicVisualizerPanel,
  },
];
