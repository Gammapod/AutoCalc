import type { VisualizerModule } from "./types.js";
import { clearFeedVisualizerPanel, renderFeedVisualizerPanel } from "./feedRenderer.js";
import { clearGrapherV2Module, renderGrapherV2Module } from "../grapherRenderer.js";
import {
  clearEigenAllocatorVisualizerPanel,
  renderEigenAllocatorVisualizerPanel,
} from "./eigenAllocatorRenderer.js";
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
    id: "title",
    fit: {
      kind: "text_wrap_clamp",
      overflow: "forbid_scroll",
      budget: { topPx: 8, bodyPx: 118, bottomPx: 8, maxLines: 3 },
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
    render: renderNumberLineVisualizerPanel,
    clear: clearNumberLineVisualizerPanel,
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
