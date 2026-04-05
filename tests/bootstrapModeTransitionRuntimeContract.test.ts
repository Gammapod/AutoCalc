import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const runBootstrapModeTransitionRuntimeContractTests = (): void => {
  const bootstrapSource = readFileSync(resolve(process.cwd(), "src/app/bootstrap.ts"), "utf8");

  assert.equal(
    bootstrapSource.includes("createModeTransitionCoordinator"),
    true,
    "bootstrap wires mode transition coordinator",
  );
  assert.equal(
    bootstrapSource.includes("modeTransitionCoordinator.requestModeTransition"),
    true,
    "store subscription requests transitions through coordinator",
  );
  assert.equal(
    bootstrapSource.includes("resolveModeTransitionRuntimeEnabled"),
    false,
    "bootstrap no longer resolves runtime mode transition feature flags",
  );
  assert.equal(
    bootstrapSource.includes("runtimeEnabled: () =>"),
    false,
    "bootstrap no longer passes runtime enable/disable callback into coordinator",
  );
  assert.equal(
    bootstrapSource.includes("onLegacyNavigate:"),
    false,
    "bootstrap no longer wires legacy URL navigation fallback for mode transitions",
  );
  assert.equal(
    bootstrapSource.includes("window.location.assign(getAppModeUrl("),
    false,
    "bootstrap no longer performs URL-reload navigation on mode transition requests",
  );
  assert.equal(
    bootstrapSource.includes("document.body.setAttribute(\"data-app-mode\", currentAppMode)"),
    true,
    "bootstrap still synchronizes app-mode shell attribute after runtime transitions",
  );
};
