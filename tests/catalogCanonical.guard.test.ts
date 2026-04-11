import assert from "node:assert/strict";
import { keyBehaviorCatalog } from "../src/content/keyBehavior.catalog.js";
import { keyCatalog } from "../src/content/keyCatalog.js";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { isKeyId } from "../src/domain/keyPresentation.js";

export const runCatalogCanonicalGuardTests = (): void => {
  const runtimeKeySet = new Set<string>(keyCatalog.map((entry) => entry.key));
  for (const spec of keyBehaviorCatalog) {
    assert.equal(isKeyId(spec.key), true, `keyBehavior catalog key must be canonical: ${spec.key}`);
    assert.equal(runtimeKeySet.has(spec.key), true, `keyBehavior key must exist in keyCatalog: ${spec.key}`);
  }

  for (const unlock of unlockCatalog) {
    if ("key" in unlock.effect) {
      assert.equal(isKeyId(unlock.effect.key), true, `unlock effect key must be canonical: ${unlock.id}`);
      assert.equal(runtimeKeySet.has(unlock.effect.key), true, `unlock effect key must exist in keyCatalog: ${unlock.id}`);
    }
  }
};
