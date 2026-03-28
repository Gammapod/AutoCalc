import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { createTouchRearrangeController } from "../src/ui/renderAdapter.js";
import type { Action, GameState, LayoutCell } from "../src/domain/types.js";
import { withCalculatorProjection } from "./helpers/dualCalculatorState.js";

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
    { kind: "key", key: k("exec_equals") },
  ];
  return withCalculatorProjection({
    ...base,
    unlocks: {
      ...base.unlocks,
      uiUnlocks: {
        ...base.unlocks.uiUnlocks,
        storageVisible: true,
      },
      utilities: {
        ...base.unlocks.utilities,
        [utility("util_clear_all")]: true,
      },
      execution: {
        ...base.unlocks.execution,
        [execution("exec_equals")]: true,
      },
      valueExpression: {
        ...base.unlocks.valueExpression,
        [k("digit_1")]: true,
      },
    },
  }, "f", (projected) => ({
    ...projected,
    ui: {
      ...projected.ui,
      keypadColumns: 4,
      keypadRows: 1,
      keyLayout,
      storageLayout: [{ kind: "key", key: utility("util_clear_all") }, ...projected.ui.storageLayout.slice(1)],
    },
  }));
};

export const runUiShellTouchRearrangeDropResolutionTests = (): void => {
  const moveState = buildRearrangeState();
  const moveActions: Action[] = [];
  const moveController = createTouchRearrangeController();
  moveController.syncContext(moveState, (action) => {
    moveActions.push(action);
    return action;
  });
  moveController.startPress(1, 30, 40, { surface: "storage", index: 0, key: k("util_clear_all") }, null);
  moveController.forceActivateCarryForTests();
  moveController.move(1, 60, 70, () => ({
    target: { surface: "keypad_f", index: 0 },
    targetElement: fakeTargetElement(),
  }));
  const moveResult = moveController.end(1);
  assert.equal(moveResult, "installed", "drop on empty slot resolves to install");
  assert.deepEqual(
    moveActions[0],
    { type: "INSTALL_KEY_FROM_STORAGE", key: k("util_clear_all"), toSurface: "keypad_f", toIndex: 0 },
    "install dispatch uses storage install action",
  );

  const swapState: GameState = withCalculatorProjection(buildRearrangeState(), "f", (projected) => ({
    ...projected,
    ui: {
      ...projected.ui,
      keyLayout: [
        { kind: "key", key: k("digit_1") },
        { kind: "placeholder", area: "empty" },
        { kind: "placeholder", area: "empty" },
        { kind: "key", key: k("exec_equals") },
      ],
    },
  }));
  const swapActions: Action[] = [];
  const swapController = createTouchRearrangeController();
  swapController.syncContext(swapState, (action) => {
    swapActions.push(action);
    return action;
  });
  swapController.startPress(2, 30, 40, { surface: "storage", index: 0, key: k("util_clear_all") }, null);
  swapController.forceActivateCarryForTests();
  swapController.move(2, 60, 70, () => ({
    target: { surface: "keypad_f", index: 0 },
    targetElement: fakeTargetElement(),
  }));
  const swapResult = swapController.end(2);
  assert.equal(swapResult, "installed", "drop on occupied slot resolves to install");
  assert.deepEqual(
    swapActions[0],
    { type: "INSTALL_KEY_FROM_STORAGE", key: k("util_clear_all"), toSurface: "keypad_f", toIndex: 0 },
    "install on occupied target uses storage install action",
  );

  const crossActions: Action[] = [];
  const crossController = createTouchRearrangeController();
  const withGSurface = withCalculatorProjection(buildRearrangeState(), "g", (projected) => ({
    ...projected,
    ui: {
      ...projected.ui,
      keypadColumns: 4,
      keypadRows: 1,
      keyLayout: [
        { kind: "placeholder", area: "empty" },
        { kind: "placeholder", area: "empty" },
        { kind: "placeholder", area: "empty" },
        { kind: "placeholder", area: "empty" },
      ],
    },
  }));
  crossController.syncContext(withGSurface, (action) => {
    crossActions.push(action);
    return action;
  });
  crossController.startPress(3, 30, 40, { surface: "keypad_f", index: 3, key: k("exec_equals") }, null);
  crossController.forceActivateCarryForTests();
  crossController.move(3, 60, 70, () => ({
    target: { surface: "keypad_g", index: 2 },
    targetElement: fakeTargetElement(),
  }));
  const crossResult = crossController.end(3);
  assert.equal(crossResult, "moved", "cross-calculator drop on empty g slot resolves to move");
  assert.deepEqual(
    crossActions[0],
    { type: "MOVE_LAYOUT_CELL", fromSurface: "keypad_f", fromIndex: 3, toSurface: "keypad_g", toIndex: 2 },
    "cross-calculator move dispatch targets keypad_f -> keypad_g surfaces",
  );

  const uninstallActions: Action[] = [];
  const uninstallController = createTouchRearrangeController();
  uninstallController.syncContext(moveState, (action) => {
    uninstallActions.push(action);
    return action;
  });
  uninstallController.startPress(4, 30, 40, { surface: "keypad_f", index: 3, key: k("exec_equals") }, null);
  uninstallController.forceActivateCarryForTests();
  uninstallController.move(4, 60, 70, () => ({
    target: { surface: "storage", index: 0 },
    targetElement: fakeTargetElement(),
  }));
  const uninstallResult = uninstallController.end(4);
  assert.equal(uninstallResult, "uninstalled", "drop on storage resolves to uninstall");
  assert.deepEqual(
    uninstallActions[0],
    { type: "UNINSTALL_LAYOUT_KEY", fromSurface: "keypad_f", fromIndex: 3 },
    "storage drop from keypad dispatches uninstall action",
  );

  const offSurfaceActions: Action[] = [];
  const offSurfaceController = createTouchRearrangeController();
  offSurfaceController.syncContext(moveState, (action) => {
    offSurfaceActions.push(action);
    return action;
  });
  offSurfaceController.startPress(5, 30, 40, { surface: "keypad_f", index: 3, key: k("exec_equals") }, null);
  offSurfaceController.forceActivateCarryForTests();
  offSurfaceController.move(5, 60, 70, () => ({
    target: null,
    targetElement: null,
  }));
  const offSurfaceResult = offSurfaceController.end(5);
  assert.equal(offSurfaceResult, "uninstalled", "off-calculator drop resolves to uninstall");
  assert.deepEqual(
    offSurfaceActions[0],
    { type: "UNINSTALL_LAYOUT_KEY", fromSurface: "keypad_f", fromIndex: 3 },
    "off-calculator drop from keypad dispatches uninstall action",
  );
};






