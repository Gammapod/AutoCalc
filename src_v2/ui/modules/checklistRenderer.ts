import { CHECKLIST_UNLOCK_ID } from "../../../src/domain/state.js";
import { buildUnlockRows } from "../shared/readModelHelpers.js";
import type { GameState } from "../../../src/domain/types.js";

let previousChecklistUnlocked: boolean | null = null;

const isChecklistUnlocked = (state: GameState): boolean => state.completedUnlockIds.includes(CHECKLIST_UNLOCK_ID);

export const renderChecklistV2Module = (root: Element, state: GameState): void => {
  const unlockEl = root.querySelector("[data-unlocks]");
  if (!unlockEl) {
    throw new Error("Checklist mount point is missing.");
  }

  const checklistUnlocked = isChecklistUnlocked(state);
  const shouldAnimateOpen = previousChecklistUnlocked === false && checklistUnlocked;
  previousChecklistUnlocked = checklistUnlocked;

  unlockEl.setAttribute("data-checklist-state", checklistUnlocked ? "open" : "locked");
  unlockEl.setAttribute("data-checklist-animate", shouldAnimateOpen ? "true" : "false");

  if (!checklistUnlocked) {
    unlockEl.innerHTML = "";
    unlockEl.setAttribute("aria-hidden", "true");
    return;
  }

  unlockEl.setAttribute("aria-hidden", "false");
  unlockEl.innerHTML = "";

  const title = document.createElement("div");
  title.className = "unlock-title";
  title.textContent = "Unlocks";
  unlockEl.appendChild(title);

  const header = document.createElement("div");
  header.className = "unlock-header";
  const nameHeader = document.createElement("span");
  nameHeader.textContent = "Name |";
  const criteriaHeader = document.createElement("span");
  criteriaHeader.textContent = "Criteria";
  header.append(nameHeader, criteriaHeader);
  unlockEl.appendChild(header);

  const rows = buildUnlockRows(state);
  for (const row of rows) {
    const rowEl = document.createElement("div");
    rowEl.className = "unlock-row";
    if (row.state === "completed") {
      rowEl.classList.add("unlock-row--completed");
    }
    const nameEl = document.createElement("span");
    nameEl.className = "unlock-name";
    nameEl.textContent = row.name;
    rowEl.appendChild(nameEl);
    const criteriaEl = document.createElement("span");
    criteriaEl.className = "unlock-criteria";
    for (const criterion of row.criteria) {
      const criterionEl = document.createElement("span");
      criterionEl.className = "unlock-criterion";
      criterionEl.textContent = `[${criterion.checked ? "x" : " "}] ${criterion.label}`;
      criteriaEl.appendChild(criterionEl);
    }
    rowEl.appendChild(criteriaEl);
    unlockEl.appendChild(rowEl);
  }
};
