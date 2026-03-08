import assert from "node:assert/strict";
import { getMenuA11yState } from "../src/ui/renderAdapter.js";

export const runUiShellMenuA11yTests = (): void => {
  assert.deepEqual(getMenuA11yState(false), { ariaHidden: "true", inert: true }, "closed menu is hidden/inert");
  assert.deepEqual(getMenuA11yState(true), { ariaHidden: "false", inert: false }, "open menu is visible/interactive");
};
