import assert from "node:assert/strict";
import { buttonRegistry } from "../src/domain/buttonRegistry.js";
import {
  isBinaryOperatorKeyId,
  isUnaryOperatorId,
  resolveKeyId,
  type BinaryOperatorKeyId,
  type UnaryOperatorKeyId,
} from "../src/domain/keyPresentation.js";
import {
  operatorExecutionPolicies,
  resolveOperatorExecutionPolicy,
  validateOperatorExecutionPolicyRegistry,
} from "../src/domain/operatorExecutionPolicy.js";

export const runOperatorExecutionPolicyRegistryContractTests = (): void => {
  validateOperatorExecutionPolicyRegistry();

  const executableOperators = buttonRegistry
    .map((row) => resolveKeyId(row.key))
    .filter((keyId): keyId is BinaryOperatorKeyId | UnaryOperatorKeyId => (
      isBinaryOperatorKeyId(keyId) || isUnaryOperatorId(keyId)
    ));
  const expected = new Set(executableOperators);
  const actual = new Set(operatorExecutionPolicies.map((row) => row.operatorId));

  assert.equal(actual.size, expected.size, "execution policy registry count matches executable operator count");
  for (const operatorId of expected) {
    assert.equal(actual.has(operatorId), true, `execution policy exists for ${operatorId}`);
    assert.deepEqual(
      resolveOperatorExecutionPolicy(operatorId).operatorId,
      operatorId,
      `execution policy resolves deterministically for ${operatorId}`,
    );
  }
  for (const operatorId of actual) {
    assert.equal(expected.has(operatorId), true, `registry has no stray policy entry (${operatorId})`);
  }
};
