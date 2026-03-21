import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { executeCommand } from "../src/domain/commands.js";
import { applyUnlocks } from "../src/domain/unlocks.js";
import type { Action, UnlockDefinition } from "../src/domain/types.js";
import { execution, valueExpr } from "./support/keyCompat.js";

const CONTENT_DRILL_CATALOG: UnlockDefinition[] = [
  {
    id: "content_drill_unlock_9_on_increment_3",
    description: "Content drill: unlock 9 after three increments.",
    predicate: { type: "key_press_count_at_least", key: execution("exec_equals"), count: 3 },
    effect: { type: "unlock_digit", key: valueExpr("digit_9") },
    sufficientKeySets: [[valueExpr("digit_1")]],
    once: true,
    domainNodeId: "NN",
    targetNodeId: "I9_content_drill",
    targetLabel: "digit_9",
  },
];

const runActions = (actions: Action[]) => {
  let state = initialState();
  for (const action of actions) {
    state = executeCommand(state, { type: "DispatchAction", action }).state;
  }
  return state;
};

export const runContentDrillUnlockExtensionTests = (): void => {
  const before = runActions([
    { type: "PRESS_KEY", key: k("exec_equals") },
    { type: "PRESS_KEY", key: k("exec_equals") },
    { type: "PRESS_KEY", key: k("exec_equals") },
  ]);

  assert.equal(before.unlocks.valueExpression[valueExpr("digit_9")], false, "drill key remains locked before applying drill catalog");

  const after = applyUnlocks(before, CONTENT_DRILL_CATALOG);
  assert.equal(after.unlocks.valueExpression[valueExpr("digit_9")], true, "drill unlock applies from catalog-only content change");
  assert.ok(after.completedUnlockIds.includes("content_drill_unlock_9_on_increment_3"), "drill unlock id is recorded");
};




