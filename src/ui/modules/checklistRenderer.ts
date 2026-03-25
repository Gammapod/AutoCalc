import { buildVisibleChecklistRows } from "../shared/readModelHelpers.js";
import type { GameState } from "../../domain/types.js";
import { getAppServices, type AppServices } from "../../contracts/appServices.js";

type ChecklistRenderOptions = {
  services?: AppServices;
};

const UNLOCK_CHECKBOX_UNCHECKED = "[\u00A0\u00A0]";
const UNLOCK_CHECKBOX_CHECKED = "[\u00D7]";

const appendChecklistQuickstartGuide = (container: Element, services: AppServices): void => {
  const text = services.contentProvider.uiText.checklist.quickstartItems;
  const guideEl = document.createElement("div");
  guideEl.className = "debug-guide";
  guideEl.setAttribute("aria-label", "Feature overview");

  const titleEl = document.createElement("p");
  titleEl.className = "debug-guide-title";
  titleEl.textContent = services.contentProvider.uiText.checklist.quickstartTitle;
  guideEl.appendChild(titleEl);

  const listEl = document.createElement("ol");
  listEl.className = "debug-guide-list";
  listEl.innerHTML = `
    <li>${text.unlockKeys}</li>
    <li>${text.debugPanel}</li>
    <li>${text.dragDrop}</li>
    <li>
      ${text.allocatorIntro}
      <ul class="debug-guide-sublist">
        <li>${text.allocatorItems[0]}</li>
        <li>${text.allocatorItems[1]}</li>
        <li>${text.allocatorItems[2]}</li>
        <li>${text.allocatorItems[3]}</li>
      </ul>
    </li>
  `;
  guideEl.appendChild(listEl);
  container.appendChild(guideEl);
};

export const renderChecklistV2Module = (root: Element, state: GameState, options: ChecklistRenderOptions = {}): void => {
  const services = options.services ?? getAppServices();
  const content = services.contentProvider;
  const unlockEl = root.querySelector("[data-unlocks]");
  if (!unlockEl) {
    throw new Error("Checklist mount point is missing.");
  }
  const isMainMenuMode = Boolean(state.ui.buttonFlags["mode.main_menu"]);
  const checklistContentVisible = state.ui.buttonFlags["mode.checklist_content_visible"] ?? !isMainMenuMode;
  if (!checklistContentVisible) {
    unlockEl.setAttribute("data-checklist-state", "closed");
    unlockEl.setAttribute("data-checklist-animate", "false");
    unlockEl.setAttribute("aria-hidden", "true");
    unlockEl.innerHTML = "";
    return;
  }

  unlockEl.setAttribute("data-checklist-state", "open");
  unlockEl.setAttribute("data-checklist-animate", "false");
  unlockEl.setAttribute("aria-hidden", "false");
  unlockEl.innerHTML = "";

  const title = document.createElement("div");
  title.className = "unlock-title";
  title.textContent = content.uiText.checklist.title;
  unlockEl.appendChild(title);

  const header = document.createElement("div");
  header.className = "unlock-header";
  const hintHeader = document.createElement("span");
  hintHeader.textContent = content.uiText.checklist.headerHint;
  const rewardHeader = document.createElement("span");
  rewardHeader.textContent = content.uiText.checklist.headerReward;
  header.append(hintHeader, rewardHeader);
  unlockEl.appendChild(header);

  const rows = buildVisibleChecklistRows(state, { catalog: content.unlockCatalog });
  const hintByUnlockId = new Map(content.unlockCatalog.map((unlock) => [unlock.id, unlock.description]));
  if (rows.length === 0) {
    const emptyStateEl = document.createElement("div");
    emptyStateEl.className = "unlock-empty-state";
    emptyStateEl.textContent = content.uiText.checklist.emptyAttemptable;
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
      const checkbox = row.state === "completed" ? UNLOCK_CHECKBOX_CHECKED : UNLOCK_CHECKBOX_UNCHECKED;
      hintEl.textContent = `${checkbox} ${hintByUnlockId.get(row.id) ?? ""}`;
      rowEl.appendChild(hintEl);
      const nameEl = document.createElement("span");
      nameEl.className = "unlock-name";
      nameEl.textContent = row.name;
      rowEl.appendChild(nameEl);
      unlockEl.appendChild(rowEl);
    }
  }
  appendChecklistQuickstartGuide(unlockEl, services);
};
