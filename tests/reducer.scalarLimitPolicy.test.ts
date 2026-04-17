import assert from "node:assert/strict";
import { reducer } from "../src/domain/reducer.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import {
  toExplicitComplexCalculatorValue,
  toRationalCalculatorValue,
  toRationalScalarValue,
} from "../src/domain/calculatorValue.js";
import { initialState } from "../src/domain/state.js";
import { EXECUTION_PAUSE_EQUALS_FLAG } from "../src/domain/state.js";
import type { GameState } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });

const withExecutionSetup = (
  state: GameState,
  options: {
    total?: GameState["calculator"]["total"];
    operationSlots?: GameState["calculator"]["operationSlots"];
    maxTotalDigits?: number;
    deltaQ?: number;
  } = {},
): GameState => {
  const base = initialState();
  const nextLambda = {
    ...state.lambdaControl,
    delta_q: options.deltaQ ?? state.lambdaControl.delta_q,
  };
  return {
    ...state,
    lambdaControl: nextLambda,
    calculators: undefined,
    calculatorOrder: undefined,
    activeCalculatorId: undefined,
    calculator: {
      ...state.calculator,
      total: options.total ?? state.calculator.total,
      operationSlots: options.operationSlots ?? [{ operator: KEY_ID.op_add, operand: 0n }],
      draftingSlot: null,
      rollEntries: [],
    },
    unlocks: {
      ...state.unlocks,
      maxTotalDigits: options.maxTotalDigits ?? state.unlocks.maxTotalDigits,
      execution: {
        ...state.unlocks.execution,
        [KEY_ID.exec_equals]: true,
      },
      slotOperators: {
        ...state.unlocks.slotOperators,
        [KEY_ID.op_add]: true,
        [KEY_ID.op_div]: true,
      },
    },
    ui: {
      ...state.ui,
      keyLayout: [{ kind: "key", key: KEY_ID.exec_step_through }],
      keypadColumns: 1,
      keypadRows: 1,
      buttonFlags: {
        [EXECUTION_PAUSE_EQUALS_FLAG]: true,
      },
    },
    keyPressCounts: {
      ...base.keyPressCounts,
    },
  };
};

