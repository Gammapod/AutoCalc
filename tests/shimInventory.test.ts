import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export const runShimInventoryTests = (): void => {
  const removedShimPaths = [
    "src/app/ui/bootstrapUiController.ts",
    "src/app/ui/bootstrapUiRefs.ts",
    "src/ui/layout/cueLifecycle.ts",
    "src/ui/layout/cueTelemetry.ts",
  ];

  for (const relativePath of removedShimPaths) {
    assert.equal(
      existsSync(resolve(process.cwd(), relativePath)),
      false,
      `migration shim must stay removed: ${relativePath}`,
    );
  }
};

