import assert from "node:assert/strict";
import { formatNumberDomainReport } from "../src/app/analysisReport.js";
import { analyzeNumberDomains } from "../src/domain/analysis.js";
import { initialState } from "../src/domain/state.js";

export const runAnalysisReportTests = (): void => {
  const state = initialState();
  const report = analyzeNumberDomains(state, new Date("2026-03-01T00:00:00.000Z"));

  const withoutState = formatNumberDomainReport(report);
  assert.equal(
    withoutState.includes("Visibility Scope Compare:"),
    false,
    "formatNumberDomainReport omits scope comparison when state is not provided",
  );
  assert.equal(
    withoutState.includes("visibleByPolicy="),
    true,
    "formatNumberDomainReport includes policy visibility count",
  );

  const withState = formatNumberDomainReport(report, state);
  assert.equal(
    withState.includes("Visibility Scope Compare:"),
    true,
    "formatNumberDomainReport includes scope comparison when state is provided",
  );
  assert.equal(
    withState.includes("present_on_keypad visible=") && withState.includes("all_unlocked visible="),
    true,
    "formatNumberDomainReport scope comparison prints both scope summaries",
  );
};