export const runReducerScalarLimitPolicyTests = (): void => {
  const seed = initialState();

  const rationalPrecisionOverflow = reducer(
    withExecutionSetup(seed, {
      total: r(8n, 11n),
      maxTotalDigits: 2,
      deltaQ: 1,
    }),
    { type: "AUTO_STEP_TICK" },
  );
  assert.deepEqual(
    rationalPrecisionOverflow.calculator.total,
    r(3n, 4n),
    "rational denominator overflow projects to nearest allowed fraction under delta_q",
  );
  assert.equal(rationalPrecisionOverflow.calculator.rollEntries[1]?.error?.code, "overflow_q", "rational denominator overflow emits overflow_q code");
  assert.deepEqual(
    rationalPrecisionOverflow.calculator.rollEntries[1]?.limitMetadata,
    {
      rawY: r(8n, 11n),
      components: {
        re: "overflow_q",
        im: "none",
      },
    },
    "rational denominator overflow emits raw pre-limit value and per-component limit metadata",
  );

  const complexRealOverflow = reducer(
    withExecutionSetup(seed, {
      total: toExplicitComplexCalculatorValue(
        toRationalScalarValue({ num: 150n, den: 1n }),
        toRationalScalarValue({ num: 1n, den: 1n }),
      ),
      maxTotalDigits: 2,
      deltaQ: 2,
    }),
    { type: "AUTO_STEP_TICK" },
  );
  assert.deepEqual(
    complexRealOverflow.calculator.total,
    toExplicitComplexCalculatorValue(
      toRationalScalarValue({ num: 99n, den: 1n }),
      toRationalScalarValue({ num: 1n, den: 1n }),
    ),
    "complex real component is clamped independently by maxTotalDigits",
  );
  assert.equal(complexRealOverflow.calculator.rollEntries[1]?.error?.code, "overflow", "complex magnitude overflow emits overflow");
  assert.deepEqual(
    complexRealOverflow.calculator.rollEntries[1]?.limitMetadata,
    {
      rawY: toExplicitComplexCalculatorValue(
        toRationalScalarValue({ num: 150n, den: 1n }),
        toRationalScalarValue({ num: 1n, den: 1n }),
      ),
      components: {
        re: "overflow",
        im: "none",
      },
    },
    "complex real overflow records raw value and component-scoped limit kinds",
  );

  const complexImagPrecisionOverflow = reducer(
    withExecutionSetup(seed, {
      total: toExplicitComplexCalculatorValue(
        toRationalScalarValue({ num: 1n, den: 1n }),
        toRationalScalarValue({ num: 8n, den: 11n }),
      ),
      maxTotalDigits: 3,
      deltaQ: 1,
    }),
    { type: "AUTO_STEP_TICK" },
  );
  assert.deepEqual(
    complexImagPrecisionOverflow.calculator.total,
    toExplicitComplexCalculatorValue(
      toRationalScalarValue({ num: 1n, den: 1n }),
      toRationalScalarValue({ num: 3n, den: 4n }),
    ),
    "complex imaginary component is projected independently by maxDenominatorDigits",
  );
  assert.equal(complexImagPrecisionOverflow.calculator.rollEntries[1]?.error?.code, "overflow_q", "complex denominator overflow emits overflow_q");
  assert.deepEqual(
    complexImagPrecisionOverflow.calculator.rollEntries[1]?.limitMetadata,
    {
      rawY: toExplicitComplexCalculatorValue(
        toRationalScalarValue({ num: 1n, den: 1n }),
        toRationalScalarValue({ num: 8n, den: 11n }),
      ),
      components: {
        re: "none",
        im: "overflow_q",
      },
    },
    "complex imaginary denominator overflow records per-component limit kinds",
  );

  const complexMixedOverflow = reducer(
    withExecutionSetup(seed, {
      total: toExplicitComplexCalculatorValue(
        toRationalScalarValue({ num: 150n, den: 1n }),
        toRationalScalarValue({ num: 8n, den: 11n }),
      ),
      maxTotalDigits: 2,
      deltaQ: 1,
    }),
    { type: "AUTO_STEP_TICK" },
  );
  assert.equal(complexMixedOverflow.calculator.rollEntries[1]?.error?.code, "overflow", "complex mixed overflow prefers overflow over overflow_q");
  assert.deepEqual(
    complexMixedOverflow.calculator.rollEntries[1]?.limitMetadata,
    {
      rawY: toExplicitComplexCalculatorValue(
        toRationalScalarValue({ num: 150n, den: 1n }),
        toRationalScalarValue({ num: 8n, den: 11n }),
      ),
      components: {
        re: "overflow",
        im: "overflow_q",
      },
    },
    "complex mixed overflow records both component limit kinds while preserving overflow precedence",
  );
  assert.deepEqual(
    complexMixedOverflow.calculator.total,
    toExplicitComplexCalculatorValue(
      toRationalScalarValue({ num: 99n, den: 1n }),
      toRationalScalarValue({ num: 3n, den: 4n }),
    ),
    "complex mixed overflow clamps and projects each component independently",
  );

  const complexNoOverflow = reducer(
    withExecutionSetup(seed, {
      total: toExplicitComplexCalculatorValue(
        toRationalScalarValue({ num: 5n, den: 7n }),
        toRationalScalarValue({ num: -8n, den: 9n }),
      ),
      maxTotalDigits: 3,
      deltaQ: 1,
    }),
    { type: "AUTO_STEP_TICK" },
  );
  assert.deepEqual(
    complexNoOverflow.calculator.total,
    toExplicitComplexCalculatorValue(
      toRationalScalarValue({ num: 5n, den: 7n }),
      toRationalScalarValue({ num: -8n, den: 9n }),
    ),
    "complex value within both limits is preserved",
  );
  assert.equal(complexNoOverflow.calculator.rollEntries[1]?.error, undefined, "no overflow metadata is emitted when limits are satisfied");
  assert.equal(complexNoOverflow.calculator.rollEntries[1]?.limitMetadata, undefined, "non-overflow rows emit no limit metadata");
};
