import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { reducer } from "../src/domain/reducer.js";
import { DELTA_RANGE_CLAMP_FLAG, EXECUTION_PAUSE_EQUALS_FLAG } from "../src/domain/state.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { materializeCalculatorG } from "../src/domain/multiCalculator.js";
import type { Action, GameState } from "../src/domain/types.js";
import { legacyInitialState } from "./support/legacyState.js";
import { executionUnlockPatch, op } from "./support/keyCompat.js";
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
        ...executionUnlockPatch([["exec_equals", true], ["exec_step_through", true]]),
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
  assert.equal(stepped.calculator.stepProgress.active, true, "step-through remains preview-only before wrap-tail terminal stage");
  assert.deepEqual(stepped.calculator.stepProgress.currentTotal, r(100n), "step-through preview stores pre-wrap intermediate total");
  assert.equal(stepped.calculator.rollEntries.length, 0, "step-through preview does not append roll rows");

  const terminalFromPreviewStep = reducer(stepped, { type: "PRESS_KEY", key: KEY_ID.exec_step_through });
  assert.equal(terminalFromPreviewStep.calculator.stepProgress.active, false, "terminal step-through path clears step progress");
  assert.deepEqual(terminalFromPreviewStep.calculator.total, r(-98n), "terminal step-through path applies pending wrap-tail");
  assert.equal(
    terminalFromPreviewStep.calculator.rollEntries.length,
    2,
    "terminal step-through path commits seed + terminal row exactly once",
  );

  const withEqualsToggle = reducer(base, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_EQUALS_FLAG });
  const autoTickPreview = reducer(withEqualsToggle, { type: "AUTO_STEP_TICK" });
  assert.equal(autoTickPreview.calculator.stepProgress.active, true, "equals-toggle auto-step keeps progress active on preview stage");
  assert.equal(autoTickPreview.calculator.rollEntries.length, 0, "equals-toggle preview stage remains non-committing");
  const autoTickTerminal = reducer(autoTickPreview, { type: "AUTO_STEP_TICK" });
  assert.equal(autoTickTerminal.calculator.stepProgress.active, false, "equals-toggle auto-step clears progress at terminal stage");
  assert.deepEqual(autoTickTerminal.calculator.total, r(-98n), "equals-toggle auto-step terminal total matches wrap-tail semantics");
  assert.equal(autoTickTerminal.calculator.rollEntries.length, 2, "equals-toggle auto-step terminal commit remains single seed/result pair");

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
      trace.push({ type: "PRESS_KEY", key: KEY_ID.exec_step_through }, { type: "PRESS_KEY", key: KEY_ID.exec_step_through });
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
