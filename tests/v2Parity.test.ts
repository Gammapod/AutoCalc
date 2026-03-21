import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import type { Action, GameState } from "../src/domain/types.js";
import { compareParity } from "../src/compat/parityHarness.js";
import { executeCommand } from "../src/domain/commands.js";
import { getCalculatorMode } from "../src/domain/modes.js";
import { k, op } from "./support/keyCompat.js";

const runSequence = (actions: Action[]): { legacy: GameState; v2: GameState } => {
  let legacy = initialState();
  let v2 = initialState();

  for (const action of actions) {
    legacy = reducer(legacy, action);
    const commandResult = executeCommand(v2, { type: "DispatchAction", action });
    v2 = commandResult.state;
    assert.equal(commandResult.events.length, 1, "every action produces one domain event");
  }

  return { legacy, v2 };
};

export const runV2ParityTests = (): void => {
  const actions: Action[] = [
    { type: "PRESS_KEY", key: k("digit_1") },
    { type: "PRESS_KEY", key: k("digit_1") },
    { type: "PRESS_KEY", key: k("op_add") },
    { type: "PRESS_KEY", key: k("digit_1") },
    { type: "PRESS_KEY", key: k("exec_equals") },
    { type: "PRESS_KEY", key: k("exec_equals") },
    { type: "PRESS_KEY", key: k("digit_1") },
    { type: "PRESS_KEY", key: k("util_clear_all") },
    { type: "MOVE_KEY_SLOT", fromIndex: 1, toIndex: 0 },
    { type: "SWAP_KEY_SLOTS", firstIndex: 0, secondIndex: 1 },
    { type: "SET_KEYPAD_DIMENSIONS", columns: 5, rows: 4 },
    { type: "UPGRADE_KEYPAD_ROW" },
    { type: "UPGRADE_KEYPAD_COLUMN" },
    { type: "ALLOCATOR_SET_MAX_POINTS", value: 12 },
    { type: "ALLOCATOR_ADJUST", field: "width", delta: 1 },
    { type: "ALLOCATOR_ADJUST", field: "height", delta: 1 },
    { type: "ALLOCATOR_ADJUST", field: "range", delta: 1 },
    { type: "ALLOCATOR_ADD_MAX_POINTS", amount: 2 },
    { type: "ALLOCATOR_ADJUST", field: "speed", delta: 1 },
    { type: "ALLOCATOR_ADJUST", field: "slots", delta: 1 },
    { type: "UNLOCK_ALL" },
  ];

  const { legacy, v2 } = runSequence(actions);
  const parity = compareParity(legacy, v2);
  assert.equal(parity.ok, true, `v2 state/read-model parity holds (${JSON.stringify(parity.mismatches)})`);

  assert.equal(getCalculatorMode(initialState()), "idle", "mode idle when no draft/roll");
  assert.equal(
    getCalculatorMode({
      ...initialState(),
      calculator: { ...initialState().calculator, draftingSlot: { operator: op("op_add"), operandInput: "", isNegative: false } },
    }),
    "drafting",
    "mode drafting with active drafting slot",
  );
  assert.equal(getCalculatorMode(v2), v2.calculator.rollEntries.length > 0 ? "rolled" : "idle", "rolled mode tracks roll presence");
};



