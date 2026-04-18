import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { reducer } from "../src/domain/reducer.js";
import { applyEqualsFromStepProgress } from "../src/domain/reducer.input.core.js";
import {
  DELTA_RANGE_CLAMP_FLAG,
  EXECUTION_PAUSE_EQUALS_FLAG,
} from "../src/domain/state.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import {
  calculatorValuesEquivalent,
  toAlgebraicScalarValue,
  toExplicitComplexCalculatorValue,
  toRationalCalculatorValue,
  toRationalScalarValue,
} from "../src/domain/calculatorValue.js";
import { executeSlotsValue } from "../src/domain/engine.js";
import { resolveRollInversePlan } from "../src/domain/rollInverseExecution.js";
import type { GameState, Slot } from "../src/domain/types.js";
import { legacyInitialState } from "./support/legacyState.js";
import { executionUnlockPatch, op, uop } from "./support/keyCompat.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });

const withStepProgressReset = (state: GameState): GameState => ({
  ...state,
  calculator: {
    ...state.calculator,
    stepProgress: {
      active: false,
      seedTotal: null,
      currentTotal: null,
      nextSlotIndex: 0,
      executedSlotResults: [],
    },
  },
});

const withActiveInverseStepProgress = (state: GameState): GameState => ({
  ...state,
  calculator: {
    ...state.calculator,
    stepProgress: {
      active: true,
      mode: "inverse",
      seedTotal: state.calculator.total,
      currentTotal: state.calculator.total,
      nextSlotIndex: 0,
      executedSlotResults: [],
    },
  },
});

const assertInversePlanResolvable = (id: string, slot: Slot): void => {
  const resolved = resolveRollInversePlan([slot], null);
  assert.equal(resolved.ok, true, `${id}: inverse plan should resolve`);
};

const assertInversePlanAmbiguous = (id: string, slot: Slot): void => {
  const resolved = resolveRollInversePlan([slot], null);
  assert.equal(resolved.ok, false, `${id}: inverse plan should be ambiguous`);
};

