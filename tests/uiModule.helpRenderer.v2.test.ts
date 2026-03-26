import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { defaultContentProvider } from "../src/content/defaultContentProvider.js";
import { renderHelpVisualizerPanel } from "../src/ui/modules/visualizers/helpRenderer.js";
import { installDomHarness } from "./helpers/domHarness.js";

export const runUiModuleHelpRendererV2Tests = (): void => {
  const harness = installDomHarness();
  try {
    const panel = harness.root.querySelector<HTMLElement>("[data-v2-help-panel]");
    assert.ok(panel, "expected help visualizer mount");
    if (!panel) {
      return;
    }

    renderHelpVisualizerPanel(harness.root, initialState());
    assert.equal(panel.getAttribute("aria-hidden"), "false", "help panel is visible after render");
    assert.match(panel.textContent ?? "", /Last Key/u, "help panel includes Last Key section");
    assert.match(panel.textContent ?? "", /Next Operation/u, "help panel includes Next Operation section");
    assert.match(panel.textContent ?? "", /Release Notes/u, "help panel includes Release Notes section");
    assert.match(
      panel.textContent ?? "",
      new RegExp(defaultContentProvider.releaseNotes.entries[0].releaseVersion.replace(".", "\\."), "u"),
      "help panel includes latest release version from content provider",
    );
  } finally {
    harness.teardown();
  }
};
