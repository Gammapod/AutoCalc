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
      storageLayout: [{ kind: "key", key: "1" }, ...base.ui.storageLayout.slice(1)],
    },
  };

  const moveAction = classifyDropAction(
    withStorageKey,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 0 },
  );
  assert.equal(moveAction, "move", "dragging key onto empty keypad placeholder is a move");

  const swapAction = classifyDropAction(
    withStorageKey,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 2 },
  );
  assert.equal(swapAction, "swap", "dragging key onto occupied key slot is a swap");

  const invalid = classifyDropAction(
    withStorageKey,
    { surface: "storage", index: 0 },
    { surface: "storage", index: 999 },
  );
  assert.equal(invalid, null, "invalid target index rejects drop");

  const wideBlocked = classifyDropAction(
    withStorageKey,
    { surface: "keypad", index: 20 },
    { surface: "storage", index: 7 },
  );
  assert.equal(wideBlocked, null, "wide key drop is blocked when span exceeds storage row");

  const oneFreeSlotState: GameState = {
    ...withStorageKey,
    ui: {
      ...withStorageKey.ui,
      keyLayout: withStorageKey.ui.keyLayout.map((cell, index) =>
        index === 1 ? ({ kind: "key", key: "1" } as const) : cell,
      ),
    },
  };
  const blockedByFreeSlotRule = classifyDropAction(
    oneFreeSlotState,
    { surface: "keypad", index: 20 },
    { surface: "storage", index: 0 },
  );
  assert.equal(blockedByFreeSlotRule, null, "large key drag is blocked when keypad has fewer than two free slots");
};
