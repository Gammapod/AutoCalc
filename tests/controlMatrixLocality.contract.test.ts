import assert from "node:assert/strict";
import { reducer } from "../src/domain/reducer.js";
import { initialState } from "../src/domain/state.js";
import { materializeCalculatorG, projectCalculatorToLegacy } from "../src/domain/multiCalculator.js";
import { projectControlFromState } from "../src/domain/controlProjection.js";
import type { CalculatorId, GameState } from "../src/domain/types.js";

type EnvelopeSnapshot = {
  keypadColumns: number;
  keypadRows: number;
  maxSlots: number;
  maxTotalDigits: number;
  autoEqualsRateMultiplier: number;
};

const captureEnvelope = (state: GameState, calculatorId: CalculatorId): EnvelopeSnapshot => {
  const projection = projectControlFromState(state, calculatorId);
  return {
    keypadColumns: projection.keypadColumns,
    keypadRows: projection.keypadRows,
    maxSlots: projection.maxSlots,
    maxTotalDigits: projection.maxTotalDigits,
    autoEqualsRateMultiplier: projection.autoEqualsRateMultiplier,
  };
};

export const runControlMatrixLocalityContractTests = (): void => {
  const dual = materializeCalculatorG(initialState());
  const baselineF = captureEnvelope(dual, "f");
  const baselineG = captureEnvelope(dual, "g");
  const baselineFUi = projectCalculatorToLegacy(dual, "f").ui;
  const baselineGUi = projectCalculatorToLegacy(dual, "g").ui;

  const targetedLayoutG = reducer(dual, {
    type: "SET_KEYPAD_DIMENSIONS",
    calculatorId: "g",
    columns: 3,
    rows: 2,
  });
  assert.deepEqual(
    captureEnvelope(targetedLayoutG, "f"),
    baselineF,
    "targeted g keypad mutation preserves f control envelope locality",
  );
  const targetedLayoutGFUi = projectCalculatorToLegacy(targetedLayoutG, "f").ui;
  const targetedLayoutGGUi = projectCalculatorToLegacy(targetedLayoutG, "g").ui;
  assert.equal(
    targetedLayoutGFUi.keypadColumns,
    baselineFUi.keypadColumns,
    "targeted g keypad mutation keeps f keypad-column semantics unchanged",
  );
  assert.equal(
    targetedLayoutGFUi.keypadRows,
    baselineFUi.keypadRows,
    "targeted g keypad mutation keeps f keypad-row semantics unchanged",
  );
  assert.equal(
    targetedLayoutGGUi.keypadColumns,
    3,
    "targeted g keypad mutation updates g-local keypad-column semantics",
  );
  assert.equal(
    targetedLayoutGGUi.keypadRows,
    2,
    "targeted g keypad mutation updates g-local keypad-row semantics",
  );

  const gProjection = projectControlFromState(dual, "g");
  const targetedControlG = reducer(dual, {
    type: "LAMBDA_SET_CONTROL",
    calculatorId: "g",
    value: {
      ...gProjection.control,
      gamma: gProjection.control.gamma + 1,
      maxPoints: gProjection.control.maxPoints + 2,
    },
  });
  assert.deepEqual(
    captureEnvelope(targetedControlG, "f"),
    baselineF,
    "targeted g control mutation keeps f envelope and cadence semantics unchanged",
  );
  assert.notDeepEqual(
    captureEnvelope(targetedControlG, "g"),
    baselineG,
    "targeted g control mutation updates g-local envelope/cadence semantics",
  );

  const targetedAllocatorG = reducer(dual, {
    type: "ALLOCATOR_ADJUST",
    calculatorId: "g",
    field: "slots",
    delta: 1,
  });
  assert.equal(
    captureEnvelope(targetedAllocatorG, "f").maxSlots,
    baselineF.maxSlots,
    "targeted g allocator mutation does not leak slot-capacity changes into f",
  );
};
