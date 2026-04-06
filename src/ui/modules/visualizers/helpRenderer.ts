import type { GameState } from "../../../domain/types.js";
import { applyUxRoleAttributes, buildHelpPanelViewModel, resolveHelpRowUxAssignment } from "../../shared/readModel.js";

export const clearHelpVisualizerPanel = (root: Element): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-help-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "true");
};

export const renderHelpVisualizerPanel = (root: Element, state: GameState): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-help-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "false");
  const view = buildHelpPanelViewModel(state);

  if (typeof document === "undefined") {
    panel.textContent = view.rows.map((row) => row.text).join("\n");
    return;
  }

  const table = document.createElement("div");
  table.className = "v2-help-table";
  for (const rowView of view.rows) {
    const row = document.createElement("div");
    row.className = "v2-help-row";
    if (rowView.kind === "section") {
      row.classList.add("v2-help-row--section");
    }
    if (rowView.kind === "placeholder") {
      row.classList.add("v2-help-row--placeholder");
    }
    applyUxRoleAttributes(row, resolveHelpRowUxAssignment(rowView));
    row.textContent = rowView.text;
    table.appendChild(row);
  }
  panel.appendChild(table);
};
