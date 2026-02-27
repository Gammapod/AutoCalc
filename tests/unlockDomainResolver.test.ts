import assert from "node:assert/strict";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { resolveUnlockDomainNodeId } from "../src/content/unlockDomainResolver.js";
import type { NumberDomainNodeId, UnlockDefinition } from "../src/domain/types.js";

const numberDomainNodeIds: NumberDomainNodeId[] = ["NN", "NZ", "NQ", "NA", "NR", "NC"];

export const runUnlockDomainResolverTests = (): void => {
  const minusUnlock = unlockCatalog.find((unlock) => unlock.id === "unlock_minus_on_total_25_or_more");
  assert.ok(minusUnlock, "minus unlock exists in catalog");
  assert.equal(resolveUnlockDomainNodeId(minusUnlock), "NN", "total_at_least 25 resolves to NN");

  const ceUnlock = unlockCatalog.find((unlock) => unlock.id === "unlock_ce_on_total_below_0");
  assert.ok(ceUnlock, "CE unlock exists in catalog");
  assert.equal(resolveUnlockDomainNodeId(ceUnlock), "NZ", "total_at_most -1 resolves to NZ");

  const digitFourUnlock = unlockCatalog.find((unlock) => unlock.id === "unlock_digit_4_on_roll_suffix_1_2_3_4");
  assert.ok(digitFourUnlock, "digit 4 unlock exists in catalog");
  assert.equal(
    resolveUnlockDomainNodeId(digitFourUnlock),
    "NN",
    "non-negative roll suffix resolves to NN",
  );

  const overrideUnlock: UnlockDefinition = {
    id: "unlock_override_to_q",
    description: "override to rational",
    predicate: { type: "total_equals", value: 1n },
    effect: { type: "unlock_digit", key: "4" },
    once: true,
    domainNodeId: "NQ",
  };
  assert.equal(resolveUnlockDomainNodeId(overrideUnlock), "NQ", "explicit override beats inference");

  const unsupportedUnlock = {
    id: "unlock_unknown_predicate",
    description: "unknown predicate should fail",
    predicate: { type: "mystery" },
    effect: { type: "unlock_digit", key: "4" },
    once: true,
  } as unknown as UnlockDefinition;
  assert.throws(
    () => resolveUnlockDomainNodeId(unsupportedUnlock),
    /unlock "unlock_unknown_predicate".*predicate "mystery".*domainNodeId override/,
    "unsupported predicate without override fails with remediation hint",
  );

  for (const unlock of unlockCatalog) {
    const domainNodeId = resolveUnlockDomainNodeId(unlock);
    assert.ok(numberDomainNodeIds.includes(domainNodeId), `catalog unlock ${unlock.id} resolves to a valid domain node`);
  }
};
