import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { applyKeyAction } from "../src/domain/reducer.input.js";
import { reducer } from "../src/domain/reducer.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { DELTA_RANGE_CLAMP_FLAG, EXECUTION_PAUSE_FLAG } from "../src/domain/state.js";
import type { GameState } from "../src/domain/types.js";
import { legacyInitialState } from "./support/legacyState.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });

export const runReducerWrapTailExecutionTests = (): void => {
  const fullyUnlocked = reducer(legacyInitialState(), { type: "UNLOCK_ALL" });

  const stepThroughWrapSource: GameState = {
    ...fullyUnlocked,
    completedUnlockIds: [],
    calculators: undefined,
    calculatorOrder: undefined,
    activeCalculatorId: undefined,
    perCalculatorCompletedUnlockIds: undefined,
    sessionControlProfiles: undefined,
    ui: {
      ...fullyUnlocked.ui,
      keyLayout: [
        { kind: "key", key: k("exec_step_through") },
        { kind: "key", key: k("toggle_delta_range_clamp"), behavior: { type: "toggle_flag", flag: DELTA_RANGE_CLAMP_FLAG } },
      ],
      keypadColumns: 2,
      keypadRows: 1,
    },
    settings: {
      ...fullyUnlocked.settings,
      wrapper: "delta_range_clamp",
    },
    unlocks: {
      ...fullyUnlocked.unlocks,
      maxTotalDigits: 2,
    },
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(99n),
      operationSlots: [{ operator: op("op_add"), operand: 1n }],
    },
  };

  const afterFirstWrapStep = applyKeyAction(stepThroughWrapSource, "exec_step_through");
  assert.equal(afterFirstWrapStep.calculator.stepProgress.active, true, "step-through keeps session active with trailing wrap stage");
  assert.equal(afterFirstWrapStep.calculator.stepProgress.nextSlotIndex, 1, "cursor advances to synthetic wrap stage");
  assert.deepEqual(afterFirstWrapStep.calculator.stepProgress.currentTotal, r(100n), "first step stores unwrapped slot result");
  assert.equal(afterFirstWrapStep.calculator.rollEntries.length, 0, "non-terminal wrap stage path does not append roll entries");

  const afterSecondWrapStep = applyKeyAction(afterFirstWrapStep, "exec_step_through");
  assert.equal(afterSecondWrapStep.calculator.stepProgress.active, false, "terminal wrap stage clears session");
  assert.deepEqual(afterSecondWrapStep.calculator.total, r(-98n), "terminal wrap stage applies delta wrapping");
  assert.equal(afterSecondWrapStep.calculator.rollEntries.length, 2, "terminal wrap stage commits seed and final step once");

  const equalsFromPartialWrap = applyKeyAction(afterFirstWrapStep, "exec_equals");
  assert.deepEqual(equalsFromPartialWrap.calculator.total, r(-98n), "equals from partial run includes pending wrap stage");
  assert.equal(equalsFromPartialWrap.calculator.stepProgress.active, false, "equals from partial with wrap clears session");

  const autoStepWrapSeed: GameState = {
    ...fullyUnlocked,
    completedUnlockIds: [],
    calculators: undefined,
    calculatorOrder: undefined,
    activeCalculatorId: undefined,
    perCalculatorCompletedUnlockIds: undefined,
    sessionControlProfiles: undefined,
    ui: {
      ...fullyUnlocked.ui,
      keyLayout: [
        { kind: "key", key: k("exec_equals") },
        { kind: "key", key: k("toggle_delta_range_clamp"), behavior: { type: "toggle_flag", flag: DELTA_RANGE_CLAMP_FLAG } },
      ],
      keypadColumns: 2,
      keypadRows: 1,
      buttonFlags: {
        ...fullyUnlocked.ui.buttonFlags,
        [EXECUTION_PAUSE_FLAG]: true,
      },
    },
    settings: {
      ...fullyUnlocked.settings,
      wrapper: "delta_range_clamp",
    },
    unlocks: {
      ...fullyUnlocked.unlocks,
      maxTotalDigits: 2,
    },
    calculator: {
      ...fullyUnlocked.calculator,
      total: r(99n),
      operationSlots: [{ operator: op("op_add"), operand: 1n }],
    },
  };

  const autoStepWrapTick1 = reducer(autoStepWrapSeed, { type: "AUTO_STEP_TICK" });
  assert.equal(autoStepWrapTick1.calculator.stepProgress.active, true, "AUTO_STEP_TICK keeps session active when wrap tail remains");
  assert.deepEqual(autoStepWrapTick1.calculator.stepProgress.currentTotal, r(100n), "first AUTO_STEP_TICK stores pre-wrap result");
  assert.equal(autoStepWrapTick1.calculator.rollEntries.length, 0, "first AUTO_STEP_TICK with wrap tail does not append roll rows");

  const autoStepWrapTick2 = reducer(autoStepWrapTick1, { type: "AUTO_STEP_TICK" });
  assert.equal(autoStepWrapTick2.calculator.stepProgress.active, false, "terminal wrap AUTO_STEP_TICK clears step progress");
  assert.deepEqual(autoStepWrapTick2.calculator.total, r(-98n), "terminal wrap AUTO_STEP_TICK applies wrapping");
  assert.equal(autoStepWrapTick2.calculator.rollEntries.length, 2, "terminal wrap AUTO_STEP_TICK commits seed and final step once");
};

