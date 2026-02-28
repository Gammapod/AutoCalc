import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { classifyDropAction, shouldStartDragFromDelta } from "../src/ui/render.js";
import type { GameState } from "../src/domain/types.js";

export const runDragDropBehaviorTests = (): void => {
  assert.equal(shouldStartDragFromDelta(2, 2, 6), false, "small pointer motion does not start drag");
  assert.equal(shouldStartDragFromDelta(6, 0, 6), true, "threshold crossing starts drag");

  const base = initialState();
  const withStorageKey: GameState = {
    ...base,
    ui: {
      ...base.ui,
      keyLayout: [...base.ui.keyLayout, { kind: "placeholder", area: "empty" }],
      keypadColumns: 4,
      keypadRows: 1,
      storageLayout: [{ kind: "key", key: "1" }, ...base.ui.storageLayout.slice(1)],
    },
  };

  const moveAction = classifyDropAction(
    withStorageKey,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 3 },
  );
  assert.equal(moveAction, "move", "dragging key onto empty keypad placeholder is a move");

  const withKeypadKey: GameState = {
    ...withStorageKey,
    unlocks: {
      ...withStorageKey.unlocks,
      valueExpression: {
        ...withStorageKey.unlocks.valueExpression,
        "2": true,
      },
    },
    ui: {
      ...withStorageKey.ui,
      keyLayout: withStorageKey.ui.keyLayout.map((cell, index) =>
        index === 3 ? ({ kind: "key", key: "2" } as const) : cell,
      ),
    },
  };
  const swapAction = classifyDropAction(
    withKeypadKey,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 3 },
  );
  assert.equal(swapAction, "swap", "dragging key onto occupied key slot is a swap");

  const invalid = classifyDropAction(
    withStorageKey,
    { surface: "storage", index: 0 },
    { surface: "storage", index: 999 },
  );
  assert.equal(invalid, null, "invalid target index rejects drop");

  const lockedTarget: GameState = {
    ...withStorageKey,
    ui: {
      ...withStorageKey.ui,
      keyLayout: withStorageKey.ui.keyLayout.map((cell, index) =>
        index === 3 ? ({ kind: "key", key: "+" } as const) : cell,
      ),
    },
  };
  const lockedTargetAction = classifyDropAction(
    lockedTarget,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 3 },
  );
  assert.equal(lockedTargetAction, null, "locked keys are not valid drop targets");
};
