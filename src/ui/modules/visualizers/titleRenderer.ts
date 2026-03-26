import type { GameState } from "../../../domain/types.js";
import { buildRollDiagnosticsSnapshot } from "../../../domain/diagnostics.js";

type HelpRow = {
  text: string;
  kind: "section" | "normal" | "placeholder";
};

export const clearTitleVisualizerPanel = (root: Element): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-title-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "true");
};

export const renderTitleVisualizerPanel = (root: Element, state: GameState): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-title-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "false");

  const snapshot = buildRollDiagnosticsSnapshot(state);
  const rows: HelpRow[] = [
    { text: "Last Key", kind: "section" },
    { text: `${snapshot.lastKey.title}: ${snapshot.lastKey.short}`, kind: "normal" },
    { text: snapshot.lastKey.long, kind: "normal" },
    ...snapshot.lastKey.caveats.map((line) => ({ text: line, kind: "placeholder" as const })),
    { text: "Next Operation", kind: "section" },
    { text: snapshot.nextOperation.expandedShort, kind: snapshot.nextOperation.hasPendingOperation ? "normal" : "placeholder" },
    { text: snapshot.nextOperation.expandedLong, kind: snapshot.nextOperation.hasPendingOperation ? "normal" : "placeholder" },
  ];

  if (typeof document === "undefined") {
    panel.textContent = rows.map((row) => row.text).join("\n");
    return;
  }

  const table = document.createElement("div");
  table.className = "v2-help-table";
  for (const rowView of rows) {
    const row = document.createElement("div");
    row.className = "v2-help-row";
    if (rowView.kind === "section") {
      row.classList.add("v2-help-row--section");
    }
    if (rowView.kind === "placeholder") {
      row.classList.add("v2-help-row--placeholder");
    }
    row.textContent = rowView.text;
    table.appendChild(row);
  }
  panel.appendChild(table);
};
