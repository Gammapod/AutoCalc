import { commitLegacyProjection, projectCalculatorToLegacy } from "../../src/domain/multiCalculator.js";
import type { CalculatorId, GameState } from "../../src/domain/types.js";

export const withCalculatorProjection = (
  state: GameState,
  calculatorId: CalculatorId,
  mutate: (projected: GameState) => GameState,
): GameState => {
  const projected = projectCalculatorToLegacy(state, calculatorId);
  const nextProjected = mutate(projected);
  const preserveRootCaps = {
    maxSlots: nextProjected.unlocks.maxSlots === projected.unlocks.maxSlots
      ? state.unlocks.maxSlots
      : nextProjected.unlocks.maxSlots,
    maxTotalDigits: nextProjected.unlocks.maxTotalDigits === projected.unlocks.maxTotalDigits
      ? state.unlocks.maxTotalDigits
      : nextProjected.unlocks.maxTotalDigits,
  };
  return commitLegacyProjection(state, {
    ...nextProjected,
    unlocks: {
      ...nextProjected.unlocks,
      ...preserveRootCaps,
    },
  }, calculatorId);
};


