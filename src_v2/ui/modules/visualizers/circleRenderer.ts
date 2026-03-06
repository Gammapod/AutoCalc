import type { GameState } from "../../../../src/domain/types.js";

const CIRCLE_MARKUP = '<div class="v2-circle-glyph" aria-hidden="true"></div>';

export const clearCircleVisualizerPanel = (root: Element): void => {
  const circlePanel = root.querySelector<HTMLElement>("[data-v2-circle-panel]");
  if (!circlePanel) {
    return;
  }
  circlePanel.innerHTML = "";
  circlePanel.setAttribute("aria-hidden", "true");
};

export const renderCircleVisualizerPanel = (root: Element, _state: GameState): void => {
  const circlePanel = root.querySelector<HTMLElement>("[data-v2-circle-panel]");
  if (!circlePanel) {
    return;
  }
  if (circlePanel.innerHTML !== CIRCLE_MARKUP) {
    circlePanel.innerHTML = CIRCLE_MARKUP;
  }
  circlePanel.setAttribute("aria-hidden", "false");
};
