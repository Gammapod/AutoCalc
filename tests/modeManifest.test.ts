import assert from "node:assert/strict";
import { modeManifestById } from "../src/domain/modeManifest.js";

export const runModeManifestTests = (): void => {
  const modes = Object.values(modeManifestById);
  assert.equal(modes.length, 3, "mode manifest defines game/sandbox/main_menu");

  for (const manifest of modes) {
    assert.equal(manifest.bootCalculatorOrder.length >= 1, true, `${manifest.mode} has a boot calculator order`);
    assert.equal(
      new Set(manifest.bootCalculatorOrder).has(manifest.activeCalculatorId),
      true,
      `${manifest.mode} active calculator is present in boot order`,
    );
    assert.equal(
      typeof manifest.modeButtonFlags["mode.storage_content_visible"],
      "boolean",
      `${manifest.mode} defines storage content visibility policy`,
    );
    assert.equal(
      typeof manifest.modeButtonFlags["mode.checklist_content_visible"],
      "boolean",
      `${manifest.mode} defines checklist content visibility policy`,
    );
  }

  const mainMenu = modeManifestById.main_menu;
  assert.deepEqual(mainMenu.bootCalculatorOrder, ["menu"], "main menu boots with menu calculator only");
  assert.equal(mainMenu.initialLockPolicy, "all_keys_locked", "main menu starts with all keys locked");
  assert.equal(mainMenu.storageContentVisible, false, "main menu hides storage contents");
  assert.equal(mainMenu.checklistContentVisible, false, "main menu hides checklist contents");
};
