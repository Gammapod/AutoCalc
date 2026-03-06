import type { GameState } from "../../../../src/domain/types.js";
import { isRationalCalculatorValue } from "../../../../src/domain/calculatorValue.js";
import { buildFeedTableViewModel } from "../../shared/readModel.js";

const padCenter = (text: string, width: number): string => {
  const visibleText = text.length > width ? text.slice(0, width) : text;
  const padding = width - visibleText.length;
  const left = Math.floor(padding / 2);
  const right = padding - left;
  return `${" ".repeat(left)}${visibleText}${" ".repeat(right)}`;
};

const padLeft = (text: string, width: number): string => {
  if (text.length >= width) {
    return text.slice(-width);
  }
  return `${" ".repeat(width - text.length)}${text}`;
};

const buildDivider = (width: number): string => "-".repeat(width);

const appendFeedTableLine = (
  table: HTMLElement,
  prefixText: string,
  rText: string | null,
  className?: string,
): void => {
  const line = document.createElement("div");
  line.className = className ?? "v2-feed-table-line";
  line.appendChild(document.createTextNode(prefixText));
  if (rText !== null) {
    const rSpan = document.createElement("span");
    rSpan.className = "v2-feed-r-col";
    rSpan.textContent = rText;
    line.appendChild(rSpan);
  }
  table.appendChild(line);
};

const buildPlainFeedTableLine = (prefixText: string, rText: string | null): string =>
  `${prefixText}${rText ?? ""}`;

const isClearedCalculatorState = (state: GameState): boolean =>
  isRationalCalculatorValue(state.calculator.total) &&
  state.calculator.total.value.num === 0n &&
  state.calculator.total.value.den === 1n &&
  !state.calculator.pendingNegativeTotal &&
  state.calculator.rollEntries.length === 0 &&
  state.calculator.operationSlots.length === 0 &&
  state.calculator.draftingSlot === null;

const resolveFeedSeedSnapshot = (state: GameState): GameState["calculator"]["seedSnapshot"] => {
  if (state.calculator.seedSnapshot !== undefined) {
    return state.calculator.seedSnapshot;
  }
  const hasAnyKeyPress = Object.values(state.keyPressCounts).some((count) => (count ?? 0) > 0);
  const shouldRenderClearedPlaceholder =
    isClearedCalculatorState(state) && (state.calculator.singleDigitInitialTotalEntry || !hasAnyKeyPress);
  if (state.calculator.rollEntries.length === 0 && !shouldRenderClearedPlaceholder) {
    return state.calculator.total;
  }
  return undefined;
};

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

  const view = buildFeedTableViewModel(resolveFeedSeedSnapshot(state), state.calculator.rollEntries);
  feedPanel.innerHTML = "";
  feedPanel.setAttribute("aria-hidden", "false");

  const headerPrefix = `|${padCenter("X", view.xWidth)}|${padCenter("Y", view.yWidth)}`;
  const dividerPrefix = `|${buildDivider(view.xWidth)}|${buildDivider(view.yWidth)}`;
  const headerR = view.showRColumn ? `|${padCenter("r", view.rWidth)}|` : null;
  const dividerR = view.showRColumn ? `|${buildDivider(view.rWidth)}|` : null;
  const plainLines: string[] = [buildPlainFeedTableLine(headerPrefix, headerR), buildPlainFeedTableLine(dividerPrefix, dividerR)];
  for (const row of view.rows) {
    const rowPrefix = `|${padLeft(row.x.toString(), view.xWidth)}|${padLeft(row.yText, view.yWidth)}`;
    const rowR = view.showRColumn ? `|${padLeft(row.rText ?? "", view.rWidth)}|` : null;
    plainLines.push(buildPlainFeedTableLine(rowPrefix, rowR));
  }

  if (typeof document === "undefined") {
    feedPanel.innerHTML = plainLines.join("\n");
    return;
  }

  const table = document.createElement("div");
  table.className = "v2-feed-table";

  appendFeedTableLine(table, headerPrefix, headerR);
  appendFeedTableLine(table, dividerPrefix, dividerR);

  for (const row of view.rows) {
    const rowPrefix = `|${padLeft(row.x.toString(), view.xWidth)}|${padLeft(row.yText, view.yWidth)}`;
    const rowR = view.showRColumn ? `|${padLeft(row.rText ?? "", view.rWidth)}|` : null;
    appendFeedTableLine(
      table,
      rowPrefix,
      rowR,
      row.hasError ? "v2-feed-table-line v2-feed-row--error" : "v2-feed-table-line",
    );
  }

  feedPanel.appendChild(table);
};
