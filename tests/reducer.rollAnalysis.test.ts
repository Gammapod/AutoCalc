import assert from "node:assert/strict";
import { applyKeyAction } from "../src/domain/reducer.input.js";
import { initialState } from "../src/domain/state.js";
import { KEY_ID, ROLL_NUMBER_SYMBOL } from "../src/domain/keyPresentation.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import type { GameState } from "../src/domain/types.js";
import { executionUnlockPatch, op } from "./support/keyCompat.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });

const runEquals = (state: GameState, count: number): GameState => {
  let next = state;
  for (let step = 0; step < count; step += 1) {
    next = applyKeyAction(next, KEY_ID.exec_equals);
  }
  return next;
};

const buildRollAnalysisState = (operationSlots: GameState["calculator"]["operationSlots"]): GameState => {
  const base = initialState();
  const baseF = base.calculators?.f;
  if (!baseF) {
    throw new Error("Expected initial f calculator fixture");
  }
  const calculator = {
    ...base.calculator,
    total: r(3n),
    operationSlots,
    rollEntries: [],
    rollAnalysis: { stopReason: "none", cycle: null },
    draftingSlot: null,
  } satisfies GameState["calculator"];
  const ui = {
    ...base.ui,
    keyLayout: [{ kind: "key" as const, key: KEY_ID.exec_equals }],
    keypadColumns: 1,
    keypadRows: 1,
  } satisfies GameState["ui"];
  return {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 2,
      maxTotalDigits: 2,
      execution: {
        ...base.unlocks.execution,
        ...executionUnlockPatch([["exec_equals", true]]),
      },
      slotOperators: {
        ...base.unlocks.slotOperators,
        [op("op_mul")]: true,
        [op("op_mod")]: true,
      },
    },
    calculators: {
      ...base.calculators,
      f: {
        ...baseF,
        calculator,
        ui,
      },
    },
    ui,
    calculator,
  };
};

export const runReducerRollAnalysisTests = (): void => {
  const staticCycle = runEquals(
    buildRollAnalysisState([{ operator: op("op_mul"), operand: -1n }]),
    2,
  );
  assert.equal(staticCycle.calculator.rollAnalysis.stopReason, "cycle", "static repeated values still detect cycles");
  assert.deepEqual(
    staticCycle.calculator.rollAnalysis.cycle,
    { i: 0, j: 2, transientLength: 0, periodLength: 2 },
    "static cycle metadata remains canonical",
  );

  const rollNumberCycleSuppressed = runEquals(
    buildRollAnalysisState([
      { operator: op("op_mul"), operand: { type: "symbolic", text: ROLL_NUMBER_SYMBOL } },
      { operator: op("op_mod"), operand: 7n },
    ]),
    9,
  );
  assert.equal(
    rollNumberCycleSuppressed.calculator.rollAnalysis.stopReason,
    "none",
    "roll-number operand disables cycle analysis instead of claiming a repeat-value cycle",
  );
  assert.equal(
    rollNumberCycleSuppressed.calculator.rollEntries.some((entry) => entry.y.kind === "rational" && entry.y.value.num === 0n),
    true,
    "roll-number regression reaches the repeated zero suffix without cycle metadata",
  );
};
