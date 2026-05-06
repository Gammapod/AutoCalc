import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { resolveKeyCapability } from "../src/domain/keyUnlocks.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { applyUnlocks } from "../src/domain/unlocks.js";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { buildStorageRenderOrder } from "../src/ui/modules/storage/viewModel.js";
import { evaluateLayoutDrop } from "../src/domain/layoutRules.js";
import { classifyDropAction } from "../src/domain/layoutDragDrop.js";
import { reducer } from "../src/domain/reducer.js";
import { k } from "./support/keyCompat.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });

export const runKeyCapabilityProgressionTests = (): void => {
  const base = initialState();
  const digit1Index = base.ui.keyLayout.findIndex((cell) => cell.kind === "key" && cell.key === k("digit_1"));
  const saveQuitIndex = base.ui.keyLayout.findIndex((cell) => cell.kind === "key" && cell.key === k("system_save_quit_main_menu"));
  assert.ok(digit1Index >= 0, "digit_1 starts installed on the default keypad");
  assert.ok(saveQuitIndex >= 0, "Save&Quit starts installed on the default keypad");
  assert.equal(resolveKeyCapability(base, k("digit_1")), "locked", "digit_1 starts fully locked");
  assert.equal(resolveKeyCapability(base, k("exec_equals")), "portable", "portable keys remain portable");

  const lockedPress = reducer(base, { type: "PRESS_KEY", key: k("digit_1") });
  assert.equal(lockedPress.keyPressCounts[k("digit_1")], undefined, "locked installed key does not increment press count");
  assert.deepEqual(lockedPress.calculator.operationSlots, base.calculator.operationSlots, "locked installed key press has no effect");

  const installedOnlyUnlocked = applyUnlocks(
    {
      ...base,
      calculator: {
        ...base.calculator,
        total: r(1n),
      },
    },
    unlockCatalog,
  );
  assert.equal(resolveKeyCapability(installedOnlyUnlocked, k("digit_1")), "installed_only", "digit_1 becomes installed_only when total == 1");
  assert.equal(buildStorageRenderOrder(installedOnlyUnlocked).includes(k("digit_1")), false, "installed_only keys are excluded from storage");
  assert.equal(
    buildStorageRenderOrder(installedOnlyUnlocked, { includeLocked: true }).includes(k("digit_1")),
    true,
    "debug storage mode can include installed_only keys",
  );

  const emptyStorageIndex = installedOnlyUnlocked.ui.storageLayout.findIndex((cell) => cell === null);
  assert.ok(emptyStorageIndex >= 0, "fixture has an empty storage slot");
  const installedOnlyToStorage = evaluateLayoutDrop(
    installedOnlyUnlocked,
    { surface: "keypad", index: digit1Index },
    { surface: "storage", index: emptyStorageIndex },
  );
  assert.deepEqual(installedOnlyToStorage, { allowed: false, reason: "locked_key_immobile" }, "installed_only key cannot move off-calculator");
  const installedOnlySwap = evaluateLayoutDrop(
    installedOnlyUnlocked,
    { surface: "keypad", index: digit1Index },
    { surface: "keypad", index: saveQuitIndex },
  );
  assert.deepEqual(installedOnlySwap, { allowed: true, action: "swap" }, "installed_only key can swap within its calculator");
  const installedOnlySwapWithDebugBypass = classifyDropAction(
    installedOnlyUnlocked,
    { surface: "keypad", index: digit1Index },
    { surface: "keypad", index: saveQuitIndex },
    k("digit_1"),
    { debugUnlockBypass: true },
  );
  assert.equal(installedOnlySwapWithDebugBypass, "swap", "debug drag bypass allows rearranging installed_only keypad keys");

  const portableUnlocked = applyUnlocks(
    {
      ...installedOnlyUnlocked,
      calculator: {
        ...installedOnlyUnlocked.calculator,
        total: r(9n),
      },
    },
    unlockCatalog,
  );
  assert.equal(resolveKeyCapability(portableUnlocked, k("digit_1")), "portable", "digit_1 becomes portable when total == 9");
  assert.equal(buildStorageRenderOrder(portableUnlocked).includes(k("digit_1")), true, "portable keys appear in storage");
  const portableToStorage = evaluateLayoutDrop(
    portableUnlocked,
    { surface: "keypad", index: digit1Index },
    { surface: "storage", index: emptyStorageIndex },
  );
  assert.deepEqual(portableToStorage, { allowed: true, action: "move" }, "portable key can move off-calculator");
};
