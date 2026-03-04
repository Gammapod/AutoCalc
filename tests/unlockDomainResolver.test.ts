import assert from "node:assert/strict";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { resolveUnlockDomainNodeId } from "../src/content/unlockDomainResolver.js";
import type { NumberDomainNodeId, UnlockDefinition } from "../src/domain/types.js";

const numberDomainNodeIds: NumberDomainNodeId[] = ["NN", "NZ", "NQ", "NA", "NR", "NC"];

export const runUnlockDomainResolverTests = (): void => {
  const plusUnlock = unlockCatalog.find((unlock) => unlock.id === "unlock_plus_on_equal_run_4");
  assert.ok(plusUnlock, "plus unlock exists in catalog");
  assert.equal(resolveUnlockDomainNodeId(plusUnlock), "NN", "resolver returns domain metadata");

  const multiplyUnlock = unlockCatalog.find((unlock) => unlock.id === "unlock_mul_on_constant_step_gt1_run_7");
  assert.ok(multiplyUnlock, "multiply unlock exists in catalog");
  assert.equal(resolveUnlockDomainNodeId(multiplyUnlock), "NZ", "resolver returns domain metadata");

  const digitOneUnlock = unlockCatalog.find((unlock) => unlock.id === "unlock_1_on_plus_press_first");
  assert.ok(digitOneUnlock, "digit 1 unlock exists in catalog");
  assert.equal(
    resolveUnlockDomainNodeId(digitOneUnlock),
    "NN",
    "resolver returns catalog metadata for digit unlock",
  );

  const customUnlock: UnlockDefinition = {
    id: "unlock_custom_domain_q",
    description: "custom rational domain",
    predicate: { type: "total_equals", value: 1n },
    effect: { type: "unlock_digit", key: "4" },
    once: true,
    domainNodeId: "NQ",
    targetNodeId: "Idigits",
  };
  assert.equal(resolveUnlockDomainNodeId(customUnlock), "NQ", "resolver supports all explicit domain ids");

  for (const unlock of unlockCatalog) {
    const domainNodeId = resolveUnlockDomainNodeId(unlock);
    assert.ok(numberDomainNodeIds.includes(domainNodeId), `catalog unlock ${unlock.id} resolves to a valid domain node`);
  }
};
