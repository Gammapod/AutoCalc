import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const runBootstrapModeTransitionRuntimeContractTests = (): void => {
  const bootstrapSource = readFileSync(resolve(process.cwd(), "src/app/bootstrap.ts"), "utf8");

  assert.equal(
    bootstrapSource.includes("resolveModeTransitionRuntimeEnabled"),
    true,
    "bootstrap resolves runtime mode transition feature flag",
  );
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
    bootstrapSource.includes("runtimeEnabled: () => modeTransitionRuntimeEnabled"),
    true,
    "bootstrap passes runtime-enabled gate into coordinator",
  );
  assert.equal(
    bootstrapSource.includes("onLegacyNavigate: (mode) =>"),
    true,
    "bootstrap keeps legacy URL navigation fallback path for phased rollout",
  );
};

