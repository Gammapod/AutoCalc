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
    ui: {
      ...base.ui,
      storageLayout: [
        { kind: "key", key: "+" },
        { kind: "key", key: "1" },
        null,
        { kind: "key", key: "3" },
        { kind: "key", key: "CE" },
        ...base.ui.storageLayout.slice(5),
      ],
    },
    unlocks: {
      ...base.unlocks,
      uiUnlocks: {
        ...base.unlocks.uiUnlocks,
        storageVisible: true,
      },
      valueExpression: {
        ...base.unlocks.valueExpression,
        "1": true,
        "3": true,
      },
    },
  };
  const order = buildStorageRenderOrder(orderedState);
  const position = (index: number): number => order.indexOf(index);
  assert.ok(position(1) >= 0 && position(3) >= 0, "unlocked keys are present in render order");
  assert.ok(position(0) >= 0 && position(4) >= 0, "locked keys are present in render order");
  assert.ok(position(2) >= 0, "empty slots are present in render order");
  assert.ok(position(1) < position(0), "first unlocked key is rendered before locked key");
  assert.ok(position(3) < position(4), "later unlocked key is rendered before later locked key");
  assert.ok(position(2) < position(0), "empty slots render before locked keys");

  const sortedByExecution: GameState = {
    ...orderedState,
    ui: {
      ...orderedState.ui,
      storageLayout: [
        { kind: "key", key: "1" },
        { kind: "key", key: "++" },
        null,
        { kind: "key", key: "+" },
        { kind: "key", key: "CE" },
        ...orderedState.ui.storageLayout.slice(5),
      ],
      buttonFlags: {
        ...orderedState.ui.buttonFlags,
        "storage.sort.execution": true,
      },
    },
  };
  const sortedOrder = buildStorageRenderOrder(sortedByExecution);
  const sortedPosition = (index: number): number => sortedOrder.indexOf(index);
  assert.ok(
    sortedPosition(1) < sortedPosition(0),
    "selected type unlocked keys are prioritized ahead of other unlocked keys",
  );
  assert.ok(
    sortedPosition(0) < sortedPosition(2),
    "other unlocked keys still render ahead of empty slots after selected type keys",
  );
  assert.ok(sortedPosition(2) < sortedPosition(3), "empty slots still render before locked keys");

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
    "execution",
    "segment priority determines active group when multiple flags are set",
  );
  const sequence = buildStorageSortToggleSequence(multiFlagState, "execution");
  assert.deepEqual(
    sequence,
    [{ type: "TOGGLE_FLAG", flag: "storage.sort.value_expression" }],
    "selecting already-active segment clears conflicting flags and does not toggle active segment off",
  );
  const switchSequence = buildStorageSortToggleSequence(sortedByExecution, "utility");
  assert.deepEqual(
    switchSequence,
    [
      { type: "TOGGLE_FLAG", flag: "storage.sort.utility" },
      { type: "TOGGLE_FLAG", flag: "storage.sort.execution" },
    ],
    "switching segments toggles target on and prior segment off",
  );
};
