import type { VisualizerModule } from "./types.js";
import { clearFeedVisualizerPanel, renderFeedVisualizerPanel } from "./feedRenderer.js";
import { clearGrapherV2Module, renderGrapherV2Module } from "../grapherRenderer.js";
import { clearCircleVisualizerPanel, renderCircleVisualizerPanel } from "./circleRenderer.js";
import {
  clearEigenAllocatorVisualizerPanel,
  renderEigenAllocatorVisualizerPanel,
} from "./eigenAllocatorRenderer.js";

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
    id: "circle",
    render: renderCircleVisualizerPanel,
    clear: clearCircleVisualizerPanel,
  },
  {
    id: "eigen_allocator",
    render: renderEigenAllocatorVisualizerPanel,
    clear: clearEigenAllocatorVisualizerPanel,
  },
];
