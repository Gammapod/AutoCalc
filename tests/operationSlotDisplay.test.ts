import "./support/keyCompat.runtime.js";
import "./support/contentProviderSetup.js";
import assert from "node:assert/strict";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { initialState } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import { buildOperationSlotDisplay } from "../src/ui/shared/readModel.js";
import { defaultContentProvider } from "../src/content/defaultContentProvider.js";
import { setAppServices } from "../src/contracts/appServices.js";
import { setContentProvider } from "../src/contracts/contentRegistry.js";
import type { GameState } from "../src/domain/types.js";

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue(rv(num, den));

export const runOperationSlotDisplayTests = (): void => {
  setAppServices({ contentProvider: defaultContentProvider });
  setContentProvider(defaultContentProvider);
  const base = initialState();

  assert.equal(buildOperationSlotDisplay(base), "_ [ _ _ ]", "empty state shows one derived slot from gamma");

  const draftingOperatorOnly: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 1,
    },
    calculator: {
      ...base.calculator,
      draftingSlot: { operator: op("op_add"), operandInput: "", isNegative: false },
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
      draftingSlot: { operator: op("op_add"), operandInput: "", isNegative: true },
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
      draftingSlot: { operator: op("op_add"), operandInput: "1", isNegative: false },
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
      draftingSlot: { operator: op("op_mul"), operandInput: "", isNegative: false },
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
      draftingSlot: { operator: op("op_add"), operandInput: "1", isNegative: true },
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
      operationSlots: [{ operator: op("op_add"), operand: 1n }],
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
      operationSlots: [{ operator: op("op_add"), operand: 1n }],
      draftingSlot: { operator: op("op_sub"), operandInput: "", isNegative: false },
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
      operationSlots: [{ operator: op("op_add"), operand: 1n }],
      draftingSlot: { operator: op("op_sub"), operandInput: "", isNegative: false },
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
      operationSlots: [{ operator: op("op_add"), operand: 1n }],
    },
  };
  assert.equal(
    buildOperationSlotDisplay(projectedDisplay),
    "_ [ + 1 ] [ _ _ ] [ _ _ ] [ _ _ ]",
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
      operationSlots: [{ operator: op("op_mul"), operand: 2n }],
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
      operationSlots: [{ operator: op("op_euclid_div"), operand: 3n }],
    },
  };
  assert.equal(buildOperationSlotDisplay(committedEuclidean), "_ [ \u2AFD 3 ]", "committed euclidean slot renders operator as \u2AFD");

  const committedModulo: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 1,
    },
    calculator: {
      ...base.calculator,
      operationSlots: [{ operator: op("op_mod"), operand: 3n }],
    },
  };
  assert.equal(buildOperationSlotDisplay(committedModulo), "_ [ \u25C7 3 ]", "committed modulo slot renders operator as \u25C7");

  const committedGcd: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 1,
    },
    calculator: {
      ...base.calculator,
      operationSlots: [{ operator: op("op_gcd"), operand: 3n }],
    },
  };
  assert.equal(buildOperationSlotDisplay(committedGcd), "_ [ \u22C0 3 ]", "committed gcd slot renders operator as \u22C0");

  const committedLcm: GameState = {
    ...committedGcd,
    calculator: {
      ...committedGcd.calculator,
      operationSlots: [{ operator: op("op_lcm"), operand: 3n }],
    },
  };
  assert.equal(buildOperationSlotDisplay(committedLcm), "_ [ \u22C1 3 ]", "committed lcm slot renders operator as \u22C1");

  const committedUnaryInc: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 1,
    },
    calculator: {
      ...base.calculator,
      operationSlots: [{ kind: "unary", operator: uop("unary_inc") }],
    },
  };
  assert.equal(buildOperationSlotDisplay(committedUnaryInc), "_ [ ++ ]", "committed unary increment slot renders ++ token");

  const committedUnaryDec: GameState = {
    ...committedUnaryInc,
    calculator: {
      ...committedUnaryInc.calculator,
      operationSlots: [{ kind: "unary", operator: uop("unary_dec") }],
    },
  };
  assert.equal(buildOperationSlotDisplay(committedUnaryDec), "_ [ \u2013 \u2013 ]", "committed unary decrement slot renders en-dash pair token");

  const steppedDisplay: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 2,
    },
    ui: {
      ...base.ui,
      keyLayout: [{ kind: "key", key: k("exec_step_through") }],
      buttonFlags: {
        ...base.ui.buttonFlags,
        "settings.step_expansion": true,
      },
    },
    calculator: {
      ...base.calculator,
      total: r(1n),
      operationSlots: [{ operator: op("op_add"), operand: 2n }, { operator: op("op_mul"), operand: 3n }],
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
    "1 [ -> 3 ] [ + 3 + 3 ]",
    "active step session replaces executed slot and applies bespoke multiply expansion on current step target",
  );

  const steppedAdditionExpansion: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      maxSlots: 1,
    },
    ui: {
      ...base.ui,
      keyLayout: [{ kind: "key", key: k("exec_step_through") }],
      buttonFlags: {
        ...base.ui.buttonFlags,
        "settings.step_expansion": true,
      },
    },
    calculator: {
      ...base.calculator,
      total: r(5n),
      operationSlots: [{ operator: op("op_add"), operand: 3n }],
      stepProgress: {
        active: false,
        seedTotal: null,
        currentTotal: null,
        nextSlotIndex: 0,
        executedSlotResults: [],
      },
    },
  };
  assert.equal(
    buildOperationSlotDisplay(steppedAdditionExpansion),
    "5 [ ++ ++ ++ ]",
    "inactive step target applies bespoke addition expansion",
  );

  const steppedSubtractionExpansion: GameState = {
    ...steppedAdditionExpansion,
    calculator: {
      ...steppedAdditionExpansion.calculator,
      operationSlots: [{ operator: op("op_sub"), operand: 3n }],
    },
  };
  assert.equal(
    buildOperationSlotDisplay(steppedSubtractionExpansion),
    "5 [ -- -- -- ]",
    "inactive step target applies bespoke subtraction expansion using minus operator symbol",
  );

  const steppedDivisionExpansion: GameState = {
    ...steppedAdditionExpansion,
    calculator: {
      ...steppedAdditionExpansion.calculator,
      operationSlots: [{ operator: op("op_div"), operand: 3n }],
    },
  };
  assert.equal(
    buildOperationSlotDisplay(steppedDivisionExpansion),
    "5 [ \u00D7(1/3) ]",
    "inactive step target applies bespoke division expansion",
  );

  const steppedEuclideanExpansion: GameState = {
    ...steppedAdditionExpansion,
    calculator: {
      ...steppedAdditionExpansion.calculator,
      total: r(12n),
      operationSlots: [{ operator: op("op_euclid_div"), operand: 5n }],
    },
  };
  assert.equal(
    buildOperationSlotDisplay(steppedEuclideanExpansion),
    "12 [ q=\u230An \u00F7 5\u230B;r=n\u2013q ]",
    "inactive step target applies bespoke euclidean-division tuple expansion",
  );

  const steppedModuloExpansion: GameState = {
    ...steppedAdditionExpansion,
    calculator: {
      ...steppedAdditionExpansion.calculator,
      total: r(12n),
      operationSlots: [{ operator: op("op_mod"), operand: 5n }],
    },
  };
  assert.equal(
    buildOperationSlotDisplay(steppedModuloExpansion),
    "12 [ n \u00F7 5 \u2013 (n\u2AFD5) ]",
    "inactive step target applies bespoke modulo expansion",
  );

  const steppedRotateLeftExpansion: GameState = {
    ...steppedAdditionExpansion,
    calculator: {
      ...steppedAdditionExpansion.calculator,
      total: r(12n),
      operationSlots: [{ operator: op("op_rotate_left"), operand: 3n }],
    },
  };
  assert.equal(
    buildOperationSlotDisplay(steppedRotateLeftExpansion),
    "12 [ n <<< ]",
    "inactive step target applies bespoke rotate-left expansion with repeated arrows",
  );

  const steppedGcdExpansion: GameState = {
    ...steppedAdditionExpansion,
    calculator: {
      ...steppedAdditionExpansion.calculator,
      total: r(12n),
      operationSlots: [{ operator: op("op_gcd"), operand: 3n }],
    },
  };
  assert.equal(
    buildOperationSlotDisplay(steppedGcdExpansion),
    "12 [ \u220Fp^(e_a \u2567 e_b) ]",
    "inactive step target applies bespoke gcd expansion",
  );

  const steppedLcmExpansion: GameState = {
    ...steppedAdditionExpansion,
    calculator: {
      ...steppedAdditionExpansion.calculator,
      total: r(12n),
      operationSlots: [{ operator: op("op_lcm"), operand: 3n }],
    },
  };
  assert.equal(
    buildOperationSlotDisplay(steppedLcmExpansion),
    "12 [ \u220Fp^(e_a \u2564 e_b) ]",
    "inactive step target applies bespoke lcm expansion",
  );

  const steppedMaxExpansion: GameState = {
    ...steppedAdditionExpansion,
    calculator: {
      ...steppedAdditionExpansion.calculator,
      total: r(12n),
      operationSlots: [{ operator: op("op_max"), operand: 3n }],
    },
  };
  assert.equal(
    buildOperationSlotDisplay(steppedMaxExpansion),
    "12 [ < 3 \u00D7 3 + \u00AC(12 \u2264 3 \u00D7 12) ]",
    "inactive step target applies bespoke max expansion with concrete operands",
  );

  const steppedMinExpansion: GameState = {
    ...steppedAdditionExpansion,
    calculator: {
      ...steppedAdditionExpansion.calculator,
      total: r(12n),
      operationSlots: [{ operator: op("op_min"), operand: 3n }],
    },
  };
  assert.equal(
    buildOperationSlotDisplay(steppedMinExpansion),
    "12 [ < 3 \u00D7 12 + \u00AC(12 \u2264 3 \u00D7 3) ]",
    "inactive step target applies bespoke min expansion with concrete operands",
  );

  const steppedUnaryIncExpansion: GameState = {
    ...steppedAdditionExpansion,
    calculator: {
      ...steppedAdditionExpansion.calculator,
      operationSlots: [{ kind: "unary", operator: uop("unary_inc") }],
    },
  };
  assert.equal(
    buildOperationSlotDisplay(steppedUnaryIncExpansion),
    "5 [ + 1 ]",
    "inactive unary increment target expands to + 1",
  );

  const steppedUnaryDecExpansion: GameState = {
    ...steppedAdditionExpansion,
    calculator: {
      ...steppedAdditionExpansion.calculator,
      operationSlots: [{ kind: "unary", operator: uop("unary_dec") }],
    },
  };
  assert.equal(
    buildOperationSlotDisplay(steppedUnaryDecExpansion),
    "5 [ + -1 ]",
    "inactive unary decrement target expands to en-dash subtraction by one",
  );

  const steppedUnaryNegExpansion: GameState = {
    ...steppedAdditionExpansion,
    calculator: {
      ...steppedAdditionExpansion.calculator,
      operationSlots: [{ kind: "unary", operator: uop("unary_neg") }],
    },
  };
  assert.equal(
    buildOperationSlotDisplay(steppedUnaryNegExpansion),
    "5 [ \u00D7 -1 ]",
    "inactive unary negate target expands to multiply by negative one",
  );

  const steppedUnaryOmegaExpansion: GameState = {
    ...steppedAdditionExpansion,
    calculator: {
      ...steppedAdditionExpansion.calculator,
      operationSlots: [{ kind: "unary", operator: uop("unary_omega") }],
    },
  };
  assert.equal(
    buildOperationSlotDisplay(steppedUnaryOmegaExpansion),
    "5 [ \u03A3\u209B(e\u209B) ]",
    "inactive unary omega target expands to prime-exponent sum",
  );

  const steppedUnaryPhiExpansion: GameState = {
    ...steppedAdditionExpansion,
    calculator: {
      ...steppedAdditionExpansion.calculator,
      operationSlots: [{ kind: "unary", operator: uop("unary_phi") }],
    },
  };
  assert.equal(
    buildOperationSlotDisplay(steppedUnaryPhiExpansion),
    "5 [ n \u00D7 \u220F(1-p^-1) ]",
    "inactive unary totient target expands to n times Euler-product form",
  );

  const steppedUnarySigmaExpansion: GameState = {
    ...steppedAdditionExpansion,
    calculator: {
      ...steppedAdditionExpansion.calculator,
      operationSlots: [{ kind: "unary", operator: uop("unary_sigma") }],
    },
  };
  assert.equal(
    buildOperationSlotDisplay(steppedUnarySigmaExpansion),
    "5 [ \u03A3_d( [d|n] \u00D7 d) ]",
    "inactive unary divisor-sum target expands to divisor-indicator summation",
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

