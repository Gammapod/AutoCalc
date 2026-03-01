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

const findKeypadIndex = (state: GameState, key: Key): number =>
  state.ui.keyLayout.findIndex((cell) => cell.kind === "key" && cell.key === key);

export const runReducerUnlockTests = (): void => {
  let totalGateState = initialState();
  for (let i = 0; i < 39; i += 1) {
    totalGateState = press(totalGateState, "++");
  }
  assert.equal(totalGateState.calculator.total.kind === "rational" ? totalGateState.calculator.total.value.num : null, 39n, "sanity check: total reaches 39");
  assert.equal(totalGateState.unlocks.valueExpression["4"], false, "digit 4 stays locked below total 40");
  assert.equal(totalGateState.unlocks.utilities.UNDO, true, "UNDO unlocks at total >= 20");
  totalGateState = press(totalGateState, "++");
  assert.equal(totalGateState.calculator.total.kind === "rational" ? totalGateState.calculator.total.value.num : null, 40n, "sanity check: total reaches 40");
  assert.equal(totalGateState.unlocks.valueExpression["4"], true, "digit 4 unlocks at total >= 40");

  const undoBeforePress = press(initialState(), "UNDO");
  assert.equal(undoBeforePress.unlocks.slotOperators["-"], false, "- remains locked before UNDO is unlocked");

  let undoGateState = initialState();
  for (let i = 0; i < 20; i += 1) {
    undoGateState = press(undoGateState, "++");
  }
  assert.equal(undoGateState.unlocks.utilities.UNDO, true, "UNDO unlocks when total reaches 20");
  const afterFirstUndo = press(undoGateState, "UNDO");
  assert.equal(afterFirstUndo.unlocks.slotOperators["-"], true, "- unlocks on first UNDO press");

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

  assert.equal(state.unlocks.valueExpression["1"], false, "digit 1 starts locked");
  assert.equal(state.unlocks.execution["="], false, "equals starts locked");
  assert.equal(state.unlocks.uiUnlocks.storageVisible, false, "storage starts hidden");

  for (let i = 0; i < 11; i += 1) {
    state = press(state, "++");
  }
  assert.deepEqual(state.calculator.total, r(11n), "increment reaches 11");
  assert.equal(state.unlocks.execution["="], true, "equals unlocks at total 11");
  assert.equal(state.unlocks.uiUnlocks.storageVisible, true, "storage unlocks at total 11");

  state = press(state, "=");
  state = press(state, "=");
  state = press(state, "=");
  state = press(state, "=");
  assert.equal(state.unlocks.slotOperators["+"], true, "plus unlocks on equal run of 4");
  assert.equal(state.ui.keypadColumns, 2, "equal-run rule upgrades columns");
  assert.equal(findKeypadIndex(state, "+"), 0, "plus moves to R1C2 after first column upgrade");

  state = press(state, "+");
  assert.equal(state.unlocks.valueExpression["1"], true, "digit 1 unlocks on first plus press");
  assert.equal(state.ui.keypadColumns, 3, "first plus press upgrades columns");
  assert.equal(findKeypadIndex(state, "1"), 0, "digit 1 moves to R1C3");

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
  assert.equal(withIncrementingSuffix.ui.keypadRows, 2, "increment-run rule upgrades rows");
  assert.equal(findKeypadIndex(withIncrementingSuffix, "C"), 2, "C moves to R2C1");
  state = withIncrementingSuffix;

  const beforeC = state.completedUnlockIds.length;
  state = press(state, "C");
  assert.equal(state.completedUnlockIds.includes(CHECKLIST_UNLOCK_ID), true, "first successful C press unlocks checklist");
  assert.equal(state.completedUnlockIds.length, beforeC + 1, "checklist unlock id recorded once");
};
