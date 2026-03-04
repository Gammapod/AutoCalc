import assert from "node:assert/strict";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { reducer } from "../src/domain/reducer.js";
import { CHECKLIST_UNLOCK_ID, initialState } from "../src/domain/state.js";
import { applyUnlocks } from "../src/domain/unlocks.js";
import type { GameState, Key } from "../src/domain/types.js";

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue(rv(num, den));
const press = (state: GameState, key: Key): GameState => reducer(state, { type: "PRESS_KEY", key });
const withTwoDigitRange = (state: GameState): GameState =>
  reducer(reducer(state, { type: "ALLOCATOR_ADD_MAX_POINTS", amount: 1 }), {
    type: "ALLOCATOR_ADJUST",
    field: "range",
    delta: 1,
  });

const findKeypadIndex = (state: GameState, key: Key): number =>
  state.ui.keyLayout.findIndex((cell) => cell.kind === "key" && cell.key === key);

export const runReducerUnlockTests = (): void => {
  const base = initialState();
  assert.equal(base.unlocks.execution["--"], false, "-- starts locked");
  assert.equal(base.unlocks.slotOperators["-"], false, "- starts locked");
  assert.equal(base.unlocks.utilities.UNDO, false, "UNDO starts locked");

  let totalGateState = withTwoDigitRange(base);
  for (let i = 0; i < 39; i += 1) {
    totalGateState = press(totalGateState, "++");
  }
  assert.equal(totalGateState.calculator.total.kind === "rational" ? totalGateState.calculator.total.value.num : null, 39n, "sanity check: total reaches 39");
  assert.equal(totalGateState.unlocks.valueExpression["4"], false, "digit 4 stays locked below total 40");
  totalGateState = press(totalGateState, "++");
  assert.equal(totalGateState.calculator.total.kind === "rational" ? totalGateState.calculator.total.value.num : null, 40n, "sanity check: total reaches 40");
  assert.equal(totalGateState.unlocks.valueExpression["4"], true, "digit 4 unlocks at total >= 40");

  let allocatorPointGateState = initialState();
  const allocatorPointsBefore = allocatorPointGateState.allocator.maxPoints;
  for (let i = 0; i < 9; i += 1) {
    allocatorPointGateState = press(allocatorPointGateState, "++");
  }
  assert.equal(
    allocatorPointGateState.allocator.maxPoints,
    allocatorPointsBefore + 1,
    "maxPoints increases by 1 when total reaches at least 9",
  );
  for (let i = 0; i < 5; i += 1) {
    allocatorPointGateState = press(allocatorPointGateState, "++");
  }
  assert.equal(
    allocatorPointGateState.allocator.maxPoints,
    allocatorPointsBefore + 1,
    "allocator maxPoints unlock applies once",
  );

  const undoFromReturn = reducer(initialState(), { type: "ALLOCATOR_RETURN_PRESSED" });
  assert.equal(undoFromReturn.allocatorReturnPressCount, 1, "allocator RETURN press count increments");
  assert.equal(undoFromReturn.unlocks.utilities.UNDO, true, "UNDO unlocks on first allocator RETURN press");

  const zeroRollUnlocked = applyUnlocks(
    {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        roll: [r(3n), r(0n), r(5n)],
      },
    },
    unlockCatalog,
  );
  assert.equal(zeroRollUnlocked.unlocks.valueExpression["0"], true, "0 unlocks when roll contains 0");

  let state = initialState();
  for (let i = 0; i < 7; i += 1) {
    state = press(state, "++");
  }
  assert.equal(state.unlocks.slotOperators["+"], true, "plus unlocks on incrementing run of 7");
  assert.equal(findKeypadIndex(state, "+"), -1, "plus remains off-keypad without automatic column upgrades");

  while (state.calculator.total.kind === "rational" && state.calculator.total.value.num < 9n) {
    state = press(state, "++");
  }
  assert.equal(state.unlocks.valueExpression["1"], true, "digit 1 unlocks when total reaches at least 9");

  const eqBeforeOverflow = state.unlocks.execution["="];
  state = press(state, "++");
  assert.equal(eqBeforeOverflow, false, "equals remains locked before overflow equal-run");
  assert.equal(state.unlocks.execution["="], true, "equals unlocks on first equal run of 2 values");
  assert.equal(state.unlocks.uiUnlocks.storageVisible, true, "storage still unlocks on first overflow");

  const afterLockedMinus = press(state, "--");
  assert.deepEqual(afterLockedMinus, state, "locked -- remains a no-op");
  assert.equal(afterLockedMinus.unlocks.execution["--"], false, "-- remains locked without decrementing run");
  assert.equal(afterLockedMinus.unlocks.slotOperators["-"], false, "- remains locked without decrementing run");

  const withIncrementingSuffix = applyUnlocks(
    {
      ...state,
      calculator: {
        ...state.calculator,
        roll: [r(11n), r(12n), r(13n), r(14n)],
      },
    },
    unlockCatalog,
  );
  assert.equal(withIncrementingSuffix.unlocks.utilities.C, true, "C unlocks on incrementing run of 4");
  assert.equal(findKeypadIndex(withIncrementingSuffix, "C"), -1, "C remains off-keypad without automatic row upgrades");
  state = withIncrementingSuffix;

  const beforeC = state.completedUnlockIds.length;
  state = press(state, "C");
  assert.equal(state.completedUnlockIds.includes(CHECKLIST_UNLOCK_ID), true, "first successful C press unlocks checklist");
  assert.equal(state.completedUnlockIds.length, beforeC + 1, "checklist unlock id recorded once");
};
