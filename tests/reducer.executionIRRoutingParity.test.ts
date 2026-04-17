import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { reducer } from "../src/domain/reducer.js";
import {
  BINARY_OCTAVE_CYCLE_FLAG,
  DELTA_RANGE_CLAMP_FLAG,
  EXECUTION_PAUSE_EQUALS_FLAG,
  MOD_ZERO_TO_DELTA_FLAG,
} from "../src/domain/state.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import {
  toExplicitComplexCalculatorValue,
  toExpressionScalarValue,
  toRationalCalculatorValue,
  toRationalScalarValue,
} from "../src/domain/calculatorValue.js";
import { symbolicExpr } from "../src/domain/expression.js";
import { materializeCalculatorG } from "../src/domain/multiCalculator.js";
import type { Action, GameState } from "../src/domain/types.js";
import { legacyInitialState } from "./support/legacyState.js";
import { executionUnlockPatch, op, uop } from "./support/keyCompat.js";
import { createSeededMaintenanceRng } from "./helpers/seededMaintenance.js";

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

export const runReducerExecutionIRRoutingParityTests = (): void => {
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
        { kind: "key", key: KEY_ID.exec_step_through },
        { kind: "key", key: KEY_ID.exec_equals, behavior: { type: "toggle_flag", flag: EXECUTION_PAUSE_EQUALS_FLAG } },
        { kind: "key", key: KEY_ID.toggle_delta_range_clamp, behavior: { type: "toggle_flag", flag: DELTA_RANGE_CLAMP_FLAG } },
      ],
      keypadColumns: 3,
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

  const stepped = reducer(base, { type: "PRESS_KEY", key: KEY_ID.exec_step_through });
  assert.equal(stepped.calculator.stepProgress.active, false, "step-through clears progress when terminal slot and wrap-tail coalesce");
  assert.deepEqual(stepped.calculator.total, r(-98n), "step-through applies pending wrap-tail on the terminal slot step");
  assert.equal(
    stepped.calculator.rollEntries.length,
    2,
    "terminal step-through path commits seed + terminal row exactly once",
  );

  const withEqualsToggle = reducer(base, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_EQUALS_FLAG });
  const autoTickTerminal = reducer(withEqualsToggle, { type: "AUTO_STEP_TICK" });
  assert.equal(autoTickTerminal.calculator.stepProgress.active, false, "equals-toggle auto-step clears progress at terminal stage");
  assert.deepEqual(autoTickTerminal.calculator.total, r(-98n), "equals-toggle auto-step terminal total matches wrap-tail semantics");
  assert.equal(autoTickTerminal.calculator.rollEntries.length, 2, "equals-toggle auto-step terminal commit remains single seed/result pair");

  const inverseEnabled = reducer(base, { type: "PRESS_KEY", key: KEY_ID.exec_roll_inverse });
  assert.equal(inverseEnabled.calculator.stepProgress.mode, "inverse", "roll-inverse enables inverse step mode even when wrap tail exists");
  const inversePreview = reducer(inverseEnabled, { type: "PRESS_KEY", key: KEY_ID.exec_step_through });
  assert.equal(inversePreview.calculator.stepProgress.active, true, "inverse step-through starts staged inverse execution");
  assert.deepEqual(inversePreview.calculator.stepProgress.currentTotal, r(-99n), "inverse wrap stage projects to canonical principal interval");

  const inversePowAmbiguous = reducer(
    {
      ...base,
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
    },
    { type: "PRESS_KEY", key: KEY_ID.exec_roll_inverse },
  );
  const inversePowStep = reducer(inversePowAmbiguous, { type: "PRESS_KEY", key: KEY_ID.exec_step_through });
  assert.equal(
    inversePowStep.calculator.total.kind,
    "nan",
    "inverse of non-perfect integer powers resolves to NaN (no symbolic radical fallback)",
  );
  assert.equal(
    inversePowStep.calculator.rollEntries[1]?.error?.code,
    "inverse_ambiguous",
    "inverse non-perfect power emits inverse_ambiguous metadata",
  );

  const rationalPrecisionOverflow = reducer(
    {
      ...base,
      unlocks: {
        ...base.unlocks,
        maxTotalDigits: 1,
      },
      ui: {
        ...base.ui,
        buttonFlags: {},
      },
      calculator: {
        ...base.calculator,
        total: r(8n),
        operationSlots: [{ operator: op("op_div"), operand: 11n }],
        rollEntries: [],
        draftingSlot: null,
      },
    },
    { type: "PRESS_KEY", key: KEY_ID.exec_equals },
  );
  assert.deepEqual(
    rationalPrecisionOverflow.calculator.total,
    r(3n, 4n),
    "rational precision overflow projects to deterministic nearest denominator-bounded fraction",
  );
  assert.equal(rationalPrecisionOverflow.calculator.rollEntries[1]?.error?.code, "overflow_q", "roll row carries overflow_q code");
  assert.equal(rationalPrecisionOverflow.calculator.rollEntries[1]?.error?.kind, "overflow_q", "roll row carries overflow_q kind");

  const complexWrapBase: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      total: toExplicitComplexCalculatorValue(
        toRationalScalarValue({ num: 150n, den: 1n }),
        toRationalScalarValue({ num: -150n, den: 1n }),
      ),
      operationSlots: [],
      rollEntries: [],
      draftingSlot: null,
    },
  };
  const complexDeltaWrapped = reducer(complexWrapBase, { type: "PRESS_KEY", key: KEY_ID.exec_equals });
  assert.deepEqual(
    complexDeltaWrapped.calculator.total,
    toExplicitComplexCalculatorValue(
      toRationalScalarValue({ num: -48n, den: 1n }),
      toRationalScalarValue({ num: 48n, den: 1n }),
    ),
    "delta wrap applies principal interval projection independently to complex components",
  );

  const complexModWrapped = reducer(
    {
      ...complexWrapBase,
      ui: {
        ...complexWrapBase.ui,
        buttonFlags: {
          [MOD_ZERO_TO_DELTA_FLAG]: true,
        },
      },
    },
    { type: "PRESS_KEY", key: KEY_ID.exec_equals },
  );
  assert.deepEqual(
    complexModWrapped.calculator.total,
    toExplicitComplexCalculatorValue(
      toRationalScalarValue({ num: 51n, den: 1n }),
      toRationalScalarValue({ num: 48n, den: 1n }),
    ),
    "mod wrap applies principal interval projection independently to complex components",
  );

  const complexInexact = reducer(
    {
      ...complexWrapBase,
      calculator: {
        ...complexWrapBase.calculator,
        total: toExplicitComplexCalculatorValue(
          toExpressionScalarValue(symbolicExpr("pi")),
          toRationalScalarValue({ num: 0n, den: 1n }),
        ),
      },
    },
    { type: "PRESS_KEY", key: KEY_ID.exec_equals },
  );
  assert.equal(complexInexact.calculator.total.kind, "nan", "exact-only wrap policy yields ambiguous NaN for non-exact complex component wraps");

  const complexOctaveWrapped = reducer(
    {
      ...complexWrapBase,
      ui: {
        ...complexWrapBase.ui,
        buttonFlags: {
          [BINARY_OCTAVE_CYCLE_FLAG]: true,
        },
      },
      calculator: {
        ...complexWrapBase.calculator,
        total: toExplicitComplexCalculatorValue(
          toRationalScalarValue({ num: 48n, den: 1n }),
          toRationalScalarValue({ num: 64n, den: 1n }),
        ),
      },
    },
    { type: "PRESS_KEY", key: KEY_ID.exec_equals },
  );
  assert.deepEqual(
    complexOctaveWrapped.calculator.total,
    toExplicitComplexCalculatorValue(
      toRationalScalarValue({ num: 3n, den: 16n }),
      toRationalScalarValue({ num: 1n, den: 4n }),
    ),
    "octave wrap projects complex magnitude into principal octave while preserving direction",
  );

  const complexCycleBase: GameState = {
    ...base,
    ui: {
      ...base.ui,
      buttonFlags: {},
    },
    unlocks: {
      ...base.unlocks,
      unaryOperators: {
        ...base.unlocks.unaryOperators,
        [uop("unary_i")]: true,
      },
      slotOperators: {
        ...base.unlocks.slotOperators,
        [op("op_mul")]: true,
      },
    },
    calculator: {
      ...base.calculator,
      total: r(1n),
      operationSlots: [{ kind: "unary", operator: uop("unary_i") }],
      rollEntries: [],
      rollAnalysis: { stopReason: "none", cycle: null },
      draftingSlot: null,
    },
  };
  let complexCycleDetected = complexCycleBase;
  for (let step = 0; step < 4; step += 1) {
    complexCycleDetected = reducer(complexCycleDetected, { type: "PRESS_KEY", key: KEY_ID.exec_equals });
  }
  assert.equal(complexCycleDetected.calculator.rollAnalysis.stopReason, "cycle", "complex unary-i orbit detects cycle metadata");
  assert.deepEqual(
    complexCycleDetected.calculator.rollAnalysis.cycle,
    { i: 0, j: 4, transientLength: 0, periodLength: 4 },
    "complex unary-i orbit exposes canonical cycle indices and lengths",
  );

  let complexNonCycle: GameState = {
    ...complexCycleBase,
    calculator: {
      ...complexCycleBase.calculator,
      operationSlots: [{ kind: "unary", operator: uop("unary_rotate_15") }],
      rollEntries: [],
      rollAnalysis: { stopReason: "none", cycle: null },
    },
  };
  for (let step = 0; step < 6; step += 1) {
    complexNonCycle = reducer(complexNonCycle, { type: "PRESS_KEY", key: KEY_ID.exec_equals });
  }
  assert.equal(complexNonCycle.calculator.rollAnalysis.stopReason, "none", "non-cyclic complex prefixes do not produce false-positive cycles");

  const complexCycleProjectionSeed: GameState = {
    ...complexCycleDetected,
    calculator: {
      ...complexCycleDetected.calculator,
      rollAnalysis: { stopReason: "none", cycle: null },
      rollEntries: complexCycleDetected.calculator.rollEntries.map((entry, index) => ({
        ...entry,
        ...(index === 2 ? { analysisIgnored: true } : {}),
      })),
    },
  };
  const complexCycleProjectionResult = reducer(complexCycleProjectionSeed, { type: "PRESS_KEY", key: KEY_ID.exec_equals });
  assert.equal(
    complexCycleProjectionResult.calculator.rollAnalysis.stopReason,
    "cycle",
    "analysis projection path still detects cycles on complex runs",
  );

  let realCycle: GameState = {
    ...complexCycleBase,
    calculator: {
      ...complexCycleBase.calculator,
      total: r(1n),
      operationSlots: [{ operator: op("op_mul"), operand: -1n }],
      rollEntries: [],
      rollAnalysis: { stopReason: "none", cycle: null },
    },
  };
  for (let step = 0; step < 2; step += 1) {
    realCycle = reducer(realCycle, { type: "PRESS_KEY", key: KEY_ID.exec_equals });
  }
  assert.equal(realCycle.calculator.rollAnalysis.stopReason, "cycle", "real cycle detection semantics remain unchanged");
  assert.deepEqual(
    realCycle.calculator.rollAnalysis.cycle,
    { i: 0, j: 2, transientLength: 0, periodLength: 2 },
    "real cycle metadata remains canonical after complex parity refactor",
  );

  const executionSeeds = [1103, 2207, 3313] as const;
  const runTrace = (seed: number): GameState => {
    const rng = createSeededMaintenanceRng(seed);
    const start = seed % 2 === 0
      ? withEqualsToggle
      : base;
    const trace: Action[] = [];
    if (seed % 2 === 0) {
      trace.push({ type: "AUTO_STEP_TICK" }, { type: "AUTO_STEP_TICK" });
    } else {
      trace.push({ type: "PRESS_KEY", key: KEY_ID.exec_step_through });
    }
    if (rng() > 0.5) {
      trace.push({ type: "AUTO_STEP_TICK" });
    }
    let next = start;
    for (const action of trace) {
      next = reducer(next, action);
    }
    return next;
  };
  for (const seed of executionSeeds) {
    const terminal = runTrace(seed);
    assert.equal(terminal.calculator.stepProgress.active, false, `seeded terminal trace clears step progress (seed=${seed})`);
    assert.deepEqual(terminal.calculator.total, r(-98n), `seeded terminal trace keeps wrap-tail total stable (seed=${seed})`);
    assert.equal(terminal.calculator.rollEntries.length, 2, `seeded terminal trace preserves single terminal commit (seed=${seed})`);
    assert.deepEqual(terminal.calculator.rollEntries[0]?.y, r(99n), `seeded terminal trace preserves seed row (seed=${seed})`);
    assert.deepEqual(terminal.calculator.rollEntries[1]?.y, r(-98n), `seeded terminal trace preserves terminal row (seed=${seed})`);
  }

  const multi = materializeCalculatorG(base);
  const withActiveF = reducer(multi, { type: "SET_ACTIVE_CALCULATOR", calculatorId: "f" });
  const gBase = withActiveF.calculators?.g;
  assert.equal(Boolean(gBase), true, "multi-calculator setup materializes calculator g before targeted trace");
  const withTargetedSetup: GameState = {
    ...withActiveF,
    calculators: {
      ...withActiveF.calculators,
      g: {
        ...gBase!,
        settings: {
          ...gBase!.settings,
        },
        ui: {
          ...gBase!.ui,
          keyLayout: [{ kind: "key", key: KEY_ID.util_clear_all }],
          keypadColumns: 1,
          keypadRows: 1,
          buttonFlags: {
            ...gBase!.ui.buttonFlags,
            [DELTA_RANGE_CLAMP_FLAG]: true,
          },
        },
        calculator: {
          ...gBase!.calculator,
          total: r(99n),
          operationSlots: [{ operator: op("op_add"), operand: 1n }],
          draftingSlot: null,
          rollEntries: [{ y: r(99n) }],
          stepProgress: {
            active: true,
            seedTotal: r(99n),
            currentTotal: r(100n),
            nextSlotIndex: 0,
            executedSlotResults: [],
          },
        },
      },
    },
  };
  const fInstance = withTargetedSetup.calculators?.f;
  const gInstance = withTargetedSetup.calculators?.g;
  assert.equal(Boolean(fInstance), true, "multi-calculator setup materializes calculator f");
  assert.equal(Boolean(gInstance), true, "multi-calculator setup materializes calculator g");
  const frozenF = {
    total: fInstance?.calculator.total,
    rollEntries: fInstance?.calculator.rollEntries,
    draftingSlot: fInstance?.calculator.draftingSlot,
    operationSlots: fInstance?.calculator.operationSlots,
    stepProgress: fInstance?.calculator.stepProgress,
  };
  const frozenG = {
    total: gInstance?.calculator.total,
    rollEntries: gInstance?.calculator.rollEntries,
    stepProgress: gInstance?.calculator.stepProgress,
  };
  const targetedTrace: Action[] = [
    { type: "PRESS_KEY", key: KEY_ID.util_clear_all, calculatorId: "g" },
  ];
  let targetedState = withTargetedSetup;
  for (const action of targetedTrace) {
    targetedState = reducer(targetedState, action);
  }
  const fAfter = targetedState.calculators?.f?.calculator;
  const gAfter = targetedState.calculators?.g?.calculator;
  assert.equal(Boolean(fAfter), true, "targeted trace preserves calculator f instance");
  assert.equal(Boolean(gAfter), true, "targeted trace preserves calculator g instance");
  assert.deepEqual(fAfter?.total, frozenF.total, "targeted g execution preserves active-f total");
  assert.deepEqual(fAfter?.rollEntries, frozenF.rollEntries, "targeted g execution preserves active-f roll history");
  assert.deepEqual(fAfter?.draftingSlot, frozenF.draftingSlot, "targeted g execution preserves active-f drafting slot");
  assert.deepEqual(fAfter?.operationSlots, frozenF.operationSlots, "targeted g execution preserves active-f operation slots");
  assert.deepEqual(fAfter?.stepProgress, frozenF.stepProgress, "targeted g execution preserves active-f step progress");
  assert.notDeepEqual(gAfter?.total, frozenG.total, "targeted g execution mutates g total while preserving active-f state");
  assert.notDeepEqual(gAfter?.rollEntries, frozenG.rollEntries, "targeted g execution mutates g roll history while preserving active-f state");
  assert.notDeepEqual(gAfter?.stepProgress, frozenG.stepProgress, "targeted g execution mutates g step progress while preserving active-f state");
};
