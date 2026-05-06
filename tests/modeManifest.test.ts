import assert from "node:assert/strict";
import { modeManifestById } from "../src/domain/modeManifest.js";
import { controlProfiles } from "../src/domain/controlProfilesCatalog.js";

export const runModeManifestTests = (): void => {
  const modes = Object.values(modeManifestById);
  const modeIds = modes.map((manifest) => manifest.mode);
  assert.equal(new Set(modeIds).size, modes.length, "mode manifest has no duplicate modes");

  for (const manifest of modes) {
    assert.equal(manifest.bootCalculatorOrder.length >= 1, true, `${manifest.mode} has a boot calculator order`);
    assert.equal(new Set(manifest.bootCalculatorOrder).size, manifest.bootCalculatorOrder.length, `${manifest.mode} boot calculator order has no duplicate ids`);
    assert.equal(
      new Set(manifest.bootCalculatorOrder).has(manifest.activeCalculatorId),
      true,
      `${manifest.mode} active calculator is present in boot order`,
    );
    assert.equal(
      manifest.bootCalculatorOrder.every((calculatorId) => calculatorId in controlProfiles),
      true,
      `${manifest.mode} boot calculator ids have control profiles`,
    );
    assert.equal(
      typeof manifest.modeButtonFlags["mode.storage_content_visible"],
      "boolean",
      `${manifest.mode} defines storage content visibility policy`,
    );
    assert.equal(
      manifest.modeButtonFlags["mode.storage_content_visible"],
      manifest.storageContentVisible,
      `${manifest.mode} storage visibility flag matches manifest policy`,
    );
    assert.equal(
      manifest.initialLockPolicy === "default_unlocks" || manifest.initialLockPolicy === "all_keys_locked",
      true,
      `${manifest.mode} uses a supported initial lock policy`,
    );
  }
};
