import assert from "node:assert/strict";
import { reducer } from "../src/domain/reducer.js";
import { initialState } from "../src/domain/state.js";
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

  const keys: Key[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "C", "CE", "="];
  let nextState = state;
  for (const key of keys) {
    nextState = press(nextState, key);
  }

  assert.equal(nextState.calculator.total, 1n, "pressing unlocked 1 updates total");
  assert.deepEqual(nextState.calculator.roll, [], "roll remains unchanged without equals");
  assert.equal(nextState.calculator.operationSlots.length, 0, "no slots are created while plus is locked");
  assert.deepEqual(nextState.completedUnlockIds, [], "no unlock conditions are defined yet");
};
