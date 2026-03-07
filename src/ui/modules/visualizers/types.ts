import type { ActiveVisualizer, GameState, VisualizerId } from "../../../domain/types.js";

export type VisualizerHostPanel = ActiveVisualizer;

export type VisualizerModule = {
  id: VisualizerId;
  render: (root: Element, state: GameState) => void;
  clear: (root: Element) => void;
};
