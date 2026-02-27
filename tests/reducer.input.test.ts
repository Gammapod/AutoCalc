import assert from "node:assert/strict";
import { applyKeyAction } from "../src/domain/reducer.input.js";
import { initialState } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import type { GameState } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });

export const runReducerInputTests = (): void => {
  const base = initialState();

  const afterDigit = applyKeyAction(base, "1");
  assert.deepEqual(afterDigit.calculator.total, r(1n), "digit key updates total");

  const unlocked = reducer(initialState(), { type: "UNLOCK_ALL" });
  const afterPlus = applyKeyAction(unlocked, "+");
  assert.equal(afterPlus.calculator.draftingSlot?.operator, "+", "operator key starts drafting when unlocked");

  const afterOperand = applyKeyAction(afterPlus, "1");
  assert.equal(afterOperand.calculator.draftingSlot?.operandInput, "1", "digit key fills drafting operand");

  const afterEquals = applyKeyAction(afterOperand, "=");
  assert.deepEqual(afterEquals.calculator.total, r(1n), "equals executes drafted operation sequence");
  assert.ok(afterEquals.calculator.roll.length > 0, "equals appends roll entries");

  const ceSource: GameState = {
    ...unlocked,
    calculator: {
      ...unlocked.calculator,
      roll: [r(1n), r(2n)],
      operationSlots: [{ operator: "+", operand: 1n }],
      draftingSlot: { operator: "-", operandInput: "1", isNegative: false },
    },
  };
  const afterCe = applyKeyAction(ceSource, "CE");
  assert.deepEqual(afterCe.calculator.roll, [], "CE clears roll");
  assert.deepEqual(afterCe.calculator.operationSlots, [], "CE clears operation slots");
  assert.equal(afterCe.calculator.draftingSlot, null, "CE clears drafting slot");

  const negSource: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      utilities: {
        ...base.unlocks.utilities,
        NEG: true,
      },
    },
  };
  const afterNeg = applyKeyAction(negSource, "NEG");
  assert.equal(afterNeg.calculator.pendingNegativeTotal, true, "NEG toggles pending sign on zero total");
};
