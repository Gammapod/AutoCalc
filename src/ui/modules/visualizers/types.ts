import type { ActiveVisualizer, GameState, VisualizerId } from "../../../domain/types.js";

export type VisualizerHostPanel = ActiveVisualizer;

export type VisualizerFitKind = "text_wrap_clamp" | "plot_scale_clip";

export type VisualizerOverflowPolicy = "forbid_scroll";

export type VisualizerFitBudget = {
  topPx: number;
  bodyPx: number;
  bottomPx: number;
  maxLines?: number;
};

export type VisualizerFitStrategy = {
  kind: VisualizerFitKind;
  overflow: VisualizerOverflowPolicy;
  budget: VisualizerFitBudget;
};

export type VisualizerModule = {
  id: VisualizerId;
  fit: VisualizerFitStrategy;
  render: (root: Element, state: GameState) => void;
  clear: (root: Element) => void;
};
