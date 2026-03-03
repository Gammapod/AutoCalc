import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { buildShellViewModel, createShellController, getMenuA11yState, shouldCloseMenuFromSwipe } from "../src_v2/ui/renderAdapter.js";

export const runUiShellRightMenuTests = (): void => {
  const state = initialState();
  const model = buildShellViewModel(state);
  const controller = createShellController();
  controller.sync(state);

  assert.equal(controller.runtime.menuOpen, false, "menu starts closed");
  assert.equal(controller.toggleMenu(), true, "toggle opens menu");
  assert.equal(controller.runtime.menuOpen, true, "menu open state updates");
  assert.equal(controller.toggleMenu(), false, "toggle closes menu");
  assert.equal(controller.runtime.menuOpen, false, "menu close state updates");

  controller.setMenuOpen(true);
  assert.equal(controller.runtime.menuOpen, true, "menu can be explicitly opened");
  assert.equal(controller.runtime.menuActiveModule, "checklist", "checklist is the sole active menu module");
  assert.ok(model.menuModules.includes(controller.runtime.menuActiveModule), "active module remains one of view-model modules");

  assert.deepEqual(
    getMenuA11yState(false),
    { ariaHidden: "true", inert: true },
    "closed menu maps to aria-hidden=true and inert",
  );
  assert.deepEqual(
    getMenuA11yState(true),
    { ariaHidden: "false", inert: false },
    "open menu maps to aria-hidden=false and non-inert",
  );

  assert.equal(shouldCloseMenuFromSwipe(96, 0), true, "long right swipe closes menu");
  assert.equal(shouldCloseMenuFromSwipe(95, 0), false, "short right swipe does not close menu");
  assert.equal(shouldCloseMenuFromSwipe(120, 140), false, "mostly-vertical swipe does not close menu");
};
