import { unlockCatalog } from "../../content/unlocks.catalog.js";
import { buildVisibleChecklistRows } from "../shared/readModelHelpers.js";
import type { GameState } from "../../domain/types.js";

const appendChecklistQuickstartGuide = (container: Element): void => {
  const guideEl = document.createElement("div");
  guideEl.className = "debug-guide";
  guideEl.setAttribute("aria-label", "Feature overview");

  const titleEl = document.createElement("p");
  titleEl.className = "debug-guide-title";
  titleEl.textContent = "Feature Overview";
  guideEl.appendChild(titleEl);

  const listEl = document.createElement("ol");
  listEl.className = "debug-guide-list";
  listEl.innerHTML = `
    <li>Make calculations to unlock more convenient calculator keys.</li>
    <li>Hold down "MODIFY CALCULATOR" for 1.5 seconds to edit calculator.</li>
    <li>Drag+Drop keys to rearrange and modify layout.</li>
    <li>
      Allocator can change:
      <ul class="debug-guide-sublist">
        <li>Size of calculator keypad</li>
        <li>Range of total display</li>
        <li>Number of operations per function</li>
        <li>Speed of auto-clicker</li>
      </ul>
    </li>
  `;
  guideEl.appendChild(listEl);
  container.appendChild(guideEl);
};

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
  } else {
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
  }
  appendChecklistQuickstartGuide(unlockEl);
};
