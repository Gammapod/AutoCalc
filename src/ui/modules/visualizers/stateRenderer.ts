import type { GameState } from "../../../domain/types.js";
import { resolveWrapStageMode } from "../../../domain/executionPlan.js";

type StateRow = {
  label: string;
  value: string;
};

const buildStateRows = (state: GameState): StateRow[] => {
  const wrapMode = resolveWrapStageMode(state) ?? "none";
  return [
    { label: "alpha", value: state.lambdaControl.alpha.toString() },
    { label: "beta", value: state.lambdaControl.beta.toString() },
    { label: "gamma", value: state.lambdaControl.gamma.toString() },
    { label: "delta", value: state.lambdaControl.delta.toString() },
    { label: "delta_q", value: state.lambdaControl.delta_q.toString() },
    { label: "epsilon", value: state.lambdaControl.epsilon.toString() },
    { label: "active visualizer", value: state.settings.visualizer },
    { label: "active base", value: state.settings.base },
    { label: "active wrap", value: wrapMode },
    { label: "step_expansion", value: state.settings.stepExpansion },
    { label: "history", value: state.settings.history },
    { label: "forecast", value: state.settings.forecast },
    { label: "cycle", value: state.settings.cycle },
  ];
};

export const clearStateVisualizerPanel = (root: Element): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-state-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "true");
};

export const renderStateVisualizerPanel = (root: Element, state: GameState): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-state-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "false");

  const rows = buildStateRows(state);
  if (typeof document === "undefined") {
    panel.textContent = rows.map((row) => `${row.label}: ${row.value}`).join("\n");
    return;
  }

  const table = document.createElement("div");
  table.className = "v2-state-table";
  for (const row of rows) {
    const rowEl = document.createElement("div");
    rowEl.className = "v2-state-row";

    const keyEl = document.createElement("span");
    keyEl.className = "v2-state-key";
    keyEl.textContent = row.label;

    const valueEl = document.createElement("span");
    valueEl.className = "v2-state-value";
    valueEl.textContent = row.value;

    rowEl.append(keyEl, valueEl);
    table.appendChild(rowEl);
  }
  panel.appendChild(table);
};
