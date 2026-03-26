import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { toNanCalculatorValue } from "../src/domain/calculatorValue.js";
import { reducer } from "../src/domain/reducer.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { EXECUTION_PAUSE_EQUALS_FLAG } from "../src/domain/state.js";
import type { GameState } from "../src/domain/types.js";
import { execution, executionUnlockPatch, op } from "./support/keyCompat.js";
import { legacyInitialState } from "./support/legacyState.js";

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n) => ({ kind: "rational" as const, value: rv(num, den) });

export const runEqualsToggleAutoStepTests = (): void => {
  const base: GameState = {
    ...legacyInitialState(),
    unlocks: {
      ...legacyInitialState().unlocks,
      maxSlots: 2,
      execution: {
        ...legacyInitialState().unlocks.execution,
        ...executionUnlockPatch([["exec_equals", true]]),
      },
    },
    ui: {
      ...legacyInitialState().ui,
      keyLayout: [
        { kind: "key", key: KEY_ID.exec_equals, behavior: { type: "toggle_flag", flag: EXECUTION_PAUSE_EQUALS_FLAG } },
      ],
      keypadColumns: 1,
      keypadRows: 1,
      buttonFlags: {},
    },
    calculator: {
      ...legacyInitialState().calculator,
      total: r(2n),
      operationSlots: [{ operator: op("op_add"), operand: 3n }],
      draftingSlot: null,
      rollEntries: [],
    },
  };

  const withEqualsToggleOn = reducer(base, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_EQUALS_FLAG });
  assert.equal(Boolean(withEqualsToggleOn.ui.buttonFlags[EXECUTION_PAUSE_EQUALS_FLAG]), true, "= toggle enables equals auto-step mode");

  const afterAutoTick = reducer(withEqualsToggleOn, { type: "AUTO_STEP_TICK" });
  assert.equal(Boolean(afterAutoTick.ui.buttonFlags[EXECUTION_PAUSE_EQUALS_FLAG]), false, "= toggle auto-clears after terminal roll commit");
  assert.equal(afterAutoTick.calculator.rollEntries.length > 0, true, "AUTO_STEP_TICK committed a roll update");

  const fromLegacyPress = reducer(base, { type: "PRESS_KEY", key: execution("exec_equals") });
  assert.equal(
    Boolean(fromLegacyPress.ui.buttonFlags[EXECUTION_PAUSE_EQUALS_FLAG]),
    true,
    "legacy PRESS_KEY '=' is normalized into equals-toggle activation",
  );

  const multiStageSource: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      total: r(1n),
      operationSlots: [{ operator: op("op_add"), operand: 2n }, { operator: op("op_mul"), operand: 3n }],
      rollEntries: [],
      stepProgress: {
        active: false,
        seedTotal: null,
        currentTotal: null,
        nextSlotIndex: 0,
        executedSlotResults: [],
      },
    },
  };
  const multiOn = reducer(multiStageSource, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_EQUALS_FLAG });
  const multiTick1 = reducer(multiOn, { type: "AUTO_STEP_TICK" });
  assert.equal(Boolean(multiTick1.ui.buttonFlags[EXECUTION_PAUSE_EQUALS_FLAG]), true, "equals toggle remains active during intermediate auto-step");
  assert.equal(multiTick1.calculator.rollEntries.length, 0, "intermediate auto-step keeps roll preview-only");
  const multiTick2 = reducer(multiTick1, { type: "AUTO_STEP_TICK" });
  assert.equal(Boolean(multiTick2.ui.buttonFlags[EXECUTION_PAUSE_EQUALS_FLAG]), false, "equals toggle clears on terminal auto-step commit");
  assert.deepEqual(multiTick2.calculator.total, r(9n), "multi-stage auto-step reaches terminal total");

  const errorSource: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      total: r(10n),
      operationSlots: [{ operator: op("op_div"), operand: 0n }],
      rollEntries: [],
      stepProgress: {
        active: false,
        seedTotal: null,
        currentTotal: null,
        nextSlotIndex: 0,
        executedSlotResults: [],
      },
    },
  };
  const errorOn = reducer(errorSource, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_EQUALS_FLAG });
  const errorTick = reducer(errorOn, { type: "AUTO_STEP_TICK" });
  assert.equal(Boolean(errorTick.ui.buttonFlags[EXECUTION_PAUSE_EQUALS_FLAG]), false, "equals toggle clears on terminal error commit");
  assert.deepEqual(errorTick.calculator.total, toNanCalculatorValue(), "division-by-zero path still commits terminal NaN");

  const emptyPlanSource: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      total: r(0n),
      operationSlots: [],
      draftingSlot: null,
      rollEntries: [],
      stepProgress: {
        active: false,
        seedTotal: null,
        currentTotal: null,
        nextSlotIndex: 0,
        executedSlotResults: [],
      },
    },
  };
  const emptyPlanOn = reducer(emptyPlanSource, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_EQUALS_FLAG });
  const emptyPlanTick = reducer(emptyPlanOn, { type: "AUTO_STEP_TICK" });
  assert.equal(
    Boolean(emptyPlanTick.ui.buttonFlags[EXECUTION_PAUSE_EQUALS_FLAG]),
    false,
    "equals toggle clears when auto-step falls back to direct equals on an empty execution plan",
  );
  assert.deepEqual(emptyPlanTick.calculator.total, r(0n), "empty execution plan keeps total at 0");
  assert.equal(emptyPlanTick.calculator.rollEntries.length > 0, true, "empty execution plan still commits a terminal roll entry");
};

