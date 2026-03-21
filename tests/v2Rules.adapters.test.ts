import assert from "node:assert/strict";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { applyEffect, applyUnlocks } from "../src/domain/unlocks.js";
import { initialState } from "../src/domain/state.js";
import {
  analyzeUnlockPredicate,
  buildUnlockCriteria,
  evaluateUnlockPredicate,
} from "../src/domain/unlockEngine.js";
import type { UnlockPredicate } from "../src/domain/types.js";

export const runV2RulesAdaptersTests = (): void => {
  const base = initialState();
  assert.deepEqual(applyUnlocks(base, unlockCatalog), applyUnlocks(base, unlockCatalog), "unlock evaluation is stable");

  const effect = unlockCatalog.find((entry) => entry.effect.type === "unlock_digit")?.effect;
  assert.ok(effect, "catalog contains a digit unlock effect fixture");
  assert.deepEqual(
    applyEffect(effect ?? { type: "increase_max_total_digits", amount: 1 }, base),
    applyEffect(effect ?? { type: "increase_max_total_digits", amount: 1 }, base),
    "effect application remains deterministic",
  );

  const predicate: UnlockPredicate = { type: "total_equals", value: 0n };
  assert.equal(evaluateUnlockPredicate(predicate, base), true, "predicate evaluation works for representative predicate");
  assert.deepEqual(
    buildUnlockCriteria(predicate, base),
    analyzeUnlockPredicate(predicate, base).criteria,
    "criteria builder matches analysis criteria output",
  );
};

