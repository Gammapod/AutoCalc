import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { createTouchRearrangeController } from "../src_v2/ui/renderAdapter.js";
import type { Action, GameState, LayoutCell } from "../src/domain/types.js";

const fakeTargetElement = (): HTMLElement =>
  ({
    classList: {
      add: () => undefined,
      remove: () => undefined,
    },
  }) as unknown as HTMLElement;

const buildRearrangeState = (): GameState => {
  const base = initialState();
  const keyLayout: LayoutCell[] = [
    { kind: "placeholder", area: "empty" },
    { kind: "placeholder", area: "empty" },
    { kind: "placeholder", area: "empty" },
    { kind: "key", key: "++" },
  ];
  return {
    ...base,
    unlocks: {
      ...base.unlocks,
      uiUnlocks: {
        ...base.unlocks.uiUnlocks,
        storageVisible: true,
      },
      utilities: {
        ...base.unlocks.utilities,
        CE: true,
      },
      valueExpression: {
        ...base.unlocks.valueExpression,
        "1": true,
      },
    },
    ui: {
      ...base.ui,
      keypadColumns: 4,
      keypadRows: 1,
      keyLayout,
    },
  };
};

export const runUiShellTouchRearrangeDropResolutionTests = (): void => {
  const moveState = buildRearrangeState();
  const moveActions: Action[] = [];
  const moveController = createTouchRearrangeController();
  moveController.syncContext(moveState, (action) => {
    moveActions.push(action);
    return action;
  });
  moveController.startPress(1, 30, 40, { surface: "storage", index: 0, key: "CE" }, null);
  moveController.forceActivateCarryForTests();
  moveController.move(1, 60, 70, () => ({
    target: { surface: "keypad", index: 0 },
    targetElement: fakeTargetElement(),
  }));
  const moveResult = moveController.end(1);
  assert.equal(moveResult, "moved", "drop on empty slot resolves to move");
  assert.deepEqual(
    moveActions[0],
    { type: "MOVE_LAYOUT_CELL", fromSurface: "storage", fromIndex: 0, toSurface: "keypad", toIndex: 0 },
    "move dispatch uses existing reducer action",
  );

  const swapState: GameState = {
    ...buildRearrangeState(),
    ui: {
      ...buildRearrangeState().ui,
      keyLayout: [
        { kind: "key", key: "1" },
        { kind: "placeholder", area: "empty" },
        { kind: "placeholder", area: "empty" },
        { kind: "key", key: "++" },
      ],
    },
  };
  const swapActions: Action[] = [];
  const swapController = createTouchRearrangeController();
  swapController.syncContext(swapState, (action) => {
    swapActions.push(action);
    return action;
  });
  swapController.startPress(2, 30, 40, { surface: "storage", index: 0, key: "CE" }, null);
  swapController.forceActivateCarryForTests();
  swapController.move(2, 60, 70, () => ({
    target: { surface: "keypad", index: 0 },
    targetElement: fakeTargetElement(),
  }));
  const swapResult = swapController.end(2);
  assert.equal(swapResult, "swapped", "drop on occupied slot resolves to swap");
  assert.deepEqual(
    swapActions[0],
    { type: "SWAP_LAYOUT_CELLS", fromSurface: "storage", fromIndex: 0, toSurface: "keypad", toIndex: 0 },
    "swap dispatch uses existing reducer action",
  );
};

