import type { GameState } from "../../../domain/types.js";
import { buildFactorizationPanelViewModel } from "../../shared/readModel.js";

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
  const hasLatestRollError = Boolean(state.calculator.rollEntries.at(-1)?.error);
  const rows = [
    { text: model.seedLabel, kind: "seed" as const, isCycle: false },
    { text: model.currentLabel, kind: "current" as const, isCycle: false },
    { text: model.growthLabel, kind: "growth" as const, isCycle: false },
    ...(model.transientLabel ? [{ text: model.transientLabel, kind: "transient" as const, isCycle: true }] : []),
    ...(model.cycleLabel ? [{ text: model.cycleLabel, kind: "cycle" as const, isCycle: true }] : []),
  ];

  if (typeof document === "undefined") {
    panel.textContent = rows.map((row) => row.text).join("\n");
    return;
  }

  const table = document.createElement("div");
  table.className = "v2-factorization-table";
  for (const rowView of rows) {
    const row = document.createElement("div");
    row.className = "v2-factorization-row";
    if (rowView.kind === "current" && hasLatestRollError) {
      row.classList.add("v2-factorization-row--error");
    }
    if (rowView.isCycle) {
      row.classList.add("v2-factorization-row--cycle");
    }
    if (rowView.kind === "transient" || rowView.kind === "cycle") {
      const equalsIndex = rowView.text.indexOf("=");
      const valueText = equalsIndex >= 0 ? rowView.text.slice(equalsIndex + 1).trim() : "";
      const base = document.createElement("span");
      base.textContent = "f";
      const superscript = document.createElement("sup");
      superscript.textContent = rowView.kind === "transient" ? "\u03BC" : "\u27E1";
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
