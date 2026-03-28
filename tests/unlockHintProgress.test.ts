import assert from "node:assert/strict";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { initialState } from "../src/domain/state.js";
import {
  assertCatalogPredicateProgressCoverage,
  deriveCatalogPartialProgressPredicateTypes,
  deriveCatalogProgressCoverage,
  getPredicateProgressMode,
  projectEligibleUnlockHintProgressRows,
  projectUnlockHintProgressRows,
} from "../src/domain/unlockHintProgress.js";
import { evaluateUnlockPredicate } from "../src/domain/unlockEngine.js";
import type { UnlockDefinition } from "../src/domain/types.js";

const CYCLE_PREDICATE_TYPES = new Set([
  "roll_cycle_period_at_least",
  "roll_cycle_transient_at_least",
  "roll_cycle_diameter_at_least",
  "roll_cycle_is_opposite_pair",
]);

export const runUnlockHintProgressTests = (): void => {
  const state = initialState();

  assert.doesNotThrow(
    () => assertCatalogPredicateProgressCoverage(unlockCatalog),
    "current catalog has full progress classification and redacted hint mapping coverage",
  );

  const coverage = deriveCatalogProgressCoverage(unlockCatalog);
  assert.equal(coverage.missingPredicateTypes.length, 0, "current catalog has no unclassified predicate types");
  assert.equal(coverage.missingHintUnlockIds.length, 0, "current catalog has no missing redacted hint ids");
  const partialTypes = deriveCatalogPartialProgressPredicateTypes(unlockCatalog);
  assert.equal(partialTypes.length > 0, true, "catalog includes partial-progress predicate types");
  assert.equal(
    partialTypes.includes("roll_cycle_period_at_least"),
    false,
    "cycle-family predicates are excluded from partial-progress list",
  );
  assert.equal(getPredicateProgressMode("roll_cycle_period_at_least"), "binary", "cycle period classification is binary");
  assert.equal(getPredicateProgressMode("total_at_least"), "partial", "threshold classification is partial");

  const rows = projectUnlockHintProgressRows(state, unlockCatalog);
  assert.equal(rows.length, unlockCatalog.length, "projection emits one row per unlock definition");

  const repeatedRows = projectUnlockHintProgressRows(state, unlockCatalog);
  assert.deepEqual(rows, repeatedRows, "projection is deterministic for identical input state");

  for (const row of rows) {
    const unlock = unlockCatalog.find((item) => item.id === row.unlockId);
    assert.ok(unlock, `unlock exists for projected row id: ${row.unlockId}`);
    const predicateObserved = evaluateUnlockPredicate(unlock!.predicate, state);

    if (row.progress.mode === "partial") {
      assert.ok(row.progress.progress01 >= 0 && row.progress.progress01 <= 1, `${row.unlockId}: partial progress clamps to [0,1]`);
      assert.ok(row.progress.target > 0, `${row.unlockId}: partial progress target is positive`);
      assert.ok(row.progress.current >= 0, `${row.unlockId}: partial progress current is non-negative`);
      assert.equal(row.progress.progress01 === 1, predicateObserved, `${row.unlockId}: partial completion parity matches predicate truth`);
    } else {
      const expectedBinaryState = predicateObserved ? "observed" : "not_observed";
      assert.equal(row.progress.state, expectedBinaryState, `${row.unlockId}: binary state tracks predicate truth`);
    }

    if (CYCLE_PREDICATE_TYPES.has(row.predicateType)) {
      assert.equal(row.progressMode, "binary", `${row.unlockId}: cycle family is binary-only by exemption`);
      assert.equal(row.progress.mode, "binary", `${row.unlockId}: cycle family never emits partial metrics`);
    }

    assert.notEqual(
      row.hint.text,
      unlock!.description,
      `${row.unlockId}: redacted hint payload does not leak full unlock catalog description`,
    );
    assert.equal(
      row.hint.text.includes(row.predicateType),
      false,
      `${row.unlockId}: redacted hint payload does not leak raw predicate type`,
    );
  }

  const eligibleRows = projectEligibleUnlockHintProgressRows(state, unlockCatalog);
  assert.equal(
    eligibleRows.every((row) => row.eligibleForHint),
    true,
    "eligible projection includes only eligible rows and does not rank",
  );

  const regressionCatalog: UnlockDefinition[] = [
    unlockCatalog[0]!,
    {
      ...(unlockCatalog[0]!),
      id: "regression_unclassified_predicate",
      predicate: { type: "total_equals", value: 999n },
    },
  ];
  assert.throws(
    () => assertCatalogPredicateProgressCoverage(regressionCatalog),
    /Missing progress-mode classification/,
    "coverage guard fails if catalog adds a predicate type that is not classified",
  );
};