export const runOperatorTestingMatrixContractTests = (): void => {
  assertInversePlanResolvable("INV-PLAN-OP-ADD-01", { operator: op("op_add"), operand: 3n });
  assertInversePlanResolvable("INV-PLAN-OP-SUB-01", { operator: op("op_sub"), operand: 3n });
  assertInversePlanResolvable("INV-PLAN-OP-MUL-01", { operator: op("op_mul"), operand: 3n });
  assertInversePlanResolvable("INV-PLAN-OP-DIV-01", { operator: op("op_div"), operand: 3n });
  assertInversePlanResolvable("INV-PLAN-OP-POW-01", { operator: op("op_pow"), operand: 2n });
  assertInversePlanResolvable("INV-PLAN-OP-ROTATE15-01", { operator: op("op_rotate_15"), operand: 3n });
  assertInversePlanResolvable("INV-PLAN-OP-WHOLE-STEPS-01", { operator: op("op_whole_steps"), operand: 3n });
  assertInversePlanResolvable("INV-PLAN-OP-INTERVAL-01", { operator: op("op_interval"), operand: 2n });
  assertInversePlanResolvable("INV-PLAN-UNARY-INC-01", { kind: "unary", operator: uop("unary_inc") });
  assertInversePlanResolvable("INV-PLAN-UNARY-DEC-01", { kind: "unary", operator: uop("unary_dec") });
  assertInversePlanResolvable("INV-PLAN-UNARY-NEG-01", { kind: "unary", operator: uop("unary_neg") });
  assertInversePlanResolvable("INV-PLAN-UNARY-I-01", { kind: "unary", operator: uop("unary_i") });
  assertInversePlanResolvable("INV-PLAN-UNARY-ROTATE15-01", { kind: "unary", operator: uop("unary_rotate_15") });
  assertInversePlanResolvable("INV-PLAN-UNARY-RECIPROCAL-01", { kind: "unary", operator: uop("unary_reciprocal") });
  assertInversePlanResolvable("INV-PLAN-UNARY-PLUS-I-01", { kind: "unary", operator: uop("unary_plus_i") });
  assertInversePlanResolvable("INV-PLAN-UNARY-MINUS-I-01", { kind: "unary", operator: uop("unary_minus_i") });
  assertInversePlanResolvable("INV-PLAN-UNARY-CONJUGATE-01", { kind: "unary", operator: uop("unary_conjugate") });
  assertInversePlanResolvable("INV-PLAN-UNARY-REAL-FLIP-01", { kind: "unary", operator: uop("unary_real_flip") });

  assertInversePlanAmbiguous("INV-PLAN-OP-MUL-GUARD-01", { operator: op("op_mul"), operand: 0n });
  assertInversePlanAmbiguous("INV-PLAN-OP-DIV-GUARD-01", { operator: op("op_div"), operand: 0n });
  assertInversePlanAmbiguous("INV-PLAN-OP-POW-GUARD-01", { operator: op("op_pow"), operand: 0n });
  assertInversePlanAmbiguous("INV-PLAN-OP-INTERVAL-GUARD-01A", { operator: op("op_interval"), operand: 0n });
  assertInversePlanAmbiguous("INV-PLAN-OP-INTERVAL-GUARD-01B", { operator: op("op_interval"), operand: -1n });

  const base: GameState = withStepProgressReset({
    ...legacyInitialState(),
    unlocks: {
      ...legacyInitialState().unlocks,
      maxSlots: 2,
      maxTotalDigits: 2,
      utilities: {
        ...legacyInitialState().unlocks.utilities,
        [KEY_ID.util_clear_all]: true,
      },
      execution: {
        ...legacyInitialState().unlocks.execution,
        ...executionUnlockPatch([["exec_equals", true], ["exec_step_through", true], ["exec_roll_inverse", true]]),
      },
      slotOperators: {
        ...legacyInitialState().unlocks.slotOperators,
        [op("op_add")]: true,
      },
    },
    ui: {
      ...legacyInitialState().ui,
      keyLayout: [
        { kind: "key", key: KEY_ID.exec_roll_inverse },
        { kind: "key", key: KEY_ID.exec_step_through },
        { kind: "key", key: KEY_ID.exec_equals, behavior: { type: "toggle_flag", flag: EXECUTION_PAUSE_EQUALS_FLAG } },
        { kind: "key", key: KEY_ID.toggle_delta_range_clamp, behavior: { type: "toggle_flag", flag: DELTA_RANGE_CLAMP_FLAG } },
      ],
      keypadColumns: 4,
      keypadRows: 1,
      buttonFlags: {
        [DELTA_RANGE_CLAMP_FLAG]: true,
      },
    },
    calculator: {
      ...legacyInitialState().calculator,
      total: r(99n),
      operationSlots: [{ operator: op("op_add"), operand: 1n }],
      rollEntries: [],
      draftingSlot: null,
    },
  });

  const inverseEnabled = reducer(base, { type: "PRESS_KEY", key: KEY_ID.exec_roll_inverse });
  assert.equal(inverseEnabled.calculator.stepProgress.mode, "inverse", "INV-MODE-01: roll-inverse enables inverse step mode");
  const inversePreview = reducer(inverseEnabled, { type: "PRESS_KEY", key: KEY_ID.exec_step_through });
  assert.equal(
    inversePreview.calculator.rollEntries.length > 0 || inversePreview.calculator.stepProgress.active,
    true,
    "INV-MODE-02: inverse step-through runs execution in inverse mode context",
  );
  assert.notEqual(inversePreview.calculator.total.kind, "nan", "INV-MODE-03: inverse step projection remains non-NaN");

  const inverseWholeSteps = reducer(
    reducer(
      {
        ...base,
        unlocks: {
          ...base.unlocks,
          slotOperators: {
            ...base.unlocks.slotOperators,
            [op("op_whole_steps")]: true,
          },
        },
        ui: {
          ...base.ui,
          buttonFlags: {},
        },
        calculator: {
          ...base.calculator,
          total: r(729n, 256n),
          operationSlots: [{ operator: op("op_whole_steps"), operand: 3n }],
          rollEntries: [],
          draftingSlot: null,
        },
      },
      { type: "PRESS_KEY", key: KEY_ID.exec_roll_inverse },
    ),
    { type: "PRESS_KEY", key: KEY_ID.exec_equals },
  );
  assert.notEqual(inverseWholeSteps.calculator.total.kind, "nan", "INV-EXEC-OP-WHOLE-STEPS-01: inverse execution remains non-NaN");

  const inverseInterval = reducer(
    reducer(
      {
        ...base,
        unlocks: {
          ...base.unlocks,
          slotOperators: {
            ...base.unlocks.slotOperators,
            [op("op_interval")]: true,
          },
        },
        ui: {
          ...base.ui,
          buttonFlags: {},
        },
        calculator: {
          ...base.calculator,
          total: r(6n),
          operationSlots: [{ operator: op("op_interval"), operand: 2n }],
          rollEntries: [],
          draftingSlot: null,
        },
      },
      { type: "PRESS_KEY", key: KEY_ID.exec_roll_inverse },
    ),
    { type: "PRESS_KEY", key: KEY_ID.exec_equals },
  );
  assert.notEqual(inverseInterval.calculator.total.kind, "nan", "INV-EXEC-OP-INTERVAL-01: inverse execution remains non-NaN");

  const inverseReciprocal = reducer(
    reducer(
      {
        ...base,
        unlocks: {
          ...base.unlocks,
          unaryOperators: {
            ...base.unlocks.unaryOperators,
            [uop("unary_reciprocal")]: true,
          },
        },
        ui: {
          ...base.ui,
          buttonFlags: {},
        },
        calculator: {
          ...base.calculator,
          total: r(1n, 2n),
          operationSlots: [{ kind: "unary", operator: uop("unary_reciprocal") }],
          rollEntries: [],
          draftingSlot: null,
        },
      },
      { type: "PRESS_KEY", key: KEY_ID.exec_roll_inverse },
    ),
    { type: "PRESS_KEY", key: KEY_ID.exec_equals },
  );
  assert.notEqual(inverseReciprocal.calculator.total.kind, "nan", "INV-EXEC-UNARY-RECIPROCAL-01: inverse execution remains non-NaN");

  const inversePlusI = reducer(
    reducer(
      {
        ...base,
        unlocks: {
          ...base.unlocks,
          unaryOperators: {
            ...base.unlocks.unaryOperators,
            [uop("unary_plus_i")]: true,
            [uop("unary_minus_i")]: true,
          },
        },
        ui: {
          ...base.ui,
          buttonFlags: {},
        },
        calculator: {
          ...base.calculator,
          total: toExplicitComplexCalculatorValue(
            toRationalScalarValue({ num: 5n, den: 4n }),
            toRationalScalarValue({ num: 3n, den: 1n }),
          ),
          operationSlots: [{ kind: "unary", operator: uop("unary_plus_i") }],
          rollEntries: [],
          draftingSlot: null,
        },
      },
      { type: "PRESS_KEY", key: KEY_ID.exec_roll_inverse },
    ),
    { type: "PRESS_KEY", key: KEY_ID.exec_equals },
  );
  assert.notEqual(inversePlusI.calculator.total.kind, "nan", "INV-EXEC-UNARY-PLUS-I-01: inverse execution remains non-NaN");

  const inverseConjugate = reducer(
    reducer(
      {
        ...base,
        unlocks: {
          ...base.unlocks,
          unaryOperators: {
            ...base.unlocks.unaryOperators,
            [uop("unary_conjugate")]: true,
          },
        },
        ui: {
          ...base.ui,
          buttonFlags: {},
        },
        calculator: {
          ...base.calculator,
          total: toExplicitComplexCalculatorValue(
            toRationalScalarValue({ num: 7n, den: 3n }),
            toRationalScalarValue({ num: -5n, den: 1n }),
          ),
          operationSlots: [{ kind: "unary", operator: uop("unary_conjugate") }],
          rollEntries: [],
          draftingSlot: null,
        },
      },
      { type: "PRESS_KEY", key: KEY_ID.exec_roll_inverse },
    ),
    { type: "PRESS_KEY", key: KEY_ID.exec_equals },
  );
  assert.notEqual(inverseConjugate.calculator.total.kind, "nan", "INV-EXEC-UNARY-CONJUGATE-01: inverse execution remains non-NaN");

  const inverseRealFlip = reducer(
    reducer(
      {
        ...base,
        unlocks: {
          ...base.unlocks,
          unaryOperators: {
            ...base.unlocks.unaryOperators,
            [uop("unary_real_flip")]: true,
          },
        },
        ui: {
          ...base.ui,
          buttonFlags: {},
        },
        calculator: {
          ...base.calculator,
          total: toExplicitComplexCalculatorValue(
            toRationalScalarValue({ num: -9n, den: 2n }),
            toRationalScalarValue({ num: 4n, den: 1n }),
          ),
          operationSlots: [{ kind: "unary", operator: uop("unary_real_flip") }],
          rollEntries: [],
          draftingSlot: null,
        },
      },
      { type: "PRESS_KEY", key: KEY_ID.exec_roll_inverse },
    ),
    { type: "PRESS_KEY", key: KEY_ID.exec_equals },
  );
  assert.notEqual(inverseRealFlip.calculator.total.kind, "nan", "INV-EXEC-UNARY-REAL-FLIP-01: inverse execution remains non-NaN");

  const inversePowPrincipal = applyEqualsFromStepProgress(
    withActiveInverseStepProgress({
      ...base,
      unlocks: {
        ...base.unlocks,
        slotOperators: {
          ...base.unlocks.slotOperators,
          [op("op_pow")]: true,
        },
      },
      ui: {
        ...base.ui,
        buttonFlags: {},
      },
      calculator: {
        ...base.calculator,
        total: r(2n),
        operationSlots: [{ operator: op("op_pow"), operand: 2n }],
        rollEntries: [],
        draftingSlot: null,
      },
    }),
  );
  const inversePowPrincipalExpected = toExplicitComplexCalculatorValue(
    toAlgebraicScalarValue({ sqrt2: { num: 1n, den: 1n } }),
    toRationalScalarValue({ num: 0n, den: 1n }),
  );
  assert.equal(
    calculatorValuesEquivalent(inversePowPrincipal.calculator.total, inversePowPrincipalExpected),
    true,
    "INV-EXEC-OP-POW-PRINCIPAL-01: inverse sqrt uses principal representable radical output",
  );
  assert.equal(
    inversePowPrincipal.calculator.rollEntries.at(-1)?.inverseAmbiguous,
    true,
    "INV-EXEC-OP-POW-AMB-META-01: principal inverse root emits ambiguity metadata",
  );

  const inversePowAmbiguous = applyEqualsFromStepProgress(
    withActiveInverseStepProgress({
      ...base,
      unlocks: {
        ...base.unlocks,
        slotOperators: {
          ...base.unlocks.slotOperators,
          [op("op_pow")]: true,
        },
      },
      ui: {
        ...base.ui,
        buttonFlags: {},
      },
      calculator: {
        ...base.calculator,
        total: r(5n),
        operationSlots: [{ operator: op("op_pow"), operand: 2n }],
        rollEntries: [],
        draftingSlot: null,
      },
    }),
  );
  const inversePowAmbiguousEntry = inversePowAmbiguous.calculator.rollEntries.at(-1);
  assert.equal(inversePowAmbiguous.calculator.total.kind, "nan", "INV-EXEC-OP-POW-AMB-NEG-01: non-representable inverse root remains NaN");
  assert.deepEqual(
    inversePowAmbiguousEntry?.error,
    { code: "inverse_ambiguous", kind: "ambiguous" },
    "INV-EXEC-OP-POW-AMB-NEG-02: non-representable inverse root preserves inverse ambiguity error metadata",
  );

  const wholeStepsAlgebraic = executeSlotsValue(
    toExplicitComplexCalculatorValue(
      toAlgebraicScalarValue({ sqrt2: { num: 1n, den: 1n } }),
      toRationalScalarValue({ num: 0n, den: 1n }),
    ),
    [{ operator: op("op_whole_steps"), operand: 2n }],
  );
  assert.deepEqual(
    wholeStepsAlgebraic,
    {
      ok: true,
      total: toExplicitComplexCalculatorValue(
        toAlgebraicScalarValue({ sqrt2: { num: 81n, den: 64n } }),
        toRationalScalarValue({ num: 0n, den: 1n }),
      ),
    },
    "ALG-OP-WHOLE-STEPS-01: whole-steps scales algebraic components in canonical basis",
  );

  const intervalAlgebraic = executeSlotsValue(
    toExplicitComplexCalculatorValue(
      toAlgebraicScalarValue({ sqrt3: { num: 1n, den: 1n } }),
      toRationalScalarValue({ num: 0n, den: 1n }),
    ),
    [{ operator: op("op_interval"), operand: 2n }],
  );
  assert.deepEqual(
    intervalAlgebraic,
    {
      ok: true,
      total: toExplicitComplexCalculatorValue(
        toAlgebraicScalarValue({ sqrt3: { num: 3n, den: 2n } }),
        toRationalScalarValue({ num: 0n, den: 1n }),
      ),
    },
    "ALG-OP-INTERVAL-01: interval scales algebraic components in canonical basis",
  );

  const floorOnAlgebraicComplex = executeSlotsValue(
    toExplicitComplexCalculatorValue(
      toAlgebraicScalarValue({ sqrt2: { num: 3n, den: 1n } }),
      toAlgebraicScalarValue({ one: { num: -1n, den: 2n }, sqrt3: { num: 1n, den: 1n } }),
    ),
    [{ kind: "unary", operator: uop("unary_floor") }],
  );
  assert.deepEqual(
    floorOnAlgebraicComplex,
    {
      ok: true,
      total: toExplicitComplexCalculatorValue(
        toRationalScalarValue({ num: 4n, den: 1n }),
        toRationalScalarValue({ num: 1n, den: 1n }),
      ),
    },
    "ALG-UNARY-FLOOR-01: floor applies exact componentwise ordering on algebraic complex values",
  );

  const ceilOnAlgebraicComplex = executeSlotsValue(
    toExplicitComplexCalculatorValue(
      toAlgebraicScalarValue({ sqrt2: { num: 3n, den: 1n } }),
      toAlgebraicScalarValue({ one: { num: -1n, den: 2n }, sqrt3: { num: 1n, den: 1n } }),
    ),
    [{ kind: "unary", operator: uop("unary_ceil") }],
  );
  assert.deepEqual(
    ceilOnAlgebraicComplex,
    {
      ok: true,
      total: toExplicitComplexCalculatorValue(
        toRationalScalarValue({ num: 5n, den: 1n }),
        toRationalScalarValue({ num: 2n, den: 1n }),
      ),
    },
    "ALG-UNARY-CEIL-01: ceil applies exact componentwise ordering on algebraic complex values",
  );
};
