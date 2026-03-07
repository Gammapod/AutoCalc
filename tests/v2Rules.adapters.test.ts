import assert from "node:assert/strict";
import { unlockCatalog as legacyCatalog } from "../src/content/unlocks.catalog.js";
import { applyEffect as applyLegacyEffect, applyUnlocks } from "../src/domain/unlocks.js";
import { initialState } from "../src/domain/state.js";
import { evaluateUnlocks } from "../src/rules/ruleRuntime.js";
import { unlockCatalog as rulesCatalog } from "../src/rules/unlockCatalog.js";
import { applyEffect as applyRulesEffect } from "../src/rules/effects.js";
import {
  analyzeUnlockPredicate as analyzeViaRules,
  buildUnlockCriteria as buildCriteriaViaRules,
  evaluateUnlockPredicate as evaluateViaRules,
} from "../src/rules/predicateAdapters.js";
import type { UnlockPredicate } from "../src/domain/types.js";

export const runV2RulesAdaptersTests = (): void => {
  assert.equal(rulesCatalog, legacyCatalog, "rules unlock catalog adapter re-exports legacy catalog reference");

  const base = initialState();
  assert.deepEqual(
    evaluateUnlocks(base, rulesCatalog),
    applyUnlocks(base, legacyCatalog),
    "rules runtime adapter preserves unlock evaluation behavior",
  );

  const effect = legacyCatalog.find((entry) => entry.effect.type === "unlock_digit")?.effect;
  assert.ok(effect, "catalog contains a digit unlock effect fixture");
  assert.deepEqual(
    applyRulesEffect(effect ?? { type: "increase_max_total_digits", amount: 1 }, base),
    applyLegacyEffect(effect ?? { type: "increase_max_total_digits", amount: 1 }, base),
    "rules effect adapter preserves effect application behavior",
  );

  const predicate: UnlockPredicate = { type: "total_equals", value: 0n };
  assert.equal(
    evaluateViaRules(predicate, base),
    true,
    "predicate adapter evaluation matches legacy behavior for representative predicate",
  );
  assert.deepEqual(
    buildCriteriaViaRules(predicate, base),
    analyzeViaRules(predicate, base).criteria,
    "criteria adapter matches analysis criteria output",
  );
};
