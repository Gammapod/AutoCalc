import type { NumberDomainReport } from "../domain/analysis.js";

export const formatNumberDomainReport = (report: NumberDomainReport): string => {
  const counts = report.unlockSpecAnalysis.reduce(
    (acc, row) => {
      acc[row.status] += 1;
      return acc;
    },
    { satisfied: 0, possible: 0, blocked: 0, unknown: 0, todo: 0 },
  );

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
    ...report.unlockSpecAnalysis.map(
      (row) =>
        `- ${row.unlockId} [${row.predicateType}] => ${row.status} (predicateNow=${row.predicateSatisfiedNow ? "true" : "false"}) :: ${row.detail}`,
    ),
  ];

  return lines.join("\n");
};
