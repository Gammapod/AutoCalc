import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { renderReleaseNotesVisualizerPanel } from "../src/ui/modules/visualizers/releaseNotesRenderer.js";
import { defaultContentProvider } from "../src/content/defaultContentProvider.js";
import { APP_VERSION } from "../src/generated/appVersion.js";
import { installDomHarness } from "./helpers/domHarness.js";

const normalizeVersion = (version: string): string =>
  version
    .trim()
    .toLowerCase()
    .replace(/^v/, "")
    .split(/[+-]/, 1)[0] ?? "";

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
    const expectedVersionToken = `v${APP_VERSION}`;
    const expectedReleaseNote = defaultContentProvider.releaseNotes.entries.find((entry) =>
      normalizeVersion(entry.releaseVersion) === normalizeVersion(expectedVersionToken));
    assert.ok(expectedReleaseNote, `release note entry exists for ${expectedVersionToken}`);
    assert.match(
      panel.textContent ?? "",
      new RegExp(expectedVersionToken.replace(".", "\\."), "u"),
      "release notes panel includes current version token",
    );
    assert.equal(
      (panel.textContent ?? "").includes(expectedReleaseNote.title),
      true,
      "release notes panel includes current version note title",
    );
    assert.equal(
      (panel.textContent ?? "").includes(expectedReleaseNote.summary),
      true,
      "release notes panel includes current version note summary",
    );
  } finally {
    harness.teardown();
  }
};
