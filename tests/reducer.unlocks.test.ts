import assert from "node:assert/strict";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { reducer } from "../src/domain/reducer.js";
import { CHECKLIST_UNLOCK_ID, initialState } from "../src/domain/state.js";
import { applyUnlocks } from "../src/domain/unlocks.js";
import type { GameState, Key, UnlockDefinition } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const rs = (...values: bigint[]): Array<{ num: bigint; den: bigint }> => values.map((value) => r(value));
const press = (state: GameState, key: Key): GameState => reducer(state, { type: "PRESS_KEY", key });
const assertIntTotal = (state: GameState, value: bigint, message: string): void =>
  assert.deepEqual(state.calculator.total, r(value), message);

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
  assert.equal(state.unlocks.slotOperators["-"], false, "minus starts locked");
  assert.equal(state.unlocks.slotOperators["*"], false, "mul starts locked");
  assert.equal(state.unlocks.slotOperators["/"], false, "div starts locked");
  assert.equal(state.unlocks.slotOperators["#"], false, "euclidean div starts locked");
  assert.equal(state.unlocks.digits["4"], false, "digit 4 starts locked");
  assert.equal(state.unlocks.utilities.C, false, "C starts locked");
  assert.equal(state.unlocks.utilities.CE, false, "CE starts locked");
  assert.equal(state.unlocks.utilities.NEG, false, "NEG starts locked");
  assert.equal(state.unlocks.execution["="], false, "equals starts locked");
  assert.equal(state.unlocks.maxTotalDigits, 2, "total starts with a 2-digit cap");

  let lockedDivState = state;
  lockedDivState = press(lockedDivState, "/");
  assert.equal(lockedDivState.calculator.draftingSlot, null, "division key is ignored while locked");
  lockedDivState = press(lockedDivState, "#");
  assert.equal(lockedDivState.calculator.draftingSlot, null, "euclidean division key is ignored while locked");

  const keys: Key[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "-", "*", "/", "#", "C", "CE", "NEG", "="];
  let nextState = state;
  for (const key of keys) {
    nextState = press(nextState, key);
  }
  assert.equal(
    nextState.completedUnlockIds.includes(CHECKLIST_UNLOCK_ID),
    false,
    "attempting C while locked does not unlock checklist drawer",
  );

  assertIntTotal(nextState, 1n, "pressing unlocked 1 updates total");
  nextState = press(nextState, "1");
  assertIntTotal(nextState, 11n, "second digit is accepted under 2-digit cap");
  assert.equal(nextState.unlocks.slotOperators["+"], true, "plus unlocks when total first reaches 11");
  assert.ok(nextState.completedUnlockIds.includes("unlock_plus_on_total_11"), "plus unlock id is recorded");
  nextState = press(nextState, "1");
  assertIntTotal(nextState, 11n, "third digit is blocked by 2-digit cap");
  assert.deepEqual(nextState.calculator.roll, [], "roll remains unchanged without equals");
  assert.equal(nextState.calculator.operationSlots.length, 0, "no slots are created without pressing plus");
  assert.equal(nextState.unlocks.execution["="], false, "equals remains locked before [+ 1]");

  nextState = press(nextState, "+");
  assert.equal(nextState.calculator.draftingSlot?.operator, "+", "plus starts drafting an operation slot");
  nextState = press(nextState, "1");
  assert.equal(nextState.calculator.draftingSlot?.operandInput, "1", "drafting slot captures operand input");
  nextState = press(nextState, "1");
  assert.equal(nextState.calculator.draftingSlot?.operandInput, "1", "drafting slot blocks operand input beyond 1 digit");
  assert.equal(nextState.unlocks.execution["="], true, "equals unlocks when operation is [+ 1]");
  assert.ok(
    nextState.completedUnlockIds.includes("unlock_equals_on_operation_plus_1"),
    "equals unlock id is recorded",
  );
  nextState = press(nextState, "=");
  assert.deepEqual(
    nextState.calculator.roll,
    rs(11n, 12n),
    "first equals with operations seeds roll with baseline total and first result",
  );
  nextState = press(nextState, "=");
  assert.deepEqual(
    nextState.calculator.roll,
    rs(11n, 12n, 13n),
    "subsequent equals appends only the resulting total",
  );
  nextState = press(nextState, "=");
  assert.deepEqual(nextState.calculator.roll, rs(11n, 12n, 13n, 14n), "roll continues appending successive totals");
  assert.equal(nextState.unlocks.utilities.C, true, "C unlocks on roll suffix [11, 12, 13, 14]");
  assert.ok(
    nextState.completedUnlockIds.includes("unlock_c_on_roll_suffix_11_12_13_14"),
    "C unlock id is recorded",
  );
  const afterFirstSuccessfulC = press(nextState, "C");
  assert.equal(
    afterFirstSuccessfulC.completedUnlockIds.includes(CHECKLIST_UNLOCK_ID),
    true,
    "first successful C press unlocks checklist drawer",
  );
  assert.deepEqual(
    afterFirstSuccessfulC.calculator,
    {
      total: r(0n),
      pendingNegativeTotal: false,
      roll: [],
      euclidRemainders: [],
      operationSlots: [],
      draftingSlot: null,
    },
    "successful C preserves reset calculator behavior",
  );
  const afterSecondSuccessfulC = press(afterFirstSuccessfulC, "C");
  assert.equal(
    afterSecondSuccessfulC.completedUnlockIds.filter((id) => id === CHECKLIST_UNLOCK_ID).length,
    1,
    "repeated successful C presses do not duplicate checklist unlock id",
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
      total: r(11n),
    },
  };
  const afterIdentityEquals = press(identityEqualsState, "=");
  assert.deepEqual(afterIdentityEquals.calculator.roll, [r(11n)], "identity equals appends one unchanged total");

  const atNinetyNine: GameState = {
    ...initialState(),
    calculator: {
      ...initialState().calculator,
      total: r(99n),
    },
  };
  const afterCatalogAtNinetyNine = applyUnlocks(atNinetyNine, unlockCatalog);
  assert.equal(afterCatalogAtNinetyNine.unlocks.maxTotalDigits, 2, "digit-cap unlock is no longer present in catalog");
  assert.ok(
    !afterCatalogAtNinetyNine.completedUnlockIds.includes("max_total_digits_3"),
    "legacy max-digit unlock id is not recorded",
  );

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
      roll: [r(1n)],
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
      roll: [r(3n), r(11n), r(12n), r(13n), r(14n)],
    },
  };
  const afterSuffixUnlock = applyUnlocks(withMatchingSuffix, [rollSuffixUnlock]);
  assert.equal(afterSuffixUnlock.unlocks.utilities.C, true, "suffix predicate unlocks C on longer rolls");
  assert.ok(afterSuffixUnlock.completedUnlockIds.includes(rollSuffixUnlock.id), "suffix unlock id is recorded");

  const withNonMatchingSuffix: GameState = {
    ...state,
    calculator: {
      ...state.calculator,
      roll: [r(11n), r(12n), r(13n), r(15n)],
    },
  };
  const afterNonMatch = applyUnlocks(withNonMatchingSuffix, [rollSuffixUnlock]);
  assert.equal(afterNonMatch.unlocks.utilities.C, false, "suffix predicate does not unlock on non-matching suffix");

  const rollUnlocksFour: UnlockDefinition = {
    id: "unlock_4_on_roll_suffix",
    description: "unlock 4 when roll ends with [1, 2, 3, 4]",
    predicate: { type: "roll_ends_with_sequence", sequence: [1n, 2n, 3n, 4n] },
    effect: { type: "unlock_digit", key: "4" },
    once: true,
  };
  const withFourSuffix: GameState = {
    ...state,
    calculator: {
      ...state.calculator,
      roll: [r(1n), r(2n), r(3n), r(4n)],
    },
  };
  const afterFourSuffixUnlock = applyUnlocks(withFourSuffix, [rollUnlocksFour]);
  assert.equal(afterFourSuffixUnlock.unlocks.digits["4"], true, "suffix predicate unlocks digit 4");

  let minusState = initialState();
  minusState = press(minusState, "1");
  minusState = press(minusState, "1");
  minusState = press(minusState, "+");
  minusState = press(minusState, "1");
  assert.equal(minusState.unlocks.execution["="], true, "equals unlocks before running towards 25");
  for (let index = 0; index < 13; index += 1) {
    minusState = press(minusState, "=");
  }
  assertIntTotal(minusState, 24n, "state reaches 24 before minus unlock threshold");
  assert.equal(minusState.unlocks.slotOperators["-"], false, "minus stays locked below threshold");
  minusState = press(minusState, "=");
  assertIntTotal(minusState, 25n, "state reaches 25 at threshold");
  assert.equal(minusState.unlocks.slotOperators["-"], true, "minus unlocks at total >= 25");
  assert.ok(
    minusState.completedUnlockIds.includes("unlock_minus_on_total_25_or_more"),
    "minus unlock id is recorded",
  );

  minusState = press(minusState, "-");
  assert.equal(minusState.calculator.draftingSlot?.operator, "-", "minus starts drafting an operation slot");
  minusState = press(minusState, "1");
  minusState = press(minusState, "=");
  assertIntTotal(minusState, 24n, "minus operation subtracts one when executed");
  assert.equal(minusState.unlocks.utilities.CE, false, "CE remains locked while total is non-negative");

  for (let index = 0; index < 24; index += 1) {
    minusState = press(minusState, "=");
  }
  assertIntTotal(minusState, 0n, "state reaches 0 before CE unlock threshold");
  assert.equal(minusState.unlocks.utilities.CE, false, "CE stays locked at total 0");
  minusState = press(minusState, "=");
  assertIntTotal(minusState, -1n, "state reaches -1 at CE unlock threshold");
  assert.equal(minusState.unlocks.utilities.CE, true, "CE unlocks when total becomes negative");
  assert.ok(
    minusState.completedUnlockIds.includes("unlock_ce_on_total_below_0"),
    "CE unlock id is recorded",
  );

  const negUnlockedState: GameState = {
    ...initialState(),
    unlocks: {
      ...initialState().unlocks,
      utilities: {
        ...initialState().unlocks.utilities,
        NEG: true,
      },
    },
  };
  const pendingNegativeZero = press(negUnlockedState, "NEG");
  assertIntTotal(pendingNegativeZero, 0n, "NEG on zero keeps total at zero");
  assert.equal(
    pendingNegativeZero.calculator.pendingNegativeTotal,
    true,
    "NEG on zero toggles pending negative sign on",
  );
  const pendingNegativeZeroCleared = press(pendingNegativeZero, "NEG");
  assert.equal(
    pendingNegativeZeroCleared.calculator.pendingNegativeTotal,
    false,
    "NEG on zero toggles pending negative sign off",
  );

  const negativeOneFromPending = press(pendingNegativeZero, "1");
  assertIntTotal(negativeOneFromPending, -1n, "digit entry uses pending sign to create negative total");
  assert.equal(
    negativeOneFromPending.calculator.pendingNegativeTotal,
    false,
    "pending sign clears once non-zero total is entered",
  );

  const totalFlippedPositive = press(negativeOneFromPending, "NEG");
  assertIntTotal(totalFlippedPositive, 1n, "NEG flips sign for non-zero total");

  const plusUnlockedForDrafting: GameState = {
    ...totalFlippedPositive,
    unlocks: {
      ...totalFlippedPositive.unlocks,
      slotOperators: {
        ...totalFlippedPositive.unlocks.slotOperators,
        "+": true,
      },
      execution: {
        ...totalFlippedPositive.unlocks.execution,
        "=": true,
      },
    },
  };
  const draftingNegateState = press(press(plusUnlockedForDrafting, "+"), "NEG");
  assert.equal(
    draftingNegateState.calculator.draftingSlot?.isNegative,
    true,
    "NEG toggles drafting slot sign when an operator is active",
  );
  assertIntTotal(draftingNegateState, 1n, "NEG on drafting slot does not change base total");
  const draftingNegativeOperand = press(draftingNegateState, "1");
  const finalizedNegativeOperand = press(draftingNegativeOperand, "=");
  assertIntTotal(finalizedNegativeOperand, 0n, "finalized drafting slot applies negative operand value");

  const rollNoopSource: GameState = {
    ...negUnlockedState,
    unlocks: {
      ...negUnlockedState.unlocks,
      execution: {
        ...negUnlockedState.unlocks.execution,
        "=": true,
      },
    },
    calculator: {
      ...negUnlockedState.calculator,
      total: r(5n),
      operationSlots: [{ operator: "+", operand: 1n }],
    },
  };
  const withRoll = press(rollNoopSource, "=");
  assert.ok(withRoll.calculator.roll.length > 0, "setup produced an active roll");
  const afterNegDuringRoll = press(withRoll, "NEG");
  assert.deepEqual(afterNegDuringRoll, withRoll, "NEG is a no-op while roll is active");

  const mulUnlockedState: GameState = {
    ...initialState(),
    unlocks: {
      ...initialState().unlocks,
      slotOperators: {
        ...initialState().unlocks.slotOperators,
        "*": true,
      },
      execution: {
        ...initialState().unlocks.execution,
        "=": true,
      },
      digits: {
        ...initialState().unlocks.digits,
        "2": true,
        "3": true,
      },
    },
    calculator: {
      ...initialState().calculator,
      total: r(4n),
    },
  };
  const mulDrafting = press(mulUnlockedState, "*");
  assert.equal(mulDrafting.calculator.draftingSlot?.operator, "*", "mul starts drafting an operation slot");
  const mulWithOperand = press(mulDrafting, "3");
  assert.equal(mulWithOperand.calculator.draftingSlot?.operandInput, "3", "mul drafting captures operand input");
  const mulOverflowOperand = press(mulWithOperand, "2");
  assert.equal(mulOverflowOperand.calculator.draftingSlot?.operandInput, "3", "mul drafting keeps 1-digit operand cap");
  const afterMulEquals = press(mulOverflowOperand, "=");
  assertIntTotal(afterMulEquals, 12n, "mul operation applies on equals");

  const divUnlockedState: GameState = {
    ...initialState(),
    unlocks: {
      ...initialState().unlocks,
      slotOperators: {
        ...initialState().unlocks.slotOperators,
        "/": true,
      },
      execution: {
        ...initialState().unlocks.execution,
        "=": true,
      },
      digits: {
        ...initialState().unlocks.digits,
        "2": true,
        "4": true,
      },
    },
    calculator: {
      ...initialState().calculator,
      total: r(10n),
    },
  };
  const divDrafting = press(divUnlockedState, "/");
  assert.equal(divDrafting.calculator.draftingSlot?.operator, "/", "div starts drafting an operation slot");
  const divOperand = press(divDrafting, "4");
  const afterDivEquals = press(divOperand, "=");
  assert.deepEqual(afterDivEquals.calculator.total, r(5n, 2n), "division produces exact fraction");
  assert.deepEqual(afterDivEquals.calculator.roll, [r(10n), r(5n, 2n)], "division appends rational roll values");
  assert.deepEqual(afterDivEquals.calculator.euclidRemainders, [], "true division does not append euclidean remainder rows");

  const euclidUnlockedState: GameState = {
    ...initialState(),
    unlocks: {
      ...initialState().unlocks,
      slotOperators: {
        ...initialState().unlocks.slotOperators,
        "#": true,
      },
      execution: {
        ...initialState().unlocks.execution,
        "=": true,
      },
      digits: {
        ...initialState().unlocks.digits,
        "2": true,
        "4": true,
      },
    },
    calculator: {
      ...initialState().calculator,
      total: r(10n),
    },
  };
  const euclidDrafting = press(euclidUnlockedState, "#");
  assert.equal(euclidDrafting.calculator.draftingSlot?.operator, "#", "euclidean div starts drafting an operation slot");
  const euclidOperand = press(euclidDrafting, "4");
  const afterEuclidEquals = press(euclidOperand, "=");
  assert.deepEqual(afterEuclidEquals.calculator.total, r(2n), "euclidean division stores integer quotient");
  assert.deepEqual(afterEuclidEquals.calculator.roll, [r(10n), r(2n)], "euclidean division appends normal roll totals");
  assert.deepEqual(
    afterEuclidEquals.calculator.euclidRemainders,
    [{ rollIndex: 1, value: r(2n) }],
    "euclidean division appends one remainder annotation targeting the result row",
  );
  const afterEuclidCE = press({ ...afterEuclidEquals, unlocks: { ...afterEuclidEquals.unlocks, utilities: { ...afterEuclidEquals.unlocks.utilities, CE: true } } }, "CE");
  assert.deepEqual(afterEuclidCE.calculator.euclidRemainders, [], "CE clears euclidean remainder annotations");

  const divZeroState: GameState = {
    ...divUnlockedState,
    calculator: {
      ...divUnlockedState.calculator,
      operationSlots: [{ operator: "/", operand: 0n }],
      roll: [r(1n)],
    },
  };
  const afterDivZeroEquals = press(divZeroState, "=");
  assert.deepEqual(afterDivZeroEquals, divZeroState, "division by zero is a no-op for total/roll/slots");

  const allUnlocked = reducer(initialState(), { type: "UNLOCK_ALL" });
  assert.ok(Object.values(allUnlocked.unlocks.digits).every(Boolean), "UNLOCK_ALL unlocks all digits");
  assert.ok(Object.values(allUnlocked.unlocks.slotOperators).every(Boolean), "UNLOCK_ALL unlocks all slot operators");
  assert.ok(Object.values(allUnlocked.unlocks.utilities).every(Boolean), "UNLOCK_ALL unlocks all utilities");
  assert.ok(Object.values(allUnlocked.unlocks.execution).every(Boolean), "UNLOCK_ALL unlocks execution keys");
  assert.equal(allUnlocked.unlocks.slotOperators["/"], true, "UNLOCK_ALL unlocks division key");
  assert.equal(allUnlocked.unlocks.slotOperators["#"], true, "UNLOCK_ALL unlocks euclidean division key");
  for (const unlock of unlockCatalog) {
    assert.ok(
      allUnlocked.completedUnlockIds.includes(unlock.id),
      `UNLOCK_ALL marks catalog unlock as completed: ${unlock.id}`,
    );
  }
};
