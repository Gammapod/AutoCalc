import assert from "node:assert/strict";
import { createMainMenuState } from "../src/domain/mainMenuPreset.js";
import { buildShellViewModel } from "../src/ui/renderAdapter.js";

export const runMainMenuPresetTests = (): void => {
  const mainMenu = createMainMenuState();
  const shellModel = buildShellViewModel(mainMenu);

  assert.deepEqual(mainMenu.calculatorOrder, ["menu"], "main menu starts with only menu in calculator order");
  assert.equal(mainMenu.activeCalculatorId, "menu", "main menu starts with menu active");
  assert.equal(Boolean(mainMenu.calculators?.menu), true, "main menu includes menu calculator");
  assert.equal(Boolean(mainMenu.calculators?.f), false, "main menu does not materialize f");
  assert.equal(Boolean(mainMenu.calculators?.g), false, "main menu does not materialize g");
  assert.equal(mainMenu.ui.activeVisualizer, "title", "main menu starts on title visualizer");
  assert.equal(mainMenu.settings.visualizer, "title", "main menu root settings align with menu visualizer startup");
  assert.equal(mainMenu.unlocks.uiUnlocks.storageVisible, false, "main menu hides storage drawer");
  assert.deepEqual(shellModel.menuModules, [], "main menu has no extra menu modules");
  assert.deepEqual(shellModel.availableSnaps, ["middle"], "main menu restricts shell snaps when storage drawer is hidden");
  assert.equal(shellModel.defaultSnap, "middle", "main menu keeps middle snap as the default shell position");
  assert.equal(mainMenu.ui.buttonFlags["mode.storage_content_visible"], false, "main menu hides storage contents");

  assert.ok(Object.values(mainMenu.unlocks.valueAtoms).every((value) => value === false), "main menu starts with value atom keys locked");
  assert.ok(Object.values(mainMenu.unlocks.valueCompose).every((value) => value === false), "main menu starts with value compose keys locked");
  assert.ok(Object.values(mainMenu.unlocks.valueExpression).every((value) => value === false), "main menu starts with value expression keys locked");
  assert.ok(Object.values(mainMenu.unlocks.slotOperators).every((value) => value === false), "main menu starts with slot operator keys locked");
  assert.ok(Object.values(mainMenu.unlocks.unaryOperators).every((value) => value === false), "main menu starts with unary keys locked");
  assert.ok(Object.values(mainMenu.unlocks.utilities).every((value) => value === false), "main menu starts with utility keys locked");
  assert.ok(Object.values(mainMenu.unlocks.memory).every((value) => value === false), "main menu starts with memory keys locked");
  assert.ok(Object.values(mainMenu.unlocks.visualizers).every((value) => value === false), "main menu starts with visualizer keys locked");
  assert.ok(Object.values(mainMenu.unlocks.execution).every((value) => value === false), "main menu starts with execution keys locked");
};
