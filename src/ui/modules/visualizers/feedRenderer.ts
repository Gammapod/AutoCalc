import type { GameState } from "../../../domain/types.js";
import { buildFeedTableViewModel } from "../../shared/readModel.js";
import { resolveFeedSeedSnapshot } from "./seedSnapshot.js";

const padCenter = (text: string, width: number): string => {
  const visibleText = text.length > width ? text.slice(0, width) : text;
  const padding = width - visibleText.length;
  const left = Math.floor(padding / 2);
  const right = padding - left;
  return `${" ".repeat(left)}${visibleText}${" ".repeat(right)}`;
};

const padLeft = (text: string, width: number): string => {
  if (text.length >= width) {
    return text;
  }
  return `${" ".repeat(width - text.length)}${text}`;
};

const buildDivider = (width: number): string => "-".repeat(width);
const FEED_VISIBLE_ROWS = 7;

const appendFeedTableLine = (
  table: HTMLElement,
  leftText: string,
  rText: string | null,
  className?: string,
): void => {
  const line = document.createElement("div");
  line.className = className ?? "v2-feed-table-line";
  if (rText !== null) {
    line.classList.add("v2-feed-table-line--with-r");
  }
  const left = document.createElement("span");
  left.className = "v2-feed-left-col";
  left.textContent = leftText;
  line.appendChild(left);
  if (rText !== null) {
    const rSpan = document.createElement("span");
    rSpan.className = "v2-feed-r-col";
    rSpan.textContent = rText;
    line.appendChild(rSpan);
  }
  table.appendChild(line);
};

const buildPlainFeedTableLine = (leftText: string, rText: string | null): string =>
  `${leftText}${rText ?? ""}`;

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

  const view = buildFeedTableViewModel(
    resolveFeedSeedSnapshot(state),
    state.calculator.rollEntries,
    state.unlocks.maxTotalDigits,
  );
  feedPanel.innerHTML = "";
  feedPanel.setAttribute("aria-hidden", "false");

  const headerLeft = `${padCenter("X", view.xWidth)}|${padCenter("Y", view.yWidth)}`;
  const dividerLeft = `${buildDivider(view.xWidth)}|${buildDivider(view.yWidth)}`;
  const headerR = view.showRColumn ? `|${padCenter("r", view.rWidth)}` : null;
  const dividerR = view.showRColumn ? `|${buildDivider(view.rWidth)}` : null;
  const plainLines: string[] = [buildPlainFeedTableLine(headerLeft, headerR), buildPlainFeedTableLine(dividerLeft, dividerR)];
  for (let index = 0; index < FEED_VISIBLE_ROWS; index += 1) {
    const row = view.rows[index];
    const rowLeft = row
      ? `${padLeft(row.x.toString(), view.xWidth)}|${padLeft(row.yText, view.yWidth)}`
      : `${" ".repeat(view.xWidth)}|${" ".repeat(view.yWidth)}`;
    const rowR = view.showRColumn ? `|${padLeft(row?.rText ?? "", view.rWidth)}` : null;
    plainLines.push(buildPlainFeedTableLine(rowLeft, rowR));
  }

  if (typeof document === "undefined") {
    feedPanel.innerHTML = plainLines.join("\n");
    return;
  }

  const table = document.createElement("div");
  table.className = "v2-feed-table";

  appendFeedTableLine(table, headerLeft, headerR);
  appendFeedTableLine(table, dividerLeft, dividerR);

  for (let index = 0; index < FEED_VISIBLE_ROWS; index += 1) {
    const row = view.rows[index];
    const rowLeft = row
      ? `${padLeft(row.x.toString(), view.xWidth)}|${padLeft(row.yText, view.yWidth)}`
      : `${" ".repeat(view.xWidth)}|${" ".repeat(view.yWidth)}`;
    const rowR = view.showRColumn ? `|${padLeft(row?.rText ?? "", view.rWidth)}` : null;
    appendFeedTableLine(
      table,
      rowLeft,
      rowR,
      row?.hasError ? "v2-feed-table-line v2-feed-row--error" : "v2-feed-table-line",
    );
  }

  feedPanel.appendChild(table);
};
