import assert from "node:assert/strict";
import { installDomHarness } from "./helpers/domHarness.js";
import { buildRefsFromExistingShell, createShellDom } from "../src/ui/shell/refs.js";

export const runUiShellRefsBuilderTests = (): void => {
  const harness = installDomHarness();
  try {
    const refs = createShellDom(harness.root);
    assert.equal(refs.shell.dataset.v2ShellRoot, "true", "created shell root has expected data marker");
    const found = buildRefsFromExistingShell(harness.root);
    assert.ok(found, "existing shell refs can be re-discovered");
    assert.equal(found?.controlsMenu.dataset.v2Control, "menu", "menu control resolved from existing shell");
  } finally {
    harness.teardown();
  }
};
