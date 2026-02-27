import assert from "node:assert/strict";
import { applyLifecycleAction } from "../src/domain/reducer.lifecycle.js";
import { initialState } from "../src/domain/state.js";
import type { Action, GameState } from "../src/domain/types.js";

export const runReducerLifecycleTests = (): void => {
  const base = initialState();

  const reset = applyLifecycleAction(base, { type: "RESET_RUN" });
  assert.deepEqual(reset, initialState(), "RESET_RUN returns initial state");

  const hydratedState: GameState = {
    ...base,
    completedUnlockIds: ["hydrate-marker"],
  };
  const hydrated = applyLifecycleAction(base, { type: "HYDRATE_SAVE", state: hydratedState });
  assert.equal(hydrated, hydratedState, "HYDRATE_SAVE returns provided state reference");

  const unlockedAll = applyLifecycleAction(base, { type: "UNLOCK_ALL" });
  if (!unlockedAll) {
    throw new Error("UNLOCK_ALL should be handled by lifecycle reducer.");
  }
  assert.ok(Object.values(unlockedAll.unlocks.digits).every(Boolean), "UNLOCK_ALL unlocks all digits");
  assert.ok(Object.values(unlockedAll.unlocks.slotOperators).every(Boolean), "UNLOCK_ALL unlocks all operators");
  assert.ok(Object.values(unlockedAll.unlocks.utilities).every(Boolean), "UNLOCK_ALL unlocks all utilities");
  assert.ok(Object.values(unlockedAll.unlocks.execution).every(Boolean), "UNLOCK_ALL unlocks execution keys");
  assert.equal(unlockedAll.unlocks.maxSlots, 2, "UNLOCK_ALL grants second slot capacity");

  const unhandled = applyLifecycleAction(base, { type: "MOVE_KEY_SLOT", fromIndex: 0, toIndex: 1 } as Action);
  assert.equal(unhandled, null, "non-lifecycle actions return null (unhandled)");
};
