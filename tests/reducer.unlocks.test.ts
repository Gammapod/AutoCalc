import assert from "node:assert/strict";
import { reducer } from "../src/domain/reducer.js";
import { initialState } from "../src/domain/state.js";
import { applyUnlocks } from "../src/domain/unlocks.js";
import type { UnlockDefinition } from "../src/domain/types.js";
import type { GameState, Key } from "../src/domain/types.js";

const press = (state: GameState, key: Key): GameState => reducer(state, { type: "PRESS_KEY", key });

export const runReducerUnlockTests = (): void => {
  const state = initialState();

  assert.equal(state.unlocks.digits["1"], true, "digit 1 starts unlocked");
  assert.ok(
    Object.entries(state.unlocks.digits)
      .filter(([digit]) => digit !== "1")
      .every(([, isUnlocked]) => !isUnlocked),
    "all other digits start locked",
  );
  assert.equal(state.unlocks.slotOperators["+"], false, "plus starts locked");
  assert.equal(state.unlocks.utilities.C, false, "C starts locked");
  assert.equal(state.unlocks.utilities.CE, false, "CE starts locked");
  assert.equal(state.unlocks.execution["="], false, "equals starts locked");
  assert.equal(state.unlocks.maxTotalDigits, 2, "total starts with a 2-digit cap");

  const keys: Key[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "C", "CE", "="];
  let nextState = state;
  for (const key of keys) {
    nextState = press(nextState, key);
  }

  assert.equal(nextState.calculator.total, 1n, "pressing unlocked 1 updates total");
  nextState = press(nextState, "1");
  assert.equal(nextState.calculator.total, 11n, "second digit is accepted under 2-digit cap");
  assert.equal(nextState.unlocks.slotOperators["+"], true, "plus unlocks when total first reaches 11");
  assert.ok(nextState.completedUnlockIds.includes("unlock_plus_on_total_11"), "plus unlock id is recorded");
  nextState = press(nextState, "1");
  assert.equal(nextState.calculator.total, 11n, "third digit is blocked by 2-digit cap");
  assert.deepEqual(nextState.calculator.roll, [], "roll remains unchanged without equals");
  assert.equal(nextState.calculator.operationSlots.length, 0, "no slots are created without pressing plus");
  assert.equal(nextState.unlocks.execution["="], false, "equals remains locked before [+ 1]");

  nextState = press(nextState, "+");
  assert.equal(nextState.calculator.draftingSlot?.operator, "+", "plus starts drafting an operation slot");
  nextState = press(nextState, "1");
  assert.equal(nextState.calculator.draftingSlot?.operandInput, "1", "drafting slot captures operand input");
  assert.equal(nextState.unlocks.execution["="], true, "equals unlocks when operation is [+ 1]");
  assert.ok(
    nextState.completedUnlockIds.includes("unlock_equals_on_operation_plus_1"),
    "equals unlock id is recorded",
  );
  nextState = press(nextState, "=");
  assert.deepEqual(
    nextState.calculator.roll,
    [11n, 12n],
    "first equals with operations seeds roll with baseline total and first result",
  );
  nextState = press(nextState, "=");
  assert.deepEqual(
    nextState.calculator.roll,
    [11n, 12n, 13n],
    "subsequent equals appends only the resulting total",
  );

  const identityEqualsState: GameState = {
    ...initialState(),
    unlocks: {
      ...initialState().unlocks,
      execution: {
        ...initialState().unlocks.execution,
        "=": true,
      },
    },
    calculator: {
      ...initialState().calculator,
      total: 11n,
    },
  };
  const afterIdentityEquals = press(identityEqualsState, "=");
  assert.deepEqual(afterIdentityEquals.calculator.roll, [11n], "identity equals appends one unchanged total");

  const increaseDigitCapUnlock: UnlockDefinition = {
    id: "increase_digit_cap_once",
    description: "increase max total digits by one",
    predicate: { type: "roll_length_at_least", length: 1 },
    effect: { type: "increase_max_total_digits", amount: 1 },
    once: true,
  };

  const withRollProgress: GameState = {
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      total: 11n,
      roll: [11n],
      operationSlots: [],
      draftingSlot: null,
    },
  };
  const withIncreasedCap = applyUnlocks(withRollProgress, [increaseDigitCapUnlock]);
  assert.equal(withIncreasedCap.unlocks.maxTotalDigits, 3, "unlock increases max total digits");

  const withIncreasedCapReadyForInput: GameState = {
    ...withIncreasedCap,
    calculator: {
      ...withIncreasedCap.calculator,
      roll: [],
    },
  };
  const afterUnlockPress = press(withIncreasedCapReadyForInput, "1");
  assert.equal(afterUnlockPress.calculator.total, 111n, "third digit is accepted after cap unlock");

  const repeatableUnlock: UnlockDefinition = {
    id: "repeatable_unlock_utility_c",
    description: "repeatable unlock for C",
    predicate: { type: "roll_length_at_least", length: 1 },
    effect: { type: "unlock_utility", key: "C" },
    once: false,
  };

  const unlockState: GameState = {
    ...state,
    calculator: {
      ...state.calculator,
      roll: [1n],
    },
  };

  const firstApply = applyUnlocks(unlockState, [repeatableUnlock]);
  const secondApply = applyUnlocks(firstApply, [repeatableUnlock]);
  assert.equal(secondApply.unlocks.utilities.C, true, "repeatable unlock effect still applies");
  assert.deepEqual(
    secondApply.completedUnlockIds,
    [repeatableUnlock.id],
    "completed unlock ids stay unique for repeatable unlocks",
  );

  const rollSuffixUnlock: UnlockDefinition = {
    id: "unlock_c_on_roll_suffix",
    description: "unlock C when roll ends with [11, 12, 13, 14]",
    predicate: { type: "roll_ends_with_sequence", sequence: [11n, 12n, 13n, 14n] },
    effect: { type: "unlock_utility", key: "C" },
    once: true,
  };

  const withMatchingSuffix: GameState = {
    ...state,
    calculator: {
      ...state.calculator,
      roll: [3n, 11n, 12n, 13n, 14n],
    },
  };
  const afterSuffixUnlock = applyUnlocks(withMatchingSuffix, [rollSuffixUnlock]);
  assert.equal(afterSuffixUnlock.unlocks.utilities.C, true, "suffix predicate unlocks C on longer rolls");
  assert.ok(afterSuffixUnlock.completedUnlockIds.includes(rollSuffixUnlock.id), "suffix unlock id is recorded");

  const withNonMatchingSuffix: GameState = {
    ...state,
    calculator: {
      ...state.calculator,
      roll: [11n, 12n, 13n, 15n],
    },
  };
  const afterNonMatch = applyUnlocks(withNonMatchingSuffix, [rollSuffixUnlock]);
  assert.equal(afterNonMatch.unlocks.utilities.C, false, "suffix predicate does not unlock on non-matching suffix");
};
