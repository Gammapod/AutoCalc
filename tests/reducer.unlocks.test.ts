import assert from "node:assert/strict";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { reducer } from "../src/domain/reducer.js";
import { CHECKLIST_UNLOCK_ID, initialState } from "../src/domain/state.js";
import { applyUnlocks } from "../src/domain/unlocks.js";
import type { GameState, Key, RollEntry } from "../src/domain/types.js";

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue(rv(num, den));
const re = (...values: RollEntry["y"][]): RollEntry[] => values.map((y) => ({ y }));
const press = (state: GameState, key: Key): GameState => reducer(state, { type: "PRESS_KEY", key });
const withTwoDigitRange = (state: GameState): GameState =>
  reducer(state, {
    type: "LAMBDA_SET_OVERRIDE_DELTA",
    value: 1,
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
        rollEntries: re(r(3n), r(0n), r(5n)),
      },
    },
    unlockCatalog,
  );
  assert.equal(zeroRollUnlocked.unlocks.valueExpression["0"], true, "0 unlocks when roll contains 0");

  const negRollUnlocked = applyUnlocks(
    {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        rollEntries: re(r(5n), r(-5n), r(5n), r(-5n), r(5n), r(-5n), r(5n)),
      },
    },
    unlockCatalog,
  );
  assert.equal(negRollUnlocked.unlocks.valueExpression.NEG, true, "NEG unlocks on alternating-sign constant-abs run of 7");
  const negRollUnlockedTwice = applyUnlocks(negRollUnlocked, unlockCatalog);
  assert.equal(
    negRollUnlockedTwice.completedUnlockIds.filter((id) => id === "unlock_neg_on_alt_sign_abs_run_7").length,
    1,
    "NEG unlock id records once",
  );

  const multiplyRunUnlocked = applyUnlocks(
    {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        rollEntries: re(r(5n), r(12n), r(19n), r(26n), r(33n), r(40n), r(47n)),
      },
    },
    unlockCatalog,
  );
  assert.equal(multiplyRunUnlocked.unlocks.slotOperators["*"], true, "* unlocks on constant-step run with abs(step) > 1");
  const multiplyRunUnlockedTwice = applyUnlocks(multiplyRunUnlocked, unlockCatalog);
  assert.equal(
    multiplyRunUnlockedTwice.completedUnlockIds.filter((id) => id === "unlock_mul_on_constant_step_gt1_run_7").length,
    1,
    "* unlock id records once",
  );

  const ceOnDivByZero = applyUnlocks(
    {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        rollEntries: [{ y: r(0n), error: { code: "n/0", kind: "division_by_zero" } }],
      },
    },
    unlockCatalog,
  );
  assert.equal(ceOnDivByZero.unlocks.utilities.CE, true, "CE unlocks on first divide-by-zero error");
  const ceOnDivByZeroTwice = applyUnlocks(ceOnDivByZero, unlockCatalog);
  assert.equal(
    ceOnDivByZeroTwice.completedUnlockIds.filter((id) => id === "unlock_ce_on_first_division_by_zero").length,
    1,
    "CE unlock id records once",
  );

  const hashSequenceUnlocked = applyUnlocks(
    {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        rollEntries: re(r(47n), r(40n), r(33n), r(26n), r(19n), r(12n), r(5n)),
      },
    },
    unlockCatalog,
  );
  assert.equal(hashSequenceUnlocked.unlocks.slotOperators["#"], true, "# unlocks on exact sequence 47..5 step -7");
  const hashSequenceUnlockedTwice = applyUnlocks(hashSequenceUnlocked, unlockCatalog);
  assert.equal(
    hashSequenceUnlockedTwice.completedUnlockIds.filter((id) => id === "unlock_hash_on_exact_run_47_to_5_by_7").length,
    1,
    "# unlock id records once",
  );

  const moduloByEuclidEquivalenceUnlocked = applyUnlocks(
    {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: r(10n),
        operationSlots: [{ operator: "#", operand: 4n }],
      },
    },
    unlockCatalog,
  );
  assert.equal(
    moduloByEuclidEquivalenceUnlocked.unlocks.slotOperators["\u27E1"],
    true,
    "⟡ unlocks when first # operation evaluates equivalent to modulo baseline",
  );
  const moduloByEuclidEquivalenceUnlockedTwice = applyUnlocks(moduloByEuclidEquivalenceUnlocked, unlockCatalog);
  assert.equal(
    moduloByEuclidEquivalenceUnlockedTwice.completedUnlockIds.filter(
      (id) => id === "unlock_mod_on_difficult_first_euclid_equivalence",
    ).length,
    1,
    "⟡ difficult unlock id records once",
  );

  let state = withTwoDigitRange(initialState());
  for (let i = 0; i < 7; i += 1) {
    state = press(state, "++");
  }
  assert.equal(state.unlocks.slotOperators["+"], true, "plus unlocks on incrementing run of 7");
  assert.equal(findKeypadIndex(state, "+"), -1, "plus remains off-keypad without automatic column upgrades");

  while (state.calculator.total.kind === "rational" && state.calculator.total.value.num < 10n) {
    state = press(state, "++");
  }
  assert.equal(state.unlocks.valueExpression["1"], true, "digit 1 unlocks when first two-digit total is produced");

  let overflowState = initialState();
  for (let i = 0; i < 9; i += 1) {
    overflowState = press(overflowState, "++");
  }
  const eqBeforeOverflow = overflowState.unlocks.execution["="];
  overflowState = press(overflowState, "++");
  assert.equal(eqBeforeOverflow, false, "equals remains locked before overflow equal-run");
  assert.equal(overflowState.unlocks.execution["="], true, "equals unlocks on first equal run of 2 values");
  assert.equal(overflowState.unlocks.uiUnlocks.storageVisible, true, "storage is visible by default");

  const afterLockedMinus = press(overflowState, "--");
  assert.deepEqual(afterLockedMinus, overflowState, "locked -- remains a no-op");
  assert.equal(afterLockedMinus.unlocks.execution["--"], false, "-- remains locked without decrementing run");
  assert.equal(afterLockedMinus.unlocks.slotOperators["-"], false, "- remains locked without decrementing run");

  state = reducer(state, { type: "ALLOCATOR_ALLOCATE_PRESSED" });
  assert.equal(state.unlocks.utilities.C, true, "C unlocks on first allocator Allocate press");
  assert.equal(findKeypadIndex(state, "C"), -1, "C remains off-keypad without automatic row upgrades");

  const beforeC = state.completedUnlockIds.length;
  state = press(state, "C");
  assert.equal(state.completedUnlockIds.includes(CHECKLIST_UNLOCK_ID), true, "first successful C press unlocks checklist");
  assert.equal(state.completedUnlockIds.length, beforeC + 1, "checklist unlock id recorded once");
};
