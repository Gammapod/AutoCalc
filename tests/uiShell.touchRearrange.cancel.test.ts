import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { createTouchRearrangeController } from "../src/ui/renderAdapter.js";
import type { Action, GameState, LayoutCell } from "../src/domain/types.js";

const buildCancelState = (): GameState => {
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
    },
    ui: {
      ...base.ui,
      keypadColumns: 4,
      keypadRows: 1,
      keyLayout,
    },
  };
};

export const runUiShellTouchRearrangeCancelTests = (): void => {
  const state = buildCancelState();
  const dispatched: Action[] = [];
  const controller = createTouchRearrangeController();
  controller.syncContext(state, (action) => {
    dispatched.push(action);
    return action;
  });
  controller.startPress(1, 20, 30, { surface: "storage", index: 0, key: "CE" }, null);
  controller.forceActivateCarryForTests();
  controller.move(1, 70, 80, () => ({ target: null, targetElement: null }));
  const result = controller.end(1);
  assert.equal(result, "canceled", "dropping without a valid target cancels to origin");
  assert.equal(dispatched.length, 0, "canceling does not dispatch move/swap actions");
};

