import type { VisualizerModule } from "./types.js";
import { clearFeedVisualizerPanel, renderFeedVisualizerPanel } from "./feedRenderer.js";
import { clearGrapherV2Module, renderGrapherV2Module } from "../grapherRenderer.js";

export const VISUALIZER_REGISTRY: readonly VisualizerModule[] = [
  {
    id: "graph",
    render: (root, state) => renderGrapherV2Module(root, state),
    clear: () => {
      clearGrapherV2Module();
    },
  },
  {
    id: "feed",
    render: renderFeedVisualizerPanel,
    clear: clearFeedVisualizerPanel,
  },
];
