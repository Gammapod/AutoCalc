import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

export const runUiComplexityGateTests = (): void => {
  const script = resolve(process.cwd(), "scripts/check-ui-complexity.mjs");

  const baseline = spawnSync("node", [script], { encoding: "utf8" });
  assert.equal(baseline.status, 0, `complexity script should pass baseline: ${baseline.stderr}`);

  const fixture = resolve(process.cwd(), "tests/fixtures/uiComplexity.bad.ts");
  const failing = spawnSync("node", [script, `--files=${fixture}`], { encoding: "utf8" });
  assert.notEqual(failing.status, 0, "complexity script should fail for intentionally complex fixture");
};
