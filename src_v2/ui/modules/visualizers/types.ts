import type { GameState } from "../../../../src/domain/types.js";

export type VisualizerId = "graph" | "feed";

export type VisualizerHostPanel = VisualizerId | "none";

export type VisualizerModule = {
  id: VisualizerId;
  isVisible: (state: GameState) => boolean;
  render: (root: Element, state: GameState) => void;
  clear: (root: Element) => void;
};
