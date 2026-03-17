import assert from "node:assert/strict";
import { defaultContentProvider } from "../src/content/defaultContentProvider.js";
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
  assert.ok(provider.unlockCatalog.length > 0, "provider unlock catalog must be available after wiring");
  assert.ok(provider.uiText.analysis.title.length > 0, "provider UI text must be available after wiring");
};
