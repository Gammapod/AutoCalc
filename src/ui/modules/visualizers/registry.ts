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
    render: (root, state) => renderGrapherV2Module(root, state),
    clear: (root) => {
      clearGrapherV2Module(root);
    },
  },
  {
    id: "feed",
    render: renderFeedVisualizerPanel,
    clear: clearFeedVisualizerPanel,
  },
  {
    id: "factorization",
    render: renderFactorizationVisualizerPanel,
    clear: clearFactorizationVisualizerPanel,
  },
  {
    id: "circle",
    render: renderCircleVisualizerPanel,
    clear: clearCircleVisualizerPanel,
  },
  {
    id: "eigen_allocator",
    render: renderEigenAllocatorVisualizerPanel,
    clear: clearEigenAllocatorVisualizerPanel,
  },
  {
    id: "algebraic",
    render: renderAlgebraicVisualizerPanel,
    clear: clearAlgebraicVisualizerPanel,
  },
];
