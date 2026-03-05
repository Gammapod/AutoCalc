import type { GameState } from "../../../src/domain/types.js";
import { VISUALIZER_REGISTRY } from "./visualizers/registry.js";
import type { VisualizerHostPanel } from "./visualizers/types.js";

const clearHostUiState = (root: Element): void => {
  const host = root.querySelector<HTMLElement>("[data-v2-visualizer-host]");
  const graphDevice = root.querySelector<HTMLElement>("[data-grapher-device]");
  const feedPanel = root.querySelector<HTMLElement>("[data-v2-feed-panel]");
  if (host) {
    host.dataset.v2VisualizerPanel = "none";
    host.setAttribute("aria-hidden", "true");
  }
  if (graphDevice) {
    graphDevice.setAttribute("aria-hidden", "true");
  }
  if (feedPanel) {
    feedPanel.setAttribute("aria-hidden", "true");
  }
};

export const resolveActiveVisualizerPanel = (state: GameState): VisualizerHostPanel => {
  const active = VISUALIZER_REGISTRY.find((panel) => panel.isVisible(state));
  return active?.id ?? "none";
};

export const renderVisualizerHost = (root: Element, state: GameState): void => {
  const host = root.querySelector<HTMLElement>("[data-v2-visualizer-host]");
  const graphDevice = root.querySelector<HTMLElement>("[data-grapher-device]");
  const feedPanel = root.querySelector<HTMLElement>("[data-v2-feed-panel]");
  const activePanel = resolveActiveVisualizerPanel(state);

  if (host) {
    host.dataset.v2VisualizerPanel = activePanel;
    host.setAttribute("aria-hidden", activePanel === "none" ? "true" : "false");
  }

  if (graphDevice) {
    graphDevice.setAttribute("aria-hidden", activePanel === "graph" ? "false" : "true");
  }
  if (feedPanel) {
    feedPanel.setAttribute("aria-hidden", activePanel === "feed" ? "false" : "true");
  }

  for (const panel of VISUALIZER_REGISTRY) {
    if (panel.id === activePanel) {
      panel.render(root, state);
    } else {
      panel.clear(root);
    }
  }
};

export const clearVisualizerHost = (root: Element): void => {
  for (const panel of VISUALIZER_REGISTRY) {
    panel.clear(root);
  }
  clearHostUiState(root);
};
