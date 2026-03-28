import assert from "node:assert/strict";
import { reducer } from "../src/domain/reducer.js";
import { initialState } from "../src/domain/state.js";
import { materializeCalculatorG, projectCalculatorToLegacy } from "../src/domain/multiCalculator.js";
import type { CalculatorId, GameState } from "../src/domain/types.js";

type RuntimeSnapshot = Pick<
  GameState["calculator"],
  "draftingSlot" | "operationSlots" | "pendingNegativeTotal" | "rollEntries" | "stepProgress" | "total"
>;

const captureCalculatorRuntime = (state: GameState, calculatorId: CalculatorId): RuntimeSnapshot =>
  projectCalculatorToLegacy(state, calculatorId).calculator;

export const runBoundaryDirectMutationContractTests = (): void => {
  const dual = materializeCalculatorG(initialState());

  const baselineFRuntime = captureCalculatorRuntime(dual, "f");
  const baselineGRuntime = captureCalculatorRuntime(dual, "g");

  const uiRouted = reducer(dual, { type: "SET_ACTIVE_CALCULATOR", calculatorId: "g" });
  assert.deepEqual(
    captureCalculatorRuntime(uiRouted, "f"),
    baselineFRuntime,
    "ui/session routing does not directly mutate f calculator runtime state",
  );
  assert.deepEqual(
    captureCalculatorRuntime(uiRouted, "g"),
    baselineGRuntime,
    "ui/session routing does not directly mutate g calculator runtime state",
  );

  const progressionRouted = reducer(dual, { type: "ALLOCATOR_RETURN_PRESSED", calculatorId: "g" });
  assert.deepEqual(
    captureCalculatorRuntime(progressionRouted, "f"),
    baselineFRuntime,
    "progression-scoped allocator action does not bypass domain action flow to mutate f runtime state",
  );
  assert.deepEqual(
    captureCalculatorRuntime(progressionRouted, "g"),
    baselineGRuntime,
    "progression-scoped allocator action does not bypass domain action flow to mutate g runtime state",
  );
};
