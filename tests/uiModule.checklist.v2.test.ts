import assert from "node:assert/strict";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { initialState } from "../src/domain/state.js";
import { renderChecklistV2Module } from "../src/ui/renderAdapter.js";
import { buildVisibleChecklistRows } from "../src/ui/shared/readModelHelpers.js";
import { installDomHarness } from "./helpers/domHarness.js";

type RootLike = {
  querySelector: (selector: string) => Element | null;
};

export const runUiModuleChecklistV2Tests = (): void => {
  const mockRoot: RootLike = {
    querySelector: () => null,
  };

  assert.throws(
    () => renderChecklistV2Module(mockRoot as unknown as Element, initialState()),
    /Checklist mount point is missing/,
    "checklist v2 renderer validates mount point contract",
  );

  const base = initialState();
  const visibleRows = buildVisibleChecklistRows(base, { catalog: unlockCatalog });
  assert.equal(
    visibleRows.some((row) => row.id === "unlock_c_on_increment_run_4"),
    false,
    "v2 checklist helper hides blocked rows by default policy",
  );

  const debugRows = buildVisibleChecklistRows(base, {
    catalog: unlockCatalog,
    includeDebugMeta: true,
  });
  assert.equal(Array.isArray(debugRows), true, "v2 checklist helper returns a row array");
  if (debugRows.length > 0) {
    assert.equal(
      typeof debugRows[0]?.analysisStatus === "string" && typeof debugRows[0]?.visibilityReason === "string",
      true,
      "v2 checklist helper debug rows include analysis metadata",
    );
  }

  const harness = installDomHarness("http://localhost:4173/index.html");
  try {
    const state = initialState();
    const mainMenuState = {
      ...state,
      ui: {
        ...state.ui,
        buttonFlags: {
          ...state.ui.buttonFlags,
          "mode.main_menu": true,
          "mode.checklist_content_visible": false,
        },
      },
    };
    renderChecklistV2Module(harness.root, mainMenuState);
    const checklistShell = harness.root.querySelector<HTMLElement>(".checklist-shell");
    const checklistMount = harness.root.querySelector<HTMLElement>("[data-unlocks]");
    assert.equal(checklistShell?.hidden, false, "main menu keeps checklist shell container visible");
    assert.equal(checklistMount?.getAttribute("aria-hidden"), "true", "main menu checklist mount is aria-hidden");
    assert.equal((checklistMount?.innerHTML ?? "").trim(), "", "main menu checklist content is cleared");
  } finally {
    harness.teardown();
  }
};


