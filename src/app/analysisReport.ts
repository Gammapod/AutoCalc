import { analyzeUnlockSpecRows, type NumberDomainReport, type UnlockSpecAnalysisRow } from "../domain/analysis.js";
import type { GameState } from "../domain/types.js";

type UnlockSpecStatusCounts = {
  satisfied: number;
  possible: number;
  blocked: number;
  unknown: number;
  todo: number;
};

const createStatusCounts = (): UnlockSpecStatusCounts => ({
  satisfied: 0,
  possible: 0,
  blocked: 0,
  unknown: 0,
  todo: 0,
});

const countByStatus = (rows: UnlockSpecAnalysisRow[]): UnlockSpecStatusCounts =>
  rows.reduce((acc, row) => {
    acc[row.status] += 1;
    return acc;
  }, createStatusCounts());

const countVisibleByChecklistPolicy = (rows: UnlockSpecAnalysisRow[]): number =>
  rows.reduce((count, row) => {
    if (row.status === "blocked") {
      return count;
    }
    return count + 1;
  }, 0);

export const formatNumberDomainReport = (report: NumberDomainReport, state?: GameState): string => {
  const counts = countByStatus(report.unlockSpecAnalysis);
  const visibleInActiveScope = countVisibleByChecklistPolicy(report.unlockSpecAnalysis);

  const lines = [
    "Number Domain Analysis",
    `Generated: ${report.generatedAtIso}`,
    "",
    `(\u2115) Natural Numbers: ${report.naturalNumbers ? "true" : "false"}`,
    `(\u2124) Integers: ${report.integersNonNatural ? "true" : "false"}`,
    "",
    "Reasoning:",
    ...report.reasoning.map((line) => `- ${line}`),
    "",
    "Unlock Spec Analysis:",
    `- satisfied=${counts.satisfied} possible=${counts.possible} blocked=${counts.blocked} unknown=${counts.unknown} todo=${counts.todo}`,
    `- checklistVisibleByPolicy=${visibleInActiveScope}/${report.unlockSpecAnalysis.length}`,
    ...report.unlockSpecAnalysis.map(
      (row) =>
        `- ${row.unlockId} [${row.predicateType}] => ${row.status} (predicateNow=${row.predicateSatisfiedNow ? "true" : "false"}) :: ${row.detail}`,
    ),
  ];

  if (state) {
    const keypadOnlyRows = analyzeUnlockSpecRows(state, { capabilityScope: "present_on_keypad" });
    const allUnlockedRows = analyzeUnlockSpecRows(state, { capabilityScope: "all_unlocked" });
    const keypadOnlyCounts = countByStatus(keypadOnlyRows);
    const allUnlockedCounts = countByStatus(allUnlockedRows);
    const keypadOnlyVisible = countVisibleByChecklistPolicy(keypadOnlyRows);
    const allUnlockedVisible = countVisibleByChecklistPolicy(allUnlockedRows);

    lines.push(
      "",
      "Checklist Visibility Scope Compare:",
      `- present_on_keypad visible=${keypadOnlyVisible}/${keypadOnlyRows.length} blocked=${keypadOnlyCounts.blocked}`,
      `- all_unlocked visible=${allUnlockedVisible}/${allUnlockedRows.length} blocked=${allUnlockedCounts.blocked}`,
      `- delta_visible=${(allUnlockedVisible - keypadOnlyVisible).toString()}`,
    );
  }

  return lines.join("\n");
};
