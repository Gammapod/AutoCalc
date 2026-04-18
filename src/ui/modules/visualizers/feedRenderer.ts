import type { GameState } from "../../../domain/types.js";
import {
  applyUxRoleAttributes,
  buildFeedTableViewModelForState,
  resolveFeedRowUxAssignment,
  type UxRoleAssignment,
} from "../../shared/readModel.js";

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

const appendFeedTableLine = (
  table: HTMLElement,
  leftText: string,
  zText: string | null,
  className?: string,
  uxAssignment?: UxRoleAssignment,
  zUxAssignment?: UxRoleAssignment,
): void => {
  const line = document.createElement("div");
  line.className = className ?? "v2-feed-table-line";
  if (uxAssignment) {
    applyUxRoleAttributes(line, uxAssignment);
  }
  if (zText !== null) {
    line.classList.add("v2-feed-table-line--with-z");
  }
  const left = document.createElement("span");
  left.className = "v2-feed-left-col";
  left.textContent = leftText;
  line.appendChild(left);
  if (zText !== null) {
    const z = document.createElement("span");
    z.className = "v2-feed-z-col";
    z.textContent = zText;
    applyUxRoleAttributes(z, zUxAssignment ?? { uxRole: "imaginary", uxState: "active" });
    line.appendChild(z);
  }
  table.appendChild(line);
};

const buildPlainFeedTableLine = (leftText: string, zText: string | null): string => `${leftText}${zText ?? ""}`;

const buildFeedXRowCell = (xText: string | null, width: number): string =>
  xText === null ? " ".repeat(width) : `${padLeft(xText, Math.max(1, width - 1))} `;

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

  const view = buildFeedTableViewModelForState(state);
  feedPanel.innerHTML = "";
  feedPanel.setAttribute("aria-hidden", "false");

  const headerLeft = `${padCenter("X", view.xWidth)}|${padCenter("Y", view.yWidth)}`;
  const dividerLeft = `${buildDivider(view.xWidth)}|${buildDivider(view.yWidth)}`;
  const headerZ = view.showZColumn ? `|${padCenter("Z", view.zWidth)}` : null;
  const dividerZ = view.showZColumn ? `|${buildDivider(view.zWidth)}` : null;
  const plainLines: string[] = [buildPlainFeedTableLine(headerLeft, headerZ), buildPlainFeedTableLine(dividerLeft, dividerZ)];
  const visibleRows = view.rows.length > 0 ? view.rows : [null];
  for (const row of visibleRows) {
    const rowLeft = row
      ? `${buildFeedXRowCell(row.xLabel, view.xWidth)}|${padLeft(row.yText, view.yWidth)}`
      : `${buildFeedXRowCell(null, view.xWidth)}|${" ".repeat(view.yWidth)}`;
    const rowZ = view.showZColumn ? `|${padLeft(row?.zText ?? "0", view.zWidth)}` : null;
    plainLines.push(buildPlainFeedTableLine(rowLeft, rowZ));
  }

  if (typeof document === "undefined") {
    feedPanel.innerHTML = plainLines.join("\n");
    return;
  }

  const table = document.createElement("div");
  table.className = "v2-feed-table";

  appendFeedTableLine(table, headerLeft, headerZ);
  appendFeedTableLine(table, dividerLeft, dividerZ);

  for (const row of visibleRows) {
    const rowLeft = row
      ? `${buildFeedXRowCell(row.xLabel, view.xWidth)}|${padLeft(row.yText, view.yWidth)}`
      : `${buildFeedXRowCell(null, view.xWidth)}|${" ".repeat(view.yWidth)}`;
    const rowZ = view.showZColumn ? `|${padLeft(row?.zText ?? "0", view.zWidth)}` : null;
    const rowClassName = (() => {
      if (!row) {
        return "v2-feed-table-line";
      }
      if (row.hasError) {
        return "v2-feed-table-line v2-feed-row--error";
      }
      if (row.rowKind === "committed" && row.isCycle) {
        return "v2-feed-table-line v2-feed-row--cycle";
      }
      if (row.rowKind !== "committed") {
        return "v2-feed-table-line v2-feed-row--forecast";
      }
      return "v2-feed-table-line";
    })();
    const rowZUxAssignment: UxRoleAssignment = row
      ? (() => {
        if (row.hasError) {
          return { uxRole: "error", uxState: "active" };
        }
        if (row.rowKind === "committed" && row.isCycle) {
          return { uxRole: "analysis", uxState: "active" };
        }
        if (row.rowKind !== "committed") {
          return { uxRole: "unlock", uxState: "muted" };
        }
        return { uxRole: "imaginary", uxState: "active" };
      })()
      : { uxRole: "imaginary", uxState: "active" };
    appendFeedTableLine(
      table,
      rowLeft,
      rowZ,
      rowClassName,
      row ? resolveFeedRowUxAssignment(row) : { uxRole: "default", uxState: "muted" },
      rowZUxAssignment,
    );
  }

  feedPanel.appendChild(table);
};
