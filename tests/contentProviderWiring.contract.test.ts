import assert from "node:assert/strict";
import { defaultContentProvider } from "../src/content/defaultContentProvider.js";
import { isBinaryOperatorKeyId, keyPresentationCatalog } from "../src/domain/keyPresentation.js";
import {
  clearContentProviderForTests,
  getContentProvider,
  setContentProvider,
} from "../src/contracts/contentRegistry.js";

export const runContentProviderWiringContractTests = (): void => {
  clearContentProviderForTests();
  assert.throws(
    () => getContentProvider(),
    /Content provider not configured/,
    "content provider access must fail fast before composition wiring",
  );

  setContentProvider(defaultContentProvider);
  const provider = getContentProvider();
  assert.equal(provider, defaultContentProvider, "configured content provider round-trips by identity");

  assert.equal(Array.isArray(provider.unlockCatalog), true, "unlock catalog is available as a list");
  assert.equal(provider.unlockCatalog.length > 0, true, "unlock catalog contains progression content");

  assert.equal(typeof provider.uiText.analysis.title, "string", "analysis title is wired");
  assert.equal(provider.uiText.analysis.title.trim().length > 0, true, "analysis title is non-empty");

  const representativeBinaryKey = keyPresentationCatalog.map((entry) => entry.keyId).find(isBinaryOperatorKeyId);
  assert.ok(representativeBinaryKey, "key presentation catalog provides a representative binary key");
  if (!representativeBinaryKey) {
    return;
  }
  assert.equal(Boolean(provider.diagnostics.keys[representativeBinaryKey]), true, "diagnostics include representative binary key entry");
  assert.equal(
    provider.diagnostics.operations.binary[representativeBinaryKey]?.expandedShortTemplate.trim().length > 0,
    true,
    "diagnostics include binary operation templates used by resolvers",
  );

  assert.equal(Array.isArray(provider.releaseNotes.entries), true, "release notes list is wired");
  assert.equal(provider.releaseNotes.entries.length > 0, true, "release notes contain at least one entry");
  assert.equal(
    typeof provider.releaseNotes.entries[0]?.releaseVersion === "string" && provider.releaseNotes.entries[0]?.releaseVersion.length > 0,
    true,
    "release notes entries include version metadata",
  );
};

