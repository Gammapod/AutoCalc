import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import { classifyDropAction } from "../src/domain/layoutDragDrop.js";
import { materializeCalculatorG, projectCalculatorToLegacy } from "../src/domain/multiCalculator.js";
import { buildStorageRenderOrder } from "../src/ui/modules/storage/viewModel.js";
import type { GameState } from "../src/domain/types.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";

export const runStoragePaletteContractTests = (): void => {
  const base = initialState();

  const unlockedOnlyState: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      valueExpression: {
        ...base.unlocks.valueExpression,
        [k("digit_1")]: true,
        [k("digit_3")]: true,
      },
    },
  };
  const renderOrder = buildStorageRenderOrder(unlockedOnlyState);
  assert.equal(renderOrder.includes(k("digit_1")), true, "storage render order includes unlocked keys");
  assert.equal(renderOrder.includes(k("op_add")), false, "storage render order excludes locked keys");

  const dualUnlocked = materializeCalculatorG(initialState());
  const duplicateStorageSeed: GameState = {
    ...dualUnlocked,
    ui: {
      ...dualUnlocked.ui,
      storageLayout: [
        { kind: "key", key: KEY_ID.exec_equals },
        ...dualUnlocked.ui.storageLayout,
      ],
    },
  };
  const normalizedDuplicateStorage = reducer(duplicateStorageSeed, { type: "SET_ACTIVE_CALCULATOR", calculatorId: "f" });
  const normalizedDuplicateF = projectCalculatorToLegacy(normalizedDuplicateStorage, "f");
  assert.equal(
    normalizedDuplicateF.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === KEY_ID.exec_equals),
    true,
    "keypad ownership stays unique per calculator by key ID",
  );
  assert.equal(
    normalizedDuplicateStorage.ui.storageLayout.some((cell) => cell?.kind === "key" && cell.key === KEY_ID.exec_equals),
    false,
    "storage removes duplicate key IDs already installed on keypad",
  );

  const baselineWithUnlockedUtility: GameState = {
    ...base,
    unlocks: {
      ...base.unlocks,
      utilities: {
        ...base.unlocks.utilities,
        [utility("util_clear_all")]: true,
      },
    },
  };
  const baselineWithSpace = reducer(baselineWithUnlockedUtility, { type: "SET_KEYPAD_DIMENSIONS", columns: 4, rows: 1 });
  const executionKeypadIndex = baselineWithSpace.ui.keyLayout.findIndex(
    (cell) => cell.kind === "key" && cell.key === k("exec_equals"),
  );
  assert.ok(executionKeypadIndex >= 0, "setup: baseline keypad includes execution key");

  const installReplaceOccupiedKey = reducer(baselineWithSpace, {
    type: "INSTALL_KEY_FROM_STORAGE",
    key: utility("util_clear_all"),
    toSurface: "keypad",
    toIndex: executionKeypadIndex,
  });
  assert.equal(
    installReplaceOccupiedKey.ui.keyLayout[executionKeypadIndex]?.kind === "key"
      ? installReplaceOccupiedKey.ui.keyLayout[executionKeypadIndex].key
      : null,
    utility("util_clear_all"),
    "install from storage onto occupied keypad slot replaces destination key",
  );
  assert.equal(
    installReplaceOccupiedKey.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === k("exec_equals")),
    false,
    "replaced key is uninstalled from keypad",
  );

  const uninstallOffCalculator = classifyDropAction(
    baselineWithSpace,
    { surface: "keypad", index: executionKeypadIndex },
    null,
  );
  assert.equal(uninstallOffCalculator, "uninstall", "dragging keypad key off-calculator uninstalls it");

  const uninstallExecutionKey = reducer(baselineWithSpace, {
    type: "UNINSTALL_LAYOUT_KEY",
    fromSurface: "keypad",
    fromIndex: executionKeypadIndex,
  });
  assert.equal(
    uninstallExecutionKey.ui.keyLayout[executionKeypadIndex]?.kind,
    "placeholder",
    "uninstall allows removing execution keys from keypad",
  );
};
