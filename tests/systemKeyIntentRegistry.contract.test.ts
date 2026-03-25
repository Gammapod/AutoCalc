import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { keyCatalog } from "../src/contracts/keyCatalog.js";
import { resolveSystemKeyIntent, systemKeyIntentRegistry } from "../src/domain/systemKeyIntentRegistry.js";

export const runSystemKeyIntentRegistryContractTests = (): void => {
  const globalSystemKeys = keyCatalog
    .filter((entry) => entry.category === "global_system")
    .map((entry) => entry.key);
  assert.ok(globalSystemKeys.length >= 1, "key catalog exposes global-system keys");

  const validModes = new Set(["game", "sandbox", "main_menu"]);
  const validSavePolicies = new Set(["none", "save_current", "clear_save"]);

  for (const key of globalSystemKeys) {
    const intent = resolveSystemKeyIntent(key);
    assert.ok(intent, `${key} must resolve to exactly one system key intent`);
    if (!intent) {
      continue;
    }
    if (intent.type === "mode_transition") {
      assert.equal(validModes.has(intent.targetMode), true, `${key} transition mode must be supported`);
      assert.equal(validSavePolicies.has(intent.savePolicy), true, `${key} save policy must be supported`);
    } else {
      assert.equal(intent.type, "quit_application", `${key} non-transition intent must be quit_application`);
    }
  }

  const registeredKeys = Object.keys(systemKeyIntentRegistry).sort((a, b) => a.localeCompare(b));
  const catalogKeys = globalSystemKeys.slice().sort((a, b) => a.localeCompare(b));
  assert.deepEqual(registeredKeys, catalogKeys, "system intent registry and global system catalog keys stay in sync");
};

