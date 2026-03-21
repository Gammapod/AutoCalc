import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { keyCatalog } from "../src/content/keyCatalog.js";
import { keyRuntimeCatalog } from "../src/content/keyRuntimeCatalog.js";
import { defaultContentProvider } from "../src/content/defaultContentProvider.js";

export const runKeyUniverseContractGuardTests = (): void => {
  assert.equal(
    "keyCatalog" in defaultContentProvider,
    false,
    "content provider must not carry key catalog",
  );
  assert.equal(
    "keyRuntimeCatalog" in defaultContentProvider,
    false,
    "content provider must not carry runtime key catalog",
  );

  const contractSource = readFileSync(resolve(process.cwd(), "src/contracts/contentProvider.ts"), "utf8");
  assert.equal(
    contractSource.includes("keyCatalog"),
    false,
    "content provider contract must not expose keyCatalog",
  );
  assert.equal(
    contractSource.includes("keyRuntimeCatalog"),
    false,
    "content provider contract must not expose keyRuntimeCatalog",
  );

  const contentCatalogSource = readFileSync(resolve(process.cwd(), "src/content/keyCatalog.ts"), "utf8");
  assert.ok(
    contentCatalogSource.includes("../contracts/keyCatalog.js"),
    "content key catalog must re-export canonical contract catalog",
  );

  const contentRuntimeCatalogSource = readFileSync(resolve(process.cwd(), "src/content/keyRuntimeCatalog.ts"), "utf8");
  assert.ok(
    contentRuntimeCatalogSource.includes("keyRuntimeCatalog = keyCatalog.map"),
    "runtime key catalog must derive from canonical key catalog",
  );

  assert.ok(keyCatalog.length > 0, "canonical key catalog must stay populated");
  assert.ok(keyRuntimeCatalog.length > 0, "runtime key catalog must stay populated");
};

