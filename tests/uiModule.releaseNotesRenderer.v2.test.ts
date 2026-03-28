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
    const currentVersionParts = normalizeVersion(expectedVersionToken).split(".").map((part) => Number.parseInt(part, 10));
    const compareParts = (left: readonly number[], right: readonly number[]): number => {
      const limit = Math.max(left.length, right.length);
      for (let index = 0; index < limit; index += 1) {
        const leftValue = left[index] ?? 0;
        const rightValue = right[index] ?? 0;
        if (leftValue !== rightValue) {
          return leftValue - rightValue;
        }
      }
      return 0;
    };
    const expectedReleaseNote = defaultContentProvider.releaseNotes.entries
      .map((entry) => ({
        entry,
        parts: normalizeVersion(entry.releaseVersion).split(".").map((part) => Number.parseInt(part, 10)),
      }))
      .filter(({ parts }) => compareParts(parts, currentVersionParts) <= 0)
      .sort((left, right) => compareParts(right.parts, left.parts))[0]?.entry;
    assert.ok(expectedReleaseNote, `release note entry exists at or before ${expectedVersionToken}`);
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
      "release notes panel includes resolved version note summary",
    );
  } finally {
    harness.teardown();
  }
};
