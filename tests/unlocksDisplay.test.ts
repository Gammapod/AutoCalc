import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { initialState } from "../src/domain/state.js";
import { buildUnlockCriteria } from "../src/domain/unlockEngine.js";
import type { GameState, UnlockDefinition } from "../src/domain/types.js";
import { buildUnlockRows, buildVisibleChecklistRows } from "../src/ui/shared/readModel.js";

export const runUnlocksDisplayTests = (): void => {
  const base: GameState = {
    ...initialState(),
    completedUnlockIds: ["unlock_checklist_on_first_c_press"],
  };
  const rows = buildVisibleChecklistRows(base, { catalog: unlockCatalog, visibilityPolicy: { hideBlocked: false } });
  assert.equal(rows.length, unlockCatalog.length, "all unlock rows are rendered");
  assert.equal(rows.some((row) => row.id === "unlock_4_on_linear_growth_run_7"), true, "linear growth row is present");

  const criteria = buildUnlockCriteria(unlockCatalog[0]!.predicate, base);
  assert.equal(criteria.length, 1, "growth-order predicate renders one criterion row");

  const completedState: GameState = {
    ...base,
    completedUnlockIds: ["unlock_4_on_linear_growth_run_7"],
  };
  const completedRows = buildUnlockRows(completedState, unlockCatalog);
  assert.equal(completedRows[0]?.state, "completed", "completed unlock is marked completed");

  const visibleRows = buildVisibleChecklistRows(base, { catalog: unlockCatalog });
  assert.equal(Array.isArray(visibleRows), true, "checklist visibility pipeline remains functional");

  const fixtureCatalog: UnlockDefinition[] = [
    {
      id: "u_total_eq",
      description: "total eq",
      predicate: { type: "total_equals", value: 11n },
      effect: { type: "unlock_digit", key: valueExpr("4") },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "Idigits",
    },
  ];
  const debugRows = buildVisibleChecklistRows(base, {
    catalog: fixtureCatalog,
    visibilityPolicy: { hideBlocked: false },
    includeDebugMeta: true,
  });
  assert.equal(typeof debugRows[0]?.analysisStatus === "string", true, "debug rows include analysis status metadata");
};
