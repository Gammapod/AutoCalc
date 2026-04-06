import assert from "node:assert/strict";
import { legacyInitialState } from "./support/legacyState.js";
import {
  buildFactorizationPanelViewModel,
  buildFeedTableViewModel,
  buildHelpPanelViewModel,
  buildTotalHintRowsViewModel,
  resolveUxRoleAssignment,
  type UxRole,
} from "../src/ui/shared/readModel.js";

const isUxRole = (value: string): value is UxRole =>
  value === "error"
  || value === "lambda"
  || value === "unlock"
  || value === "analysis"
  || value === "help"
  || value === "base_setting"
  || value === "visualizer_setting"
  || value === "wrap_setting"
  || value === "default";

export const runUiUxRoleSystemTests = (): void => {
  assert.throws(
    () => resolveUxRoleAssignment({ uxRole: "default", uxRoleOverride: "analysis" }),
    /uxRoleOverride requires overrideReason/,
    "override assignments require an explicit reason",
  );

  const base = legacyInitialState();
  const helpVm = buildHelpPanelViewModel(base);
  assert.equal(helpVm.rows.length > 0, true, "help view-model provides rows");
  helpVm.rows.forEach((row) => {
    assert.equal(isUxRole(row.uxRole), true, "help row has canonical ux role");
    assert.equal(typeof row.uxState, "string", "help row has ux state");
  });

  const feedVm = buildFeedTableViewModel(base.calculator.rollEntries, base.unlocks.maxTotalDigits);
  feedVm.rows.forEach((row) => {
    assert.equal(isUxRole(row.uxRole), true, "feed row has canonical ux role");
    assert.equal(typeof row.uxState, "string", "feed row has ux state");
  });

  const factorizationVm = buildFactorizationPanelViewModel(base);
  factorizationVm.rows.forEach((row) => {
    assert.equal(isUxRole(row.uxRole), true, "factorization row has canonical ux role");
    assert.equal(typeof row.uxState, "string", "factorization row has ux state");
  });

  const totalHintRows = buildTotalHintRowsViewModel(base);
  assert.equal(totalHintRows.length >= 4, true, "total hint view-model exposes role-tagged categories");
  const lambdaRow = totalHintRows.find((row) => row.category === "lambda_point");
  assert.equal(lambdaRow?.uxRole, "lambda", "lambda hint category maps to lambda role");
};

