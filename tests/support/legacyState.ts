import { initialState } from "../../src/domain/state.js";
import type { GameState } from "../../src/domain/types.js";

export const legacyInitialState = (): GameState => {
  const base = initialState();
  return {
    ...base,
    calculators: undefined,
    calculatorOrder: undefined,
    activeCalculatorId: undefined,
    perCalculatorCompletedUnlockIds: undefined,
    sessionControlProfiles: undefined,
  };
};

