import assert from "node:assert/strict";
import { keyCatalog } from "../src/content/keyCatalog.js";
import { keyRuntimeCatalog } from "../src/content/keyRuntimeCatalog.js";
import { staticFunctionCapabilityProviders } from "../src/domain/functionCapabilityProviders.js";

export const runKeyCatalogNormalizationTests = (): void => {
  const keys = keyCatalog.map((entry) => entry.key);
  assert.equal(new Set(keys).size, keys.length, "normalized key catalog must not contain duplicate keys");

  const runtimeKeys = keyRuntimeCatalog.map((entry) => entry.key).sort((a, b) => a.localeCompare(b));
  const catalogKeys = [...keys].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(runtimeKeys, catalogKeys, "runtime adapter key set must stay aligned with normalized catalog");

  const valueAtoms = keyCatalog.filter((entry) => entry.unlockGroup === "valueAtoms").map((entry) => entry.key);
  assert.ok(valueAtoms.includes("0") && valueAtoms.includes("9"), "digit literals belong to valueAtoms group");

  for (const entry of keyCatalog) {
    if (entry.behaviorKind === "visualizer") {
      if (entry.key === "GRAPH" || entry.key === "FEED" || entry.key === "CIRCLE") {
        assert.ok(("visualizerId" in entry ? entry.visualizerId : undefined), `visualizer key ${entry.key} must define visualizerId`);
      }
    }
    if (entry.behaviorKind === "digit") {
      if (entry.valueRole === "constant") {
        assert.equal(entry.inputFamily, "atom_constant", `constant atom key ${entry.key} must use atom_constant family`);
      } else {
        assert.equal(entry.inputFamily, "atom_digit", `digit key ${entry.key} must use atom_digit family`);
        assert.equal(entry.valueRole, "literal", `digit key ${entry.key} must use literal value role`);
      }
    }
  }

  assert.ok(staticFunctionCapabilityProviders.length > 0, "generated capability providers should be present");
};
