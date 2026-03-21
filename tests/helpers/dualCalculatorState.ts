import { commitLegacyProjection, projectCalculatorToLegacy } from "../../src/domain/multiCalculator.js";
import type { CalculatorId, GameState } from "../../src/domain/types.js";

export const withCalculatorProjection = (
  state: GameState,
  calculatorId: CalculatorId,
  mutate: (projected: GameState) => GameState,
): GameState => {
  const projected = projectCalculatorToLegacy(state, calculatorId);
  const nextProjected = mutate(projected);
  return commitLegacyProjection(state, nextProjected, calculatorId);
};


