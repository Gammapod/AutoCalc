import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import {
  buildStorageRenderOrder,
  buildStorageSortToggleSequence,
  getActiveStorageSortGroup,
  getStorageRowCount,
} from "../src/ui/modules/storage/viewModel.js";
import { initialState } from "../src/domain/state.js";
import type { GameState } from "../src/domain/types.js";

export const runStorageDisplayTests = (): void => {
  assert.equal(getStorageRowCount(0), 1, "empty storage still reserves one row");
  assert.equal(getStorageRowCount(1), 1, "single button uses one row");
  assert.equal(getStorageRowCount(8), 1, "full first row uses one row");
  assert.equal(getStorageRowCount(9), 2, "ninth button creates second row");
  assert.equal(getStorageRowCount(25), 4, "row count scales with number of buttons");

  const base = initialState();
  const orderedState: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      uiUnlocks: {
        ...base.unlocks.uiUnlocks,
        storageVisible: true,
      },
      valueExpression: {
        ...base.unlocks.valueExpression,
        [k("digit_1")]: true,
        [k("digit_3")]: true,
      },
      execution: {
        ...base.unlocks.execution,
        [k("exec_equals")]: true,
      },
    },
  };
  const order = buildStorageRenderOrder(orderedState);
  const position = (key: string): number => order.indexOf(key as never);
  assert.ok(position(k("digit_1")) >= 0 && position(k("digit_3")) >= 0, "unlocked keys are present in render order");
  assert.equal(position(k("op_add")), -1, "locked keys are not rendered in palette order");
  const debugOrder = buildStorageRenderOrder(orderedState, { includeLocked: true });
  assert.ok(debugOrder.indexOf(k("op_add") as never) >= 0, "debug palette can include locked keys");

  const sortedByExecution: GameState = {
    ...orderedState,
    unlocks: {
      ...orderedState.unlocks,
      execution: {
        ...orderedState.unlocks.execution,
        [k("exec_equals")]: true,
      },
    },
    ui: {
      ...orderedState.ui,
      buttonFlags: {
        ...orderedState.ui.buttonFlags,
        "storage.sort.execution": true,
      },
    },
  };
  const sortedOrder = buildStorageRenderOrder(sortedByExecution);
  const sortedPosition = (key: string): number => sortedOrder.indexOf(key as never);
  assert.ok(
    sortedPosition(k("exec_equals")) >= 0,
    "active filter keeps matching execution keys",
  );
  assert.equal(sortedPosition(k("digit_1")), -1, "active filter hides non-matching keys");
  assert.equal(sortedPosition(k("op_add")), -1, "locked keys remain absent under active filter");

  assert.equal(getActiveStorageSortGroup(sortedByExecution), "execution", "active storage sort group is resolved");

  const multiFlagState: GameState = {
    ...sortedByExecution,
    ui: {
      ...sortedByExecution.ui,
      buttonFlags: {
        ...sortedByExecution.ui.buttonFlags,
        "storage.sort.value_expression": true,
      },
    },
  };
  assert.equal(
    getActiveStorageSortGroup(multiFlagState),
    "value_expression",
    "filter priority determines active group when multiple flags are set",
  );
  const sequence = buildStorageSortToggleSequence(multiFlagState, "execution");
  assert.deepEqual(
    sequence,
    [{ type: "TOGGLE_FLAG", flag: "storage.sort.value_expression" }],
    "selecting active filter clears conflicting filter flags and does not toggle active filter off",
  );
  const switchSequence = buildStorageSortToggleSequence(sortedByExecution, "utility_bundle");
  assert.deepEqual(
    switchSequence,
    [
      { type: "TOGGLE_FLAG", flag: "storage.sort.utility" },
      { type: "TOGGLE_FLAG", flag: "storage.sort.execution" },
    ],
    "switching filters toggles target on and prior filter off",
  );

  const clearSequence = buildStorageSortToggleSequence(sortedByExecution, "all");
  assert.deepEqual(
    clearSequence,
    [{ type: "TOGGLE_FLAG", flag: "storage.sort.execution" }],
    "all filter clears active filter flags",
  );
};





