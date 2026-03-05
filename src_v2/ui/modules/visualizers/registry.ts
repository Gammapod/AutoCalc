import { FEED_VISIBLE_FLAG, GRAPH_VISIBLE_FLAG } from "../../../../src/domain/state.js";
import type { VisualizerModule } from "./types.js";
import { clearFeedVisualizerPanel, renderFeedVisualizerPanel } from "./feedRenderer.js";
import { clearGrapherV2Module, renderGrapherV2Module } from "../grapherRenderer.js";

export const VISUALIZER_REGISTRY: readonly VisualizerModule[] = [
  {
    id: "graph",
    isVisible: (state) => Boolean(state.ui.buttonFlags[GRAPH_VISIBLE_FLAG]),
    render: (root, state) => renderGrapherV2Module(root, state),
    clear: () => {
      clearGrapherV2Module();
    },
  },
  {
    id: "feed",
    isVisible: (state) =>
      !Boolean(state.ui.buttonFlags[GRAPH_VISIBLE_FLAG]) &&
      Boolean(state.ui.buttonFlags[FEED_VISIBLE_FLAG]),
    render: renderFeedVisualizerPanel,
    clear: clearFeedVisualizerPanel,
  },
];
