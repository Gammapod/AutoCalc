import { HISTORY_FLAG, STEP_EXPANSION_FLAG } from "../../../domain/state.js";
import type { GameState } from "../../../domain/types.js";

type StateRow = {
  label: string;
  value: string;
};

const formatSettingToggle = (enabled: boolean): string => (enabled ? "set" : "not set");

const buildStateRows = (state: GameState): StateRow[] => {
  const stepExpansionFlagEnabled = Boolean(state.ui.buttonFlags[STEP_EXPANSION_FLAG]);
  const historyFlagEnabled = Boolean(state.ui.buttonFlags[HISTORY_FLAG]);
  return [
    { label: "alpha", value: state.lambdaControl.alpha.toString() },
    { label: "beta", value: state.lambdaControl.beta.toString() },
    { label: "gamma", value: state.lambdaControl.gamma.toString() },
    { label: "delta", value: state.lambdaControl.delta.toString() },
    { label: "epsilon", value: state.lambdaControl.epsilon.toString() },
    { label: "active visualizer", value: state.settings.visualizer },
    { label: "active base", value: state.settings.base },
    { label: "active wrap", value: state.settings.wrapper },
    { label: "step_expansion", value: `${state.settings.stepExpansion} (${formatSettingToggle(stepExpansionFlagEnabled)})` },
    { label: "history", value: formatSettingToggle(historyFlagEnabled) },
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
