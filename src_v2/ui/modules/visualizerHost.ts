import { FEED_VISIBLE_FLAG, GRAPH_VISIBLE_FLAG } from "../../../src/domain/state.js";
import type { GameState } from "../../../src/domain/types.js";
import { buildRollViewModel } from "../../../src/ui/shared/renderReadModel.js";
import { clearGrapherV2Module, renderGrapherV2Module } from "./grapherRenderer.js";

export type VisualizerHostPanel = "none" | "graph" | "feed";

type PanelRenderer = {
  panel: Exclude<VisualizerHostPanel, "none">;
  isVisible: (state: GameState) => boolean;
  render: (root: Element, state: GameState) => void;
  clear: (root: Element) => void;
};

const clearFeedPanel = (root: Element): void => {
  const feedPanel = root.querySelector<HTMLElement>("[data-v2-feed-panel]");
  if (!feedPanel) {
    return;
  }
  feedPanel.innerHTML = "";
  feedPanel.setAttribute("aria-hidden", "true");
};

const renderFeedPanel = (root: Element, state: GameState): void => {
  const feedPanel = root.querySelector<HTMLElement>("[data-v2-feed-panel]");
  if (!feedPanel) {
    return;
  }

  const view = buildRollViewModel(state.calculator.roll, state.calculator.euclidRemainders, state.calculator.rollErrors);
  feedPanel.innerHTML = "";
  feedPanel.setAttribute("aria-hidden", "false");
  feedPanel.style.setProperty("--roll-line-count", view.lineCount.toString());

  for (const row of view.rows) {
    const line = document.createElement("div");
    line.className = row.remainder || row.errorCode ? "roll-line roll-line--with-remainder" : "roll-line";

    const prefix = document.createElement("span");
    prefix.className = "roll-prefix";
    prefix.textContent = row.prefix;
    line.appendChild(prefix);

    const value = document.createElement("span");
    value.className = "roll-value";
    value.textContent = row.value;
    line.appendChild(value);

    if (row.errorCode) {
      const remainder = document.createElement("span");
      remainder.className = "roll-remainder";
      remainder.textContent = `Err: ${row.errorCode}`;
      line.appendChild(remainder);
    } else if (row.remainder) {
      const remainder = document.createElement("span");
      remainder.className = "roll-remainder";
      remainder.textContent = `\u27E1= ${row.remainder}`;
      line.appendChild(remainder);
    }

    feedPanel.appendChild(line);
  }
};

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

/**
 * Visualizer panel registry.
 * Add a new visualizer by appending another entry with:
 *  - panel key
 *  - visibility predicate
 *  - render and clear behavior
 */
const PANEL_REGISTRY: readonly PanelRenderer[] = [
  {
    panel: "graph",
    isVisible: (state) => Boolean(state.ui.buttonFlags[GRAPH_VISIBLE_FLAG]),
    render: (root, state) => renderGrapherV2Module(root, state),
    clear: () => {
      clearGrapherV2Module();
    },
  },
  {
    panel: "feed",
    isVisible: (state) =>
      !Boolean(state.ui.buttonFlags[GRAPH_VISIBLE_FLAG]) &&
      Boolean(state.ui.buttonFlags[FEED_VISIBLE_FLAG]),
    render: renderFeedPanel,
    clear: clearFeedPanel,
  },
];

export const resolveActiveVisualizerPanel = (state: GameState): VisualizerHostPanel => {
  const active = PANEL_REGISTRY.find((panel) => panel.isVisible(state));
  return active?.panel ?? "none";
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

  for (const panel of PANEL_REGISTRY) {
    if (panel.panel === activePanel) {
      panel.render(root, state);
    } else {
      panel.clear(root);
    }
  }
};

export const clearVisualizerHost = (root: Element): void => {
  clearGrapherV2Module();
  clearFeedPanel(root);
  clearHostUiState(root);
};
