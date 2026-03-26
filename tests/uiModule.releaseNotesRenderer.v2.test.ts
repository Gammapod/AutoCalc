import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { renderReleaseNotesVisualizerPanel } from "../src/ui/modules/visualizers/releaseNotesRenderer.js";
import { installDomHarness } from "./helpers/domHarness.js";

export const runUiModuleReleaseNotesRendererV2Tests = (): void => {
  const harness = installDomHarness();
  try {
    const panel = harness.root.querySelector<HTMLElement>("[data-v2-release-notes-panel]");
    assert.ok(panel, "expected release notes visualizer mount");
    if (!panel) {
      return;
    }

    renderReleaseNotesVisualizerPanel(harness.root, initialState());
    assert.equal(panel.getAttribute("aria-hidden"), "false", "release notes panel is visible after render");
    assert.match(panel.textContent ?? "", /v0\.9\.4/u, "release notes panel includes current version token");
    assert.match(panel.textContent ?? "", /Diagnostics Foundation/u, "release notes panel includes current version note title");
    assert.match(panel.textContent ?? "", /Stabilizes diagnostics surfaces/u, "release notes panel includes current version summary");
  } finally {
    harness.teardown();
  }
};
