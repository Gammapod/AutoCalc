import type { NumberDomainReport } from "../domain/analysis.js";

export const formatNumberDomainReport = (report: NumberDomainReport): string => {
  const lines = [
    "Number Domain Analysis",
    `Generated: ${report.generatedAtIso}`,
    "",
    `(\u2115) Natural Numbers: ${report.naturalNumbers ? "true" : "false"}`,
    `(\u2124) Integers: ${report.integersNonNatural ? "true" : "false"}`,
    "",
    "Reasoning:",
    ...report.reasoning.map((line) => `- ${line}`),
  ];

  return lines.join("\n");
};
