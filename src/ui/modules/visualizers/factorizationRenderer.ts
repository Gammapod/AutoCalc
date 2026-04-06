import type { GameState } from "../../../domain/types.js";
import { applyUxRoleAttributes, buildFactorizationPanelViewModel, resolveFactorizationRowUxAssignment } from "../../shared/readModel.js";

export const clearFactorizationVisualizerPanel = (root: Element): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-factorization-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "true");
};

export const renderFactorizationVisualizerPanel = (root: Element, state: GameState): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-factorization-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "false");

  const model = buildFactorizationPanelViewModel(state);
  const rows = model.rows;

  if (typeof document === "undefined") {
    panel.textContent = rows.map((row) => row.text).join("\n");
    return;
  }

  const table = document.createElement("div");
  table.className = "v2-factorization-table";
  for (const rowView of rows) {
    const row = document.createElement("div");
    row.className = "v2-factorization-row";
    if (rowView.uxRole === "error") {
      row.classList.add("v2-factorization-row--error");
    }
    if (rowView.role === "cycle_transient" || rowView.role === "cycle_period") {
      row.classList.add("v2-factorization-row--cycle");
    }
    if (rowView.kind === "section") {
      row.classList.add("v2-factorization-row--section");
    }
    if (rowView.kind === "placeholder") {
      row.classList.add("v2-factorization-row--placeholder");
    }
    applyUxRoleAttributes(row, resolveFactorizationRowUxAssignment(rowView));
    if (rowView.role === "cycle_transient" || rowView.role === "cycle_period") {
      const equalsIndex = rowView.text.indexOf("=");
      const valueText = equalsIndex >= 0 ? rowView.text.slice(equalsIndex + 1).trim() : "";
      const base = document.createElement("span");
      base.textContent = "f";
      const superscript = document.createElement("sup");
      superscript.textContent = rowView.role === "cycle_transient" ? "\u03BC" : "\u27E1";
      const suffix = document.createElement("span");
      suffix.textContent = ` = ${valueText}`;
      row.append(base, superscript, suffix);
    } else {
      row.textContent = rowView.text;
    }
    table.appendChild(row);
  }
  panel.appendChild(table);
};
