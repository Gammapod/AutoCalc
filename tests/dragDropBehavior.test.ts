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
    unlocks: {
      ...base.unlocks,
      uiUnlocks: {
        ...base.unlocks.uiUnlocks,
        storageVisible: true,
      },
      valueExpression: {
        ...base.unlocks.valueExpression,
        "1": true,
      },
    },
    ui: {
      ...base.ui,
      keyLayout: [
        ...base.ui.keyLayout,
        { kind: "placeholder", area: "empty" },
        { kind: "placeholder", area: "empty" },
        { kind: "placeholder", area: "empty" },
        { kind: "placeholder", area: "empty" },
      ],
      keypadColumns: 5,
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

  const allowedFormerBottomRightMove = classifyDropAction(
    withStorageKey,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 4 },
  );
  assert.equal(
    allowedFormerBottomRightMove,
    "move",
    "dragging non-execution key into any empty keypad slot is allowed",
  );

  const withExecutionStorageKey: GameState = {
    ...withStorageKey,
    unlocks: {
      ...withStorageKey.unlocks,
      execution: {
        ...withStorageKey.unlocks.execution,
        "=": true,
      },
    },
    ui: {
      ...withStorageKey.ui,
      storageLayout: [{ kind: "key", key: "=" }, ...withStorageKey.ui.storageLayout.slice(1)],
    },
  };
  const allowedAdditionalExecutionMove = classifyDropAction(
    withExecutionStorageKey,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 3 },
  );
  assert.equal(
    allowedAdditionalExecutionMove,
    "move",
    "dragging an execution key onto keypad is allowed even when keypad already has one execution key",
  );

  const withExecutionMovedOffKeypad: GameState = {
    ...withExecutionStorageKey,
    unlocks: {
      ...withExecutionStorageKey.unlocks,
      execution: {
        ...withExecutionStorageKey.unlocks.execution,
        "=": true,
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
    "move",
    "dragging an execution key onto keypad is allowed when keypad currently has zero execution keys",
  );

  const emptyStorageIndex = withExecutionMovedOffKeypad.ui.storageLayout.findIndex((cell) => cell === null);
  assert.ok(emptyStorageIndex >= 0, "test state includes an empty storage slot");
  const allowedExecutionMoveOutOfKeypad = classifyDropAction(
    withStorageKey,
    { surface: "keypad", index: 0 },
    { surface: "storage", index: emptyStorageIndex },
  );
  assert.equal(
    allowedExecutionMoveOutOfKeypad,
    "move",
    "dragging execution key out of keypad into storage is allowed",
  );

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

  const stepMoveState: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      uiUnlocks: {
        ...base.unlocks.uiUnlocks,
        storageVisible: true,
      },
      steps: {
        ...base.unlocks.steps,
        "\u23EF": true,
      },
      valueExpression: {
        ...base.unlocks.valueExpression,
        "1": true,
      },
    },
    ui: {
      ...base.ui,
      keypadColumns: 2,
      keypadRows: 2,
      keyLayout: [
        { kind: "placeholder", area: "empty" },
        { kind: "placeholder", area: "empty" },
        { kind: "placeholder", area: "empty" },
        { kind: "key", key: "++" },
      ],
      storageLayout: [{ kind: "key", key: "\u23EF" }, { kind: "key", key: "1" }, ...base.ui.storageLayout.slice(2)],
    },
  };
  const blockedStepMoveToBottomRow = classifyDropAction(
    stepMoveState,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 2 },
  );
  assert.equal(blockedStepMoveToBottomRow, null, "step key cannot be moved into keypad bottom row");

  const allowedStepMoveToTopRow = classifyDropAction(
    stepMoveState,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 0 },
  );
  assert.equal(allowedStepMoveToTopRow, "move", "step key can be moved into non-bottom keypad rows");

  const stepSwapState: GameState = {
    ...stepMoveState,
    ui: {
      ...stepMoveState.ui,
      keyLayout: stepMoveState.ui.keyLayout.map((cell, index) =>
        index === 2 ? ({ kind: "key", key: "1" } as const) : cell,
      ),
    },
  };
  const blockedStepSwapToBottomRow = classifyDropAction(
    stepSwapState,
    { surface: "storage", index: 0 },
    { surface: "keypad", index: 2 },
  );
  assert.equal(blockedStepSwapToBottomRow, null, "step key cannot be swapped into keypad bottom row");
};
