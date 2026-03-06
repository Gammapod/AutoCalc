import assert from "node:assert/strict";
import { applyLifecycleAction } from "../src/domain/reducer.lifecycle.js";
import { FEED_VISIBLE_FLAG, GRAPH_VISIBLE_FLAG, initialState } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
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
  assert.ok(Object.values(unlockedAll.unlocks.valueExpression).every(Boolean), "UNLOCK_ALL unlocks all digits");
  assert.ok(Object.values(unlockedAll.unlocks.slotOperators).every(Boolean), "UNLOCK_ALL unlocks all operators");
  assert.ok(Object.values(unlockedAll.unlocks.utilities).every(Boolean), "UNLOCK_ALL unlocks all utilities");
  assert.ok(Object.values(unlockedAll.unlocks.steps).every(Boolean), "UNLOCK_ALL unlocks all step keys");
  assert.ok(Object.values(unlockedAll.unlocks.execution).every(Boolean), "UNLOCK_ALL unlocks execution keys");
  assert.equal(unlockedAll.unlocks.maxSlots, 4, "UNLOCK_ALL projects allocator-backed slot capacity to 4");
  assert.equal(unlockedAll.allocator.allocations.slots, 4, "UNLOCK_ALL allocates slots budget to reach effective 4");

  const unhandled = applyLifecycleAction(base, { type: "MOVE_KEY_SLOT", fromIndex: 0, toIndex: 1 } as Action);
  assert.equal(unhandled, null, "non-lifecycle actions return null (unhandled)");

  const toggledOn = reducer(base, { type: "TOGGLE_FLAG", flag: "sticky.negate" });
  assert.equal(toggledOn.ui.buttonFlags["sticky.negate"], true, "TOGGLE_FLAG sets an unset flag");

  const toggledOff = reducer(toggledOn, { type: "TOGGLE_FLAG", flag: "sticky.negate" });
  assert.equal(Boolean(toggledOff.ui.buttonFlags["sticky.negate"]), false, "TOGGLE_FLAG clears a set flag");
  assert.equal(
    Object.prototype.hasOwnProperty.call(toggledOff.ui.buttonFlags, "sticky.negate"),
    false,
    "cleared flags are removed from the map",
  );

  const blankNoop = reducer(base, { type: "TOGGLE_FLAG", flag: "   " });
  assert.equal(blankNoop, base, "blank flag names are ignored");

  const graphOn = reducer(base, { type: "TOGGLE_FLAG", flag: GRAPH_VISIBLE_FLAG });
  assert.equal(graphOn.ui.buttonFlags[GRAPH_VISIBLE_FLAG], true, "GRAPH toggles on");

  const feedOn = reducer(graphOn, { type: "TOGGLE_FLAG", flag: FEED_VISIBLE_FLAG });
  assert.equal(feedOn.ui.buttonFlags[FEED_VISIBLE_FLAG], true, "FEED toggles on");
  assert.equal(
    Boolean(feedOn.ui.buttonFlags[GRAPH_VISIBLE_FLAG]),
    false,
    "turning FEED on clears GRAPH",
  );

  const feedOff = reducer(feedOn, { type: "TOGGLE_FLAG", flag: FEED_VISIBLE_FLAG });
  assert.equal(Boolean(feedOff.ui.buttonFlags[FEED_VISIBLE_FLAG]), false, "FEED toggles off when active");
};

