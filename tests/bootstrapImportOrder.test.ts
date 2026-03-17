import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const runFreshImport = (modulePath: string): { status: number | null; stderr: string } => {
  const script = `await import(${JSON.stringify(pathToFileURL(modulePath).href)});`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  return {
    status: result.status,
    stderr: result.stderr ?? "",
  };
};

export const runBootstrapImportOrderTests = (): void => {
  const importTargets = [
    resolve(process.cwd(), "dist/src/app/allocatorCueCoordinator.js"),
    resolve(process.cwd(), "dist/src/domain/functionCapabilityProviders.js"),
  ];

  for (const target of importTargets) {
    const outcome = runFreshImport(target);
    assert.equal(
      outcome.status,
      0,
      `module import must not require preconfigured content provider: ${target}\n${outcome.stderr}`,
    );
  }
};
