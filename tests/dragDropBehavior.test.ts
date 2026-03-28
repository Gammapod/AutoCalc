import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { legacyInitialState } from "./support/legacyState.js";
import { classifyDropAction, shouldStartDragFromDelta } from "../src/domain/layoutDragDrop.js";
import type { GameState } from "../src/domain/types.js";

export const runDragDropBehaviorTests = (): void => {
  assert.equal(shouldStartDragFromDelta(2, 2, 6), false, "small pointer motion does not start drag");
  assert.equal(shouldStartDragFromDelta(6, 0, 6), true, "threshold crossing starts drag");

  const base = legacyInitialState();
  const withStorageKey: GameState = {
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
      },
    },
    ui: {
      ...base.ui,
      keyLayout: [
        { kind: "key", key: k("exec_equals") },
        { kind: "placeholder", area: "empty" },
        { kind: "placeholder", area: "empty" },
        { kind: "placeholder", area: "empty" },
        { kind: "placeholder", area: "empty" },
      ],
      keypadColumns: 5,
      keypadRows: 1,
      storageLayout: [{ kind: "key", key: k("digit_1") }, ...base.ui.storageLayout.slice(1)],
    },
  };

  const moveAction = classifyDropAction(
    withStorageKey,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 3 },
  );
  assert.equal(moveAction, "install", "dragging storage key onto empty keypad placeholder installs");

  const withKeypadKey: GameState = {
    ...withStorageKey,
    unlocks: {
      ...withStorageKey.unlocks,
      valueExpression: {
        ...withStorageKey.unlocks.valueExpression,
        [k("digit_2")]: true,
      },
    },
    ui: {
      ...withStorageKey.ui,
      keyLayout: withStorageKey.ui.keyLayout.map((cell, index) =>
        index === 3 ? ({ kind: "key", key: k("digit_2") } as const) : cell,
      ),
    },
  };
  const swapAction = classifyDropAction(
    withKeypadKey,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 3 },
  );
  assert.equal(swapAction, "install", "dragging storage key onto occupied keypad slot installs");

  const allowedFormerBottomRightMove = classifyDropAction(
    withStorageKey,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 4 },
  );
  assert.equal(
    allowedFormerBottomRightMove,
    "install",
    "dragging non-execution storage key into empty keypad slot is allowed",
  );

  const withExecutionStorageKey: GameState = {
    ...withStorageKey,
    unlocks: {
      ...withStorageKey.unlocks,
      execution: {
        ...withStorageKey.unlocks.execution,
        [k("exec_equals")]: true,
      },
    },
    ui: {
      ...withStorageKey.ui,
      storageLayout: [{ kind: "key", key: k("exec_equals") }, ...withStorageKey.ui.storageLayout.slice(1)],
    },
  };
  const allowedAdditionalExecutionMove = classifyDropAction(
    withExecutionStorageKey,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 3 },
  );
  assert.equal(
    allowedAdditionalExecutionMove,
    null,
    "dragging duplicate execution key onto keypad is rejected",
  );

  const withExecutionMovedOffKeypad: GameState = {
    ...withExecutionStorageKey,
    unlocks: {
      ...withExecutionStorageKey.unlocks,
      execution: {
        ...withExecutionStorageKey.unlocks.execution,
        [k("exec_equals")]: true,
      },
    },
    ui: {
      ...withExecutionStorageKey.ui,
      keyLayout: withExecutionStorageKey.ui.keyLayout.map((cell, index) =>
        index === 0 ? ({ kind: "placeholder", area: "empty" } as const) : cell,
      ),
    },
  };
  const allowedFirstExecutionMove = classifyDropAction(
    withExecutionMovedOffKeypad,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 3 },
  );
  assert.equal(
    allowedFirstExecutionMove,
    "install",
    "dragging execution key onto keypad is allowed when keypad currently has zero instances",
  );

  const emptyStorageIndex = withExecutionMovedOffKeypad.ui.storageLayout.findIndex((cell) => cell === null);
  assert.ok(emptyStorageIndex >= 0, "test state includes an empty storage slot");
  const withLockedExecutionOnKeypad: GameState = {
    ...withStorageKey,
    unlocks: {
      ...withStorageKey.unlocks,
      execution: {
        ...withStorageKey.unlocks.execution,
        [k("exec_equals")]: false,
      },
    },
  };
  const allowedExecutionMoveOutOfKeypad = classifyDropAction(
    withLockedExecutionOnKeypad,
    { surface: "keypad", index: 0 },
    { surface: "storage", index: emptyStorageIndex },
  );
  assert.equal(
    allowedExecutionMoveOutOfKeypad,
    null,
    "locked keypad keys cannot be moved into storage",
  );

  const uninstallToStorage = classifyDropAction(
    withStorageKey,
    { surface: "keypad", index: 0 },
    { surface: "storage", index: 0 },
  );
  assert.equal(uninstallToStorage, "uninstall", "dragging keypad key to storage uninstalls");

  const uninstallOffCalculator = classifyDropAction(
    withStorageKey,
    { surface: "keypad", index: 0 },
    null,
  );
  assert.equal(uninstallOffCalculator, "uninstall", "dragging keypad key off-calculator uninstalls");

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
        index === 3 ? ({ kind: "key", key: k("op_add") } as const) : cell,
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







