import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { initialState } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import { buildOperationSlotDisplay } from "../src/ui/shared/readModel.js";
import type { GameState } from "../src/domain/types.js";

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue(rv(num, den));

export const runOperationSlotDisplayTests = (): void => {
  const base = initialState();

  assert.equal(buildOperationSlotDisplay(base), "(no operation slots)", "empty state shows no-slot fallback");

  const draftingOperatorOnly: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 1,
    },
    calculator: {
      ...base.calculator,
      draftingSlot: { operator: op("+"), operandInput: "", isNegative: false },
    },
  };
  assert.equal(buildOperationSlotDisplay(draftingOperatorOnly), "_ [ + _ ]", "drafting slot shows operator before operand");

  const draftingOperatorOnlyNegative: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 1,
    },
    calculator: {
      ...base.calculator,
      draftingSlot: { operator: op("+"), operandInput: "", isNegative: true },
    },
  };
  assert.equal(
    buildOperationSlotDisplay(draftingOperatorOnlyNegative),
    "_ [ + -_ ]",
    "drafting slot shows sign marker when negated before operand entry",
  );

  const draftingWithOperand: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 1,
    },
    calculator: {
      ...base.calculator,
      draftingSlot: { operator: op("+"), operandInput: "1", isNegative: false },
    },
  };
  assert.equal(buildOperationSlotDisplay(draftingWithOperand), "_ [ + 1 ]", "drafting slot shows operand when provided");

  const draftingMultiplyOperatorOnly: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 1,
    },
    calculator: {
      ...base.calculator,
      draftingSlot: { operator: op("*"), operandInput: "", isNegative: false },
    },
  };
  assert.equal(
    buildOperationSlotDisplay(draftingMultiplyOperatorOnly),
    "_ [ \u00D7 _ ]",
    "drafting multiply slot renders operator as \u00D7",
  );

  const draftingWithNegativeOperand: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 1,
    },
    calculator: {
      ...base.calculator,
      draftingSlot: { operator: op("+"), operandInput: "1", isNegative: true },
    },
  };
  assert.equal(
    buildOperationSlotDisplay(draftingWithNegativeOperand),
    "_ [ + -1 ]",
    "drafting slot prefixes operand with minus when negated",
  );

  const committedWithExtraCapacity: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 2,
    },
    calculator: {
      ...base.calculator,
      operationSlots: [{ operator: op("+"), operand: 1n }],
    },
  };
  assert.equal(
    buildOperationSlotDisplay(committedWithExtraCapacity),
    "_ [ + 1 ] [ _ _ ]",
    "committed slot is followed by placeholder for remaining capacity",
  );

  const committedAndDraftingWithExtraCapacity: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 3,
    },
    calculator: {
      ...base.calculator,
      operationSlots: [{ operator: op("+"), operand: 1n }],
      draftingSlot: { operator: op("-"), operandInput: "", isNegative: false },
    },
  };
  assert.equal(
    buildOperationSlotDisplay(committedAndDraftingWithExtraCapacity),
    "_ [ + 1 ] [ - _ ] [ _ _ ]",
    "committed and drafting slots are padded with placeholders up to capacity",
  );

  const zeroCapacity: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 0,
    },
  };
  assert.equal(buildOperationSlotDisplay(zeroCapacity), "(no operation slots)", "zero capacity uses no-slot fallback");

  const overflowState: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 1,
    },
    calculator: {
      ...base.calculator,
      operationSlots: [{ operator: op("+"), operand: 1n }],
      draftingSlot: { operator: op("-"), operandInput: "", isNegative: false },
    },
  };
  assert.equal(buildOperationSlotDisplay(overflowState), "_ [ + 1 ]", "overflow state truncates display to max slot capacity");

  const projectedCapacity = reducer(
    reducer(
      reducer(
        reducer(base, { type: "ALLOCATOR_ADD_MAX_POINTS", amount: 3 }),
        { type: "ALLOCATOR_ADJUST", field: "slots", delta: 1 },
      ),
      { type: "ALLOCATOR_ADJUST", field: "slots", delta: 1 },
    ),
    { type: "ALLOCATOR_ADJUST", field: "slots", delta: 1 },
  );
  const projectedDisplay: GameState = {
    ...projectedCapacity,
    calculator: {
      ...projectedCapacity.calculator,
      operationSlots: [{ operator: op("+"), operand: 1n }],
    },
  };
  assert.equal(
    buildOperationSlotDisplay(projectedDisplay),
    "_ [ + 1 ] [ _ _ ] [ _ _ ]",
    "display capacity follows allocator-projected max slot count",
  );

  const committedMultiply: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 1,
    },
    calculator: {
      ...base.calculator,
      operationSlots: [{ operator: op("*"), operand: 2n }],
    },
  };
  assert.equal(buildOperationSlotDisplay(committedMultiply), "_ [ \u00D7 2 ]", "committed multiply slot renders operator as \u00D7");

  const committedEuclidean: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 1,
    },
    calculator: {
      ...base.calculator,
      operationSlots: [{ operator: op("#"), operand: 3n }],
    },
  };
  assert.equal(buildOperationSlotDisplay(committedEuclidean), "_ [ # 3 ]", "committed euclidean slot renders operator as #");

  const committedModulo: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 1,
    },
    calculator: {
      ...base.calculator,
      operationSlots: [{ operator: op("\u27E1"), operand: 3n }],
    },
  };
  assert.equal(buildOperationSlotDisplay(committedModulo), "_ [ \u2662 3 ]", "committed modulo slot renders operator as \u2662");

  const steppedDisplay: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 2,
    },
    ui: {
      ...base.ui,
      keyLayout: [{ kind: "key", key: k("\u25BB") }],
      buttonFlags: {
        ...base.ui.buttonFlags,
        "settings.step_expansion": true,
      },
    },
    calculator: {
      ...base.calculator,
      total: r(1n),
      operationSlots: [{ operator: op("+"), operand: 2n }, { operator: op("*"), operand: 3n }],
      stepProgress: {
        active: true,
        seedTotal: r(1n),
        currentTotal: r(3n),
        nextSlotIndex: 1,
        executedSlotResults: [r(3n)],
      },
    },
  };
  assert.equal(
    buildOperationSlotDisplay(steppedDisplay),
    "1 [ -> 3 ] [ 3 \u00D7 3 ]",
    "active step session replaces executed slot and expands current step target",
  );

  const expansionFallbackNoTarget: GameState = {
    ...steppedDisplay,
    calculator: {
      ...steppedDisplay.calculator,
      stepProgress: {
        ...steppedDisplay.calculator.stepProgress,
        nextSlotIndex: 99,
      },
    },
  };
  assert.equal(
    buildOperationSlotDisplay(expansionFallbackNoTarget),
    "1 [ -> 3 ] [ \u00D7 3 ]",
    "expansion toggle is a no-op when no valid step target exists",
  );
};




