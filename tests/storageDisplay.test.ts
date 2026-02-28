import assert from "node:assert/strict";
import { buildStorageRenderOrder, getStorageRowCount } from "../src/ui/render.js";
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
};
