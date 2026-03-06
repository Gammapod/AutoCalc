import type { GameState } from "../../../../src/domain/types.js";
import { buildRollViewModel } from "../../shared/readModel.js";

export const clearFeedVisualizerPanel = (root: Element): void => {
  const feedPanel = root.querySelector<HTMLElement>("[data-v2-feed-panel]");
  if (!feedPanel) {
    return;
  }
  feedPanel.innerHTML = "";
  feedPanel.setAttribute("aria-hidden", "true");
};

export const renderFeedVisualizerPanel = (root: Element, state: GameState): void => {
  const feedPanel = root.querySelector<HTMLElement>("[data-v2-feed-panel]");
  if (!feedPanel) {
    return;
  }

  const view = buildRollViewModel(state.calculator.rollEntries);
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
