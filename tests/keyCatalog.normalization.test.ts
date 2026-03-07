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
  const valueCompose = keyCatalog.filter((entry) => entry.unlockGroup === "valueCompose").map((entry) => entry.key);
  assert.ok(valueAtoms.includes("0") && valueAtoms.includes("9"), "digit literals belong to valueAtoms group");
  assert.ok(valueCompose.includes("NEG"), "NEG belongs to valueCompose group");

  for (const entry of keyCatalog) {
    if (entry.behaviorKind === "visualizer") {
      assert.ok(entry.visualizerId, `visualizer key ${entry.key} must define visualizerId`);
    }
    if (entry.behaviorKind === "digit") {
      assert.equal(entry.inputFamily, "atom_digit", `digit key ${entry.key} must use atom_digit family`);
      assert.equal(entry.valueRole, "literal", `digit key ${entry.key} must use literal value role`);
    }
  }

  for (const provider of staticFunctionCapabilityProviders) {
    assert.ok(provider.sufficiency.length > 0, `generated provider ${provider.id} must include sufficient clauses`);
  }
};
