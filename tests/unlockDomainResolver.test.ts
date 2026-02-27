import assert from "node:assert/strict";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { resolveUnlockDomainNodeId } from "../src/content/unlockDomainResolver.js";
import type { NumberDomainNodeId, UnlockDefinition } from "../src/domain/types.js";

const numberDomainNodeIds: NumberDomainNodeId[] = ["NN", "NZ", "NQ", "NA", "NR", "NC"];

export const runUnlockDomainResolverTests = (): void => {
  const minusUnlock = unlockCatalog.find((unlock) => unlock.id === "unlock_minus_on_total_25_or_more");
  assert.ok(minusUnlock, "minus unlock exists in catalog");
  assert.equal(resolveUnlockDomainNodeId(minusUnlock), "NN", "resolver returns domain metadata");

  const ceUnlock = unlockCatalog.find((unlock) => unlock.id === "unlock_ce_on_total_below_0");
  assert.ok(ceUnlock, "CE unlock exists in catalog");
  assert.equal(resolveUnlockDomainNodeId(ceUnlock), "NZ", "resolver returns negative-domain metadata");

  const digitFourUnlock = unlockCatalog.find((unlock) => unlock.id === "unlock_digit_4_on_roll_suffix_1_2_3_4");
  assert.ok(digitFourUnlock, "digit 4 unlock exists in catalog");
  assert.equal(
    resolveUnlockDomainNodeId(digitFourUnlock),
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
