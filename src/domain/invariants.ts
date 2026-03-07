import type { GameState } from "./types.js";

export const collectInvariantViolations = (state: GameState): string[] => {
  const violations: string[] = [];

  if (state.calculator.total.kind === "rational" && state.calculator.total.value.den === 0n) {
    violations.push("total denominator must not be zero");
  }

  if (state.completedUnlockIds.length !== new Set(state.completedUnlockIds).size) {
    violations.push("completedUnlockIds must be unique");
  }

  if (state.calculator.draftingSlot) {
    const { operandInput } = state.calculator.draftingSlot;
    if (!/^\d*$/.test(operandInput)) {
      violations.push("draftingSlot operandInput must be numeric");
    }
  }

  return violations;
};

export const assertInvariants = (state: GameState): void => {
  const violations = collectInvariantViolations(state);
  if (violations.length > 0) {
    throw new Error(`Invariant violations: ${violations.join("; ")}`);
  }
};
