import assert from "node:assert/strict";
import { createMainMenuState } from "../src/domain/mainMenuPreset.js";
import { buildShellViewModel } from "../src/ui/renderAdapter.js";
import { modeManifestById } from "../src/domain/modeManifest.js";

export const runMainMenuPresetTests = (): void => {
  const mainMenu = createMainMenuState();
  const shellModel = buildShellViewModel(mainMenu);
  const manifest = modeManifestById.main_menu;

  assert.deepEqual(mainMenu.calculatorOrder, manifest.bootCalculatorOrder, "main menu preset follows mode manifest calculator order");
  assert.equal(mainMenu.activeCalculatorId, manifest.activeCalculatorId, "main menu preset follows mode manifest active calculator");
  for (const calculatorId of manifest.bootCalculatorOrder) {
    assert.equal(Boolean(mainMenu.calculators?.[calculatorId]), true, `main menu materializes manifest calculator: ${calculatorId}`);
  }
  assert.equal(
    Object.keys(mainMenu.calculators ?? {}).every((calculatorId) => manifest.bootCalculatorOrder.includes(calculatorId as typeof manifest.bootCalculatorOrder[number])),
    true,
    "main menu materializes only manifest calculators",
  );
  assert.equal(mainMenu.settings.visualizer, mainMenu.ui.activeVisualizer, "main menu root settings align with active visualizer startup");
  assert.equal(mainMenu.unlocks.uiUnlocks.storageVisible, manifest.storageContentVisible, "main menu storage drawer follows mode manifest");
  assert.equal(Array.isArray(shellModel.menuModules), true, "main menu shell exposes a menu module list");
  assert.equal(shellModel.availableSnaps.includes(shellModel.defaultSnap), true, "main menu default snap is available");
  assert.equal(
    shellModel.availableSnaps.includes("bottom"),
    manifest.storageContentVisible,
    "main menu bottom snap availability follows storage visibility",
  );
  assert.equal(mainMenu.ui.buttonFlags["mode.storage_content_visible"], manifest.storageContentVisible, "main menu storage-content flag follows mode manifest");

  if (manifest.initialLockPolicy === "all_keys_locked") {
    assert.ok(Object.values(mainMenu.unlocks.valueAtoms).every((value) => value === false), "main menu locks value atom keys under all-locked policy");
    assert.ok(Object.values(mainMenu.unlocks.valueCompose).every((value) => value === false), "main menu locks value compose keys under all-locked policy");
    assert.ok(Object.values(mainMenu.unlocks.valueExpression).every((value) => value === false), "main menu locks value expression keys under all-locked policy");
    assert.ok(Object.values(mainMenu.unlocks.slotOperators).every((value) => value === false), "main menu locks slot operator keys under all-locked policy");
    assert.ok(Object.values(mainMenu.unlocks.unaryOperators).every((value) => value === false), "main menu locks unary keys under all-locked policy");
    assert.ok(Object.values(mainMenu.unlocks.utilities).every((value) => value === false), "main menu locks utility keys under all-locked policy");
    assert.ok(Object.values(mainMenu.unlocks.memory).every((value) => value === false), "main menu locks memory keys under all-locked policy");
    assert.ok(Object.values(mainMenu.unlocks.visualizers).every((value) => value === false), "main menu locks visualizer keys under all-locked policy");
    assert.ok(Object.values(mainMenu.unlocks.execution).every((value) => value === false), "main menu locks execution keys under all-locked policy");
  }
};
