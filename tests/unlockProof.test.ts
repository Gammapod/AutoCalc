import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { buildUnlockProofReport } from "../src/domain/unlockProof.js";
import type { UnlockDefinition } from "../src/domain/types.js";

const fixtureCatalog: UnlockDefinition[] = [
  {
    id: "unlock_digit_1_on_equals_press",
    description: "Unlock digit_1 once equals is pressed at least once.",
    predicate: { type: "key_press_count_at_least", key: KEY_ID.exec_equals, count: 1 },
    effect: { type: "unlock_digit", key: KEY_ID.digit_1 },
    sufficientKeySets: [[KEY_ID.digit_1]],
    once: true,
    domainNodeId: "NN",
    targetNodeId: "fixture_1",
    targetLabel: "digit_1",
  },
  {
    id: "unlock_digit_2_on_digit_1",
    description: "Unlock digit_2 once digit_1 is unlocked.",
    predicate: { type: "keys_unlocked_all", keys: [KEY_ID.digit_1] },
    effect: { type: "unlock_digit", key: KEY_ID.digit_2 },
    sufficientKeySets: [[KEY_ID.digit_1]],
    once: true,
    domainNodeId: "NN",
    targetNodeId: "fixture_2",
    targetLabel: "digit_2",
  },
];

export const runUnlockProofTests = (): void => {
  const baseState = initialState();
  const bounds = { maxSeconds: 10, maxDepth: 6, maxStatesPerUnlock: 2000 };

  const firstRun = buildUnlockProofReport(fixtureCatalog, {
    now: new Date("2026-03-01T00:00:00.000Z"),
    bounds,
    cacheMode: "off",
    initialStates: [baseState],
  });
  const secondRun = buildUnlockProofReport(fixtureCatalog, {
    now: new Date("2026-03-01T00:00:00.000Z"),
    bounds,
    cacheMode: "off",
    initialStates: [baseState],
  });
  assert.deepEqual(
    firstRun.report.unlockProofs,
    secondRun.report.unlockProofs,
    "proof results should be deterministic for same input",
  );
  const provedPress = firstRun.report.unlockProofs.find((entry) => entry.unlockId === "unlock_digit_1_on_equals_press");
  assert.equal(provedPress?.status, "proved", "press-count unlock should be provable from initial state");
  assert.ok(
    (provedPress?.witness ?? []).some((action) => action.type === "PRESS_KEY" && action.key === KEY_ID.exec_equals),
    "proved witness should include equals press",
  );

  const impossibleCatalog: UnlockDefinition[] = [
    {
      id: "impossible_keys_all_fixture",
      description: "Impossible because + is not present in this fixture unlock universe.",
      predicate: { type: "keys_unlocked_all", keys: [KEY_ID.op_add] },
      effect: { type: "unlock_digit", key: KEY_ID.digit_3 },
      sufficientKeySets: [[KEY_ID.op_add]],
      once: true,
      domainNodeId: "NN",
      targetNodeId: "fixture_3",
      targetLabel: "digit_3",
    },
  ];
  const impossibleRun = buildUnlockProofReport(impossibleCatalog, {
    now: new Date("2026-03-01T00:00:00.000Z"),
    bounds,
    cacheMode: "off",
    initialStates: [baseState],
  });
  const impossible = impossibleRun.report.unlockProofs[0];
  assert.equal(impossible.status, "impossible", "unreachable keys_unlocked_all should be classified as impossible");
  assert.equal(impossible.impossible?.ruleId, "keys_unlocked_all_unreachable_key");

  const cacheSeed = buildUnlockProofReport(fixtureCatalog, {
    now: new Date("2026-03-01T00:00:00.000Z"),
    bounds,
    cacheMode: "local",
    initialStates: [baseState],
  });
  const cacheReuse = buildUnlockProofReport(fixtureCatalog, {
    now: new Date("2026-03-01T00:00:01.000Z"),
    bounds,
    cacheMode: "local",
    cacheSnapshot: cacheSeed.cacheSnapshot,
    initialStates: [baseState],
  });
  assert.equal(cacheReuse.report.cache.cacheUsed, true, "matching snapshot should reuse at least one cached layer");
  assert.ok(cacheReuse.report.cache.cacheHitLayers >= 1, "expected at least one cached layer hit");

  const changedCatalog: UnlockDefinition[] = [
    ...fixtureCatalog,
    {
      id: "impossible_press_target_fixture",
      description: "Impossible press target key.",
      predicate: { type: "key_press_count_at_least", key: KEY_ID.op_pow, count: 1 },
      effect: { type: "unlock_digit", key: KEY_ID.digit_4 },
      sufficientKeySets: [[KEY_ID.op_pow]],
      once: true,
      domainNodeId: "NN",
      targetNodeId: "fixture_4",
      targetLabel: "digit_4",
    },
  ];
  const cacheInvalidated = buildUnlockProofReport(changedCatalog, {
    now: new Date("2026-03-01T00:00:02.000Z"),
    bounds,
    cacheMode: "local",
    cacheSnapshot: cacheSeed.cacheSnapshot,
    initialStates: [baseState],
  });
  assert.equal(cacheInvalidated.report.cache.cacheHitLayers, 0, "catalog change should invalidate cached layers");
};

