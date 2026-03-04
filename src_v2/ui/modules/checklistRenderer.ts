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
  const challengeHeader = document.createElement("span");
  challengeHeader.textContent = "Challenge";
  const rewardHeader = document.createElement("span");
  rewardHeader.textContent = "Reward";
  header.append(challengeHeader, rewardHeader);
  unlockEl.appendChild(header);

  const rows = buildVisibleChecklistRows(state);
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
    const criteriaEl = document.createElement("span");
    criteriaEl.className = "unlock-criteria";
    for (const criterion of row.criteria) {
      const criterionEl = document.createElement("span");
      criterionEl.className = "unlock-criterion";
      criterionEl.textContent = `[${criterion.checked ? "x" : " "}] ${criterion.label}`;
      criteriaEl.appendChild(criterionEl);
    }
    rowEl.appendChild(criteriaEl);
    const nameEl = document.createElement("span");
    nameEl.className = "unlock-name";
    nameEl.textContent = row.name;
    rowEl.appendChild(nameEl);
    unlockEl.appendChild(rowEl);
  }
};
