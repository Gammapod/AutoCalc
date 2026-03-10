import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const runBootstrapBoundaryTests = (): void => {
  const bootstrapSource = readFileSync(resolve(process.cwd(), "src/app/bootstrap.ts"), "utf8");

  const bannedSelectors = [
    "[data-debug-toggle]",
    "[data-debug-menu]",
    "[data-debug-clear-save]",
    "[data-debug-unlock-all]",
    "[data-debug-keypad-width]",
    "[data-debug-keypad-height]",
    "[data-debug-apply-keypad-size]",
    "[data-debug-upgrade-keypad-row]",
    "[data-debug-upgrade-keypad-column]",
    "[data-debug-max-points]",
    "[data-debug-apply-max-points]",
    "[data-debug-roll-state]",
    "[data-debug-toggle-ui-shell]",
    "[data-allocator-action]",
  ];

  for (const selector of bannedSelectors) {
    assert.equal(
      bootstrapSource.includes(selector),
      false,
      `bootstrap should not query UI control selector: ${selector}`,
    );
  }

  assert.equal(
    bootstrapSource.includes("addEventListener("),
    false,
    "bootstrap should not wire direct UI event listeners",
  );

  assert.equal(
    existsSync(resolve(process.cwd(), "src/ui/modules/calculatorRenderer.ts")),
    false,
    "calculator wrapper file removed",
  );
  assert.equal(
    existsSync(resolve(process.cwd(), "src/ui/modules/storageRenderer.ts")),
    false,
    "storage wrapper file removed",
  );
  assert.equal(
    existsSync(resolve(process.cwd(), "src/ui/modules/programmaticKeyFeedback.ts")),
    false,
    "programmatic key feedback wrapper file removed",
  );
};
