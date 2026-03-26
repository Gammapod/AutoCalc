import assert from "node:assert/strict";
import { defaultContentProvider } from "../src/content/defaultContentProvider.js";
import {
  isBinaryOperatorKeyId,
  isUnaryOperatorId,
  keyPresentationCatalog,
  type KeyId,
} from "../src/domain/keyPresentation.js";

export const runDiagnosticsCatalogCoverageTests = (): void => {
  const diagnostics = defaultContentProvider.diagnostics;
  const keyIds = keyPresentationCatalog.map((entry) => entry.keyId);

  for (const keyId of keyIds) {
    const entry = diagnostics.keys[keyId];
    assert.ok(entry, `missing key diagnostics entry: ${keyId}`);
    assert.ok(entry.title.trim().length > 0, `missing key diagnostics title: ${keyId}`);
    assert.ok(entry.shortTemplate.trim().length > 0, `missing key diagnostics shortTemplate: ${keyId}`);
  }

  const catalogKeys = Object.keys(diagnostics.keys) as KeyId[];
  assert.equal(catalogKeys.length, keyIds.length, "diagnostics keys catalog must match key universe size exactly");
  for (const keyId of catalogKeys) {
    assert.equal(keyIds.includes(keyId), true, `diagnostics key not present in key catalog: ${keyId}`);
  }

  const binaryIds = keyIds.filter((keyId) => isBinaryOperatorKeyId(keyId));
  const unaryIds = keyIds.filter((keyId) => isUnaryOperatorId(keyId));

  for (const operatorId of binaryIds) {
    const entry = diagnostics.operations.binary[operatorId];
    assert.ok(entry, `missing binary operation diagnostics entry: ${operatorId}`);
    assert.ok(entry.expandedShortTemplate.trim().length > 0, `missing binary short template: ${operatorId}`);
    assert.ok(entry.expandedLongTemplate.trim().length > 0, `missing binary long template: ${operatorId}`);
  }
  for (const operatorId of unaryIds) {
    const entry = diagnostics.operations.unary[operatorId];
    assert.ok(entry, `missing unary operation diagnostics entry: ${operatorId}`);
    assert.ok(entry.expandedShortTemplate.trim().length > 0, `missing unary short template: ${operatorId}`);
    assert.ok(entry.expandedLongTemplate.trim().length > 0, `missing unary long template: ${operatorId}`);
  }

  assert.equal(
    Object.keys(diagnostics.operations.binary).length,
    binaryIds.length,
    "binary diagnostics catalog must match binary operator universe size exactly",
  );
  assert.equal(
    Object.keys(diagnostics.operations.unary).length,
    unaryIds.length,
    "unary diagnostics catalog must match unary operator universe size exactly",
  );
};

