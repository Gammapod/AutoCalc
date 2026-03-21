import { calculatorValueEquals, MAX_ROLL_ENTRIES } from "./rollEntries.js";
import type { CalculatorValue, RollEntry } from "./types.js";

export const shouldRejectRollInverseExecution = (rollEntries: RollEntry[]): boolean => {
  if (rollEntries.some((entry) => Boolean(entry.error))) {
    return true;
  }
  if (rollEntries.length >= MAX_ROLL_ENTRIES || rollEntries.length <= 1) {
    return true;
  }
  const seed = rollEntries[0];
  const current = rollEntries[rollEntries.length - 1];
  if (!seed || !current) {
    return true;
  }
  return calculatorValueEquals(current.y, seed.y);
};

export const resolveRollInverseNextTotal = (rollEntries: RollEntry[]): CalculatorValue | null => {
  if (shouldRejectRollInverseExecution(rollEntries)) {
    return null;
  }
  const current = rollEntries[rollEntries.length - 1];
  if (!current) {
    return null;
  }
  for (let index = 1; index < rollEntries.length; index += 1) {
    if (calculatorValueEquals(rollEntries[index].y, current.y)) {
      return rollEntries[index - 1]?.y ?? null;
    }
  }
  return null;
};
