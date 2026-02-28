import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";

export const runRuntimeDependencyMapTests = async (): Promise<void> => {
  const generatorModuleUrl = pathToFileURL(
    join(process.cwd(), "scripts", "generate-runtime-dependency-map.mjs"),
  ).href;
  const generatorModule = await import(generatorModuleUrl);
  const toMermaidNodeId = generatorModule.toMermaidNodeId as (unlockId: string) => string;
  const buildDomainEdges = generatorModule.buildDomainEdges as (
    unlocks: Array<{ id: string; domainNodeId?: string; targetNodeId?: string }>,
  ) => string[];
  await generatorModule.generateRuntimeDependencyMap(process.cwd());

  const runtimeMapPath = join(process.cwd(), "design_refs", "dependency_map.runtime.mmd");
  const runtimeMap = readFileSync(runtimeMapPath, "utf8");

  assert.match(runtimeMap, /subgraph Unlocks \["Unlocks"\]/, "generated map includes Unlocks subgraph");

  const unlockNodeMatches = runtimeMap.match(/^\s*U_[A-Za-z0-9_]+\["/gm) ?? [];
  assert.equal(
    unlockNodeMatches.length,
    unlockCatalog.length,
    "generated map has one unlock node per unlock definition",
  );

  const domainEdgeMatches = runtimeMap.match(/^(NN|NZ|NQ|NA|NR|NC) --> U_[A-Za-z0-9_]+$/gm) ?? [];
  assert.equal(
    domainEdgeMatches.length,
    unlockCatalog.length,
    "generated map has one number-domain edge per unlock definition",
  );

  const unlockTargetEdgeMatches = runtimeMap.match(/^U_[A-Za-z0-9_]+ --> [A-Za-z][A-Za-z0-9_]*$/gm) ?? [];
  assert.equal(
    unlockTargetEdgeMatches.length,
    unlockCatalog.length,
    "generated map has one unlock-target edge per unlock definition",
  );

  for (const unlock of unlockCatalog) {
    const unlockNodeId = toMermaidNodeId(unlock.id);
    assert.match(
      runtimeMap,
      new RegExp(`^${unlock.domainNodeId} --> ${unlockNodeId}$`, "m"),
      `domain edge for ${unlock.id} comes from catalog metadata`,
    );
    assert.match(
      runtimeMap,
      new RegExp(`^${unlockNodeId} --> ${unlock.targetNodeId}$`, "m"),
      `target edge for ${unlock.id} comes from catalog metadata`,
    );
  }

  const equalsNodeId = toMermaidNodeId("unlock_equals_on_total_11");
  const storageNodeId = toMermaidNodeId("unlock_storage_on_total_11");
  const plusNodeId = toMermaidNodeId("unlock_plus_on_equal_run_4");
  const oneNodeId = toMermaidNodeId("unlock_1_on_plus_press_first");
  const cNodeId = toMermaidNodeId("unlock_c_on_increment_run_4");

  assert.match(runtimeMap, new RegExp(`^NN --> ${storageNodeId}$`, "m"), "storage unlock is downstream of NN");
  assert.match(runtimeMap, new RegExp(`^NN --> ${plusNodeId}$`, "m"), "plus unlock is downstream of NN");
  assert.match(runtimeMap, new RegExp(`^${plusNodeId} --> Oplus$`, "m"), "plus unlock points to Oplus");
  assert.match(runtimeMap, new RegExp(`^${oneNodeId} --> I1_unlock$`, "m"), "digit-1 unlock points to I1 unlock target");
  assert.match(runtimeMap, new RegExp(`^${cNodeId} --> Uc_unlock$`, "m"), "C unlock points to Uc unlock target");
  assert.match(runtimeMap, new RegExp(`^${equalsNodeId} --> Ut_exec_eq$`, "m"), "equals unlock points to synthetic execution node");
  assert.match(runtimeMap, /^\s*Ut_exec_eq\["="\]$/m, "synthetic execution node is defined");
  assert.doesNotMatch(runtimeMap, /Ut_digit_/, "no synthetic digit nodes are generated");

  assert.throws(
    () => buildDomainEdges([{ id: "invalid_domain", domainNodeId: "BAD", targetNodeId: "Oplus" }]),
    /Invalid or missing domainNodeId/,
    "domain metadata validation fails fast for invalid domain ids",
  );
  assert.throws(
    () => buildDomainEdges([{ id: "missing_target", domainNodeId: "NN" }]),
    /Missing targetNodeId/,
    "target metadata validation fails fast for missing target ids",
  );
};
