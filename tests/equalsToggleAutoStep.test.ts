import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
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
        ...executionUnlockPatch([["=", true]]),
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
      operationSlots: [{ operator: op("+"), operand: 3n }],
      draftingSlot: null,
      rollEntries: [],
    },
  };

  const withEqualsToggleOn = reducer(base, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_EQUALS_FLAG });
  assert.equal(Boolean(withEqualsToggleOn.ui.buttonFlags[EXECUTION_PAUSE_EQUALS_FLAG]), true, "= toggle enables equals auto-step mode");

  const afterAutoTick = reducer(withEqualsToggleOn, { type: "AUTO_STEP_TICK" });
  assert.equal(Boolean(afterAutoTick.ui.buttonFlags[EXECUTION_PAUSE_EQUALS_FLAG]), false, "= toggle auto-clears after terminal roll commit");
  assert.equal(afterAutoTick.calculator.rollEntries.length > 0, true, "AUTO_STEP_TICK committed a roll update");

  const pressEqualsStillExecutes = reducer(base, { type: "PRESS_KEY", key: execution("=") });
  assert.equal(pressEqualsStillExecutes.calculator.rollEntries.length > 0, true, "direct PRESS_KEY '=' retains execution semantics");
};
