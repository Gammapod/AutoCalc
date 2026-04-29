import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
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
  || value === "imaginary"
  || value === "unlock"
  || value === "analysis"
  || value === "history"
  || value === "step"
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

  const base = initialState();
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
  assert.deepEqual(
    totalHintRows.map((row) => [row.category, row.label]),
    [
      ["operator", "OP"],
      ["non_operator", "KEY"],
      ["calculator", "CALC"],
      ["lambda_point", "IMAG"],
    ],
    "total hint view-model owns stable UI categories and labels",
  );
  assert.equal(
    totalHintRows.every((row) => row.value === "n/a" || /^\d+\/\d+ [a-z_]+$/u.test(row.value)),
    true,
    "total hint view-model formats progress strings for display",
  );
  const lambdaRow = totalHintRows.find((row) => row.category === "lambda_point");
  assert.equal(lambdaRow?.uxRole, "imaginary", "lambda-point hint category maps to imaginary role");
};
