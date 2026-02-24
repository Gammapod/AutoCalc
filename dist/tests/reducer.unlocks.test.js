import assert from "node:assert/strict";
import { reducer } from "../src/domain/reducer.js";
import { initialState } from "../src/domain/state.js";
import { applyUnlocks } from "../src/domain/unlocks.js";
const press = (state, key) => reducer(state, { type: "PRESS_KEY", key });
export const runReducerUnlockTests = () => {
    const state = initialState();
    assert.equal(state.unlocks.digits["1"], true, "digit 1 starts unlocked");
    assert.ok(Object.entries(state.unlocks.digits)
        .filter(([digit]) => digit !== "1")
        .every(([, isUnlocked]) => !isUnlocked), "all other digits start locked");
    assert.equal(state.unlocks.slotOperators["+"], false, "plus starts locked");
    assert.equal(state.unlocks.utilities.C, false, "C starts locked");
    assert.equal(state.unlocks.utilities.CE, false, "CE starts locked");
    assert.equal(state.unlocks.execution["="], false, "equals starts locked");
    assert.equal(state.unlocks.maxTotalDigits, 2, "total starts with a 2-digit cap");
    const keys = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "C", "CE", "="];
    let nextState = state;
    for (const key of keys) {
        nextState = press(nextState, key);
    }
    assert.equal(nextState.calculator.total, 1n, "pressing unlocked 1 updates total");
    nextState = press(nextState, "1");
    assert.equal(nextState.calculator.total, 11n, "second digit is accepted under 2-digit cap");
    nextState = press(nextState, "1");
    assert.equal(nextState.calculator.total, 11n, "third digit is blocked by 2-digit cap");
    assert.deepEqual(nextState.calculator.roll, [], "roll remains unchanged without equals");
    assert.equal(nextState.calculator.operationSlots.length, 0, "no slots are created while plus is locked");
    assert.deepEqual(nextState.completedUnlockIds, [], "no unlock is triggered without roll progress");
    const increaseDigitCapUnlock = {
        id: "increase_digit_cap_once",
        description: "increase max total digits by one",
        predicate: { type: "roll_length_at_least", length: 1 },
        effect: { type: "increase_max_total_digits", amount: 1 },
        once: true,
    };
    const withRollProgress = {
        ...nextState,
        calculator: {
            ...nextState.calculator,
            roll: [11n],
        },
    };
    const withIncreasedCap = applyUnlocks(withRollProgress, [increaseDigitCapUnlock]);
    assert.equal(withIncreasedCap.unlocks.maxTotalDigits, 3, "unlock increases max total digits");
    const withIncreasedCapReadyForInput = {
        ...withIncreasedCap,
        calculator: {
            ...withIncreasedCap.calculator,
            roll: [],
        },
    };
    const afterUnlockPress = press(withIncreasedCapReadyForInput, "1");
    assert.equal(afterUnlockPress.calculator.total, 111n, "third digit is accepted after cap unlock");
    const repeatableUnlock = {
        id: "repeatable_unlock_utility_c",
        description: "repeatable unlock for C",
        predicate: { type: "roll_length_at_least", length: 1 },
        effect: { type: "unlock_utility", key: "C" },
        once: false,
    };
    const unlockState = {
        ...state,
        calculator: {
            ...state.calculator,
            roll: [1n],
        },
    };
    const firstApply = applyUnlocks(unlockState, [repeatableUnlock]);
    const secondApply = applyUnlocks(firstApply, [repeatableUnlock]);
    assert.equal(secondApply.unlocks.utilities.C, true, "repeatable unlock effect still applies");
    assert.deepEqual(secondApply.completedUnlockIds, [repeatableUnlock.id], "completed unlock ids stay unique for repeatable unlocks");
};
//# sourceMappingURL=reducer.unlocks.test.js.map