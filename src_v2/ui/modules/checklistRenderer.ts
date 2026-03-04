import { unlockCatalog } from "../../../src/content/unlocks.catalog.js";
import { buildVisibleChecklistRows } from "../shared/readModelHelpers.js";
import type { GameState } from "../../../src/domain/types.js";

export const renderChecklistV2Module = (root: Element, state: GameState): void => {
  const unlockEl = root.querySelector("[data-unlocks]");
  if (!unlockEl) {
    throw new Error("Checklist mount point is missing.");
  }

  unlockEl.setAttribute("data-checklist-state", "open");
  unlockEl.setAttribute("data-checklist-animate", "false");
  unlockEl.setAttribute("aria-hidden", "false");
  unlockEl.innerHTML = "";

  const title = document.createElement("div");
  title.className = "unlock-title";
  title.textContent = "Unlocks";
  unlockEl.appendChild(title);

  const header = document.createElement("div");
  header.className = "unlock-header";
  const hintHeader = document.createElement("span");
  hintHeader.textContent = "Hint";
  const rewardHeader = document.createElement("span");
  rewardHeader.textContent = "Reward";
  header.append(hintHeader, rewardHeader);
  unlockEl.appendChild(header);

  const rows = buildVisibleChecklistRows(state);
  const hintByUnlockId = new Map(unlockCatalog.map((unlock) => [unlock.id, unlock.description]));
  if (rows.length === 0) {
    const emptyStateEl = document.createElement("div");
    emptyStateEl.className = "unlock-empty-state";
    emptyStateEl.textContent = "No currently attemptable unlocks from active keypad layout.";
    unlockEl.appendChild(emptyStateEl);
    return;
  }

  for (const row of rows) {
    const rowEl = document.createElement("div");
    rowEl.className = "unlock-row";
    if (row.state === "completed") {
      rowEl.classList.add("unlock-row--completed");
    }
    const hintEl = document.createElement("span");
    hintEl.className = "unlock-hint";
    hintEl.textContent = hintByUnlockId.get(row.id) ?? "";
    rowEl.appendChild(hintEl);
    const nameEl = document.createElement("span");
    nameEl.className = "unlock-name";
    nameEl.textContent = row.name;
    rowEl.appendChild(nameEl);
    unlockEl.appendChild(rowEl);
  }
};
