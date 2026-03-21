import assert from "node:assert/strict";
import { keyCatalog } from "../src/content/keyCatalog.js";
import { keyRuntimeCatalog } from "../src/content/keyRuntimeCatalog.js";
import { staticFunctionCapabilityProviders } from "../src/domain/functionCapabilityProviders.js";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { initialState } from "../src/domain/state.js";
import { getKeyInternalRef, isKeyId, keyPresentationCatalog } from "../src/domain/keyPresentation.js";

export const runKeyCatalogNormalizationTests = (): void => {
  const keys = keyCatalog.map((entry) => entry.key);
  assert.equal(new Set(keys).size, keys.length, "normalized key catalog must not contain duplicate keys");

  const runtimeKeys = keyRuntimeCatalog.map((entry) => entry.key).sort((a, b) => a.localeCompare(b));
  const catalogKeys = [...keys].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(runtimeKeys, catalogKeys, "runtime adapter key set must stay aligned with normalized catalog");

  const presentationKeys = keyPresentationCatalog.map((entry) => entry.keyId).sort((a, b) => a.localeCompare(b));
  assert.deepEqual(presentationKeys, catalogKeys, "key presentation catalog must define every key exactly once");

  const internalRefs = keys.map((key) => getKeyInternalRef(key));
  assert.equal(new Set(internalRefs).size, internalRefs.length, "key internal refs must be unique");

  const fromCanonical = keyPresentationCatalog.map((entry) => getKeyInternalRef(entry.keyId)).sort((a, b) => a.localeCompare(b));
  assert.deepEqual(fromCanonical, catalogKeys, "catalog and presentation key paths resolve to the same key ids");
  assert.ok(fromCanonical.every((id) => isKeyId(id)), "all internal refs resolve to canonical key ids");

  for (const entry of keyPresentationCatalog) {
    if (entry.keyId.startsWith("op_") || entry.keyId.startsWith("unary_")) {
      assert.ok(entry.operatorInlineFace, `operator-like key ${entry.keyId} should define inline face`);
      assert.ok(entry.operatorSlotFace, `operator-like key ${entry.keyId} should define slot face`);
      assert.ok(entry.operatorAlgebraicFace, `operator-like key ${entry.keyId} should define algebraic face`);
    }
  }

  const valueAtoms = keyCatalog.filter((entry) => entry.unlockGroup === "valueAtoms").map((entry) => entry.key);
  assert.ok(valueAtoms.includes("digit_0") && valueAtoms.includes("digit_9"), "digit literals belong to valueAtoms group");

  const state = initialState();
  for (const cell of state.ui.keyLayout) {
    if (cell.kind === "key") {
      assert.ok(isKeyId(cell.key), `default keypad key must be canonical keyId: ${cell.key}`);
    }
  }
  for (const cell of state.ui.storageLayout) {
    if (cell?.kind === "key") {
      assert.ok(isKeyId(cell.key), `default storage key must be canonical keyId: ${cell.key}`);
    }
  }

  for (const unlock of unlockCatalog) {
    if ("key" in unlock.effect) {
      assert.ok(isKeyId(unlock.effect.key), `unlock effect key must be canonical keyId: ${unlock.id}`);
    }
    if (unlock.predicate.type === "key_press_count_at_least") {
      assert.ok(isKeyId(unlock.predicate.key), `unlock predicate key must be canonical keyId: ${unlock.id}`);
    }
  }

  for (const entry of keyCatalog) {
    if (entry.behaviorKind === "visualizer") {
      if (entry.key === "viz_graph" || entry.key === "viz_feed" || entry.key === "viz_circle") {
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

