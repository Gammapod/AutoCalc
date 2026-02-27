import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { buildOperationSlotDisplay } from "../src/ui/render.js";
import type { GameState } from "../src/domain/types.js";

export const runOperationSlotDisplayTests = (): void => {
  const base = initialState();

  assert.equal(buildOperationSlotDisplay(base), "[ _ _ ]", "empty state shows one placeholder slot");

  const draftingOperatorOnly: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      draftingSlot: { operator: "+", operandInput: "", isNegative: false },
    },
  };
  assert.equal(buildOperationSlotDisplay(draftingOperatorOnly), "[ + _ ]", "drafting slot shows operator before operand");

  const draftingOperatorOnlyNegative: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      draftingSlot: { operator: "+", operandInput: "", isNegative: true },
    },
  };
  assert.equal(
    buildOperationSlotDisplay(draftingOperatorOnlyNegative),
    "[ + -_ ]",
    "drafting slot shows sign marker when negated before operand entry",
  );

  const draftingWithOperand: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      draftingSlot: { operator: "+", operandInput: "1", isNegative: false },
    },
  };
  assert.equal(buildOperationSlotDisplay(draftingWithOperand), "[ + 1 ]", "drafting slot shows operand when provided");

  const draftingMultiplyOperatorOnly: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      draftingSlot: { operator: "*", operandInput: "", isNegative: false },
    },
  };
  assert.equal(
    buildOperationSlotDisplay(draftingMultiplyOperatorOnly),
    "[ × _ ]",
    "drafting multiply slot renders operator as ×",
  );

  const draftingWithNegativeOperand: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      draftingSlot: { operator: "+", operandInput: "1", isNegative: true },
    },
  };
  assert.equal(
    buildOperationSlotDisplay(draftingWithNegativeOperand),
    "[ + -1 ]",
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
      operationSlots: [{ operator: "+", operand: 1n }],
    },
  };
  assert.equal(
    buildOperationSlotDisplay(committedWithExtraCapacity),
    "[ + 1 ] -> [ _ _ ]",
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
      operationSlots: [{ operator: "+", operand: 1n }],
      draftingSlot: { operator: "-", operandInput: "", isNegative: false },
    },
  };
  assert.equal(
    buildOperationSlotDisplay(committedAndDraftingWithExtraCapacity),
    "[ + 1 ] -> [ - _ ] -> [ _ _ ]",
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
      operationSlots: [{ operator: "+", operand: 1n }],
      draftingSlot: { operator: "-", operandInput: "", isNegative: false },
    },
  };
  assert.equal(buildOperationSlotDisplay(overflowState), "[ + 1 ]", "overflow state truncates display to max slot capacity");

  const committedMultiply: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      operationSlots: [{ operator: "*", operand: 2n }],
    },
  };
  assert.equal(buildOperationSlotDisplay(committedMultiply), "[ × 2 ]", "committed multiply slot renders operator as ×");

  const committedEuclidean: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      operationSlots: [{ operator: "#", operand: 3n }],
    },
  };
  assert.equal(buildOperationSlotDisplay(committedEuclidean), "[ # 3 ]", "committed euclidean slot renders operator as #");
};
