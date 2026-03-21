import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { initialState } from "../src/domain/state.js";
import type { UnlockDefinition } from "../src/domain/types.js";
import {
  analyzeUnlockGraph,
  buildUnlockGraph,
  buildUnlockGraphReport,
  deriveUnlockedKeysFromState,
  formatUnlockGraphMermaid,
  formatUnlockGraphReport,
} from "../src/domain/unlockGraph.js";
import { valueExpr } from "./support/keyCompat.js";

const makeUnlock = (id: string, key: ReturnType<typeof valueExpr>, sufficientKeySets: UnlockDefinition["sufficientKeySets"]): UnlockDefinition => ({
  id,
  description: id,
  predicate: { type: "total_equals", value: 1n },
  effect: { type: "unlock_digit", key },
  sufficientKeySets,
  once: true,
  domainNodeId: "NN",
  targetNodeId: id,
  targetLabel: id,
});

export const runUnlockGraphTests = (): void => {
  const startingKeys = deriveUnlockedKeysFromState(initialState());
  const graph = buildUnlockGraph(unlockCatalog, startingKeys);

  assert.ok(graph.nodes.length > 0, "graph contains nodes");
  assert.ok(graph.edges.length > 0, "graph contains unlock edges");
  assert.equal(graph.nodes.some((node) => node.type === "key"), true, "graph contains key nodes");
  assert.equal(graph.nodes.some((node) => node.type === "unlock_target"), true, "graph contains target nodes");
  assert.equal(graph.nodes.some((node) => node.type === "sufficiency_token"), true, "graph contains sufficiency token nodes");
  assert.equal(graph.edges.every((edge) => edge.type === "unlocks"), true, "graph edges are unlock-only");
  assert.equal(
    graph.edges.every((edge) =>
      (edge.from.startsWith("key.") || edge.from.startsWith("token."))
      && (edge.to.startsWith("key.") || edge.to.startsWith("target."))),
    true,
    "edge endpoints are (key|token)->(key|target)",
  );

  const analysis = analyzeUnlockGraph(unlockCatalog, startingKeys);
  assert.equal(Array.isArray(analysis.startingKeys), true, "analysis exposes starting keys");
  assert.equal(Array.isArray(analysis.knownKeys), true, "analysis exposes known key list");
  assert.equal(Array.isArray(analysis.canonicalUnlocks), true, "analysis exposes canonical unlock rows");
  assert.equal(Array.isArray(analysis.diagnostics), true, "analysis exposes diagnostics");
  assert.equal(
    analysis.canonicalUnlocks.every((entry) => entry.canonicalSourceRequirements.length > 0),
    true,
    "canonical sufficiency sets are non-empty",
  );

  const report = buildUnlockGraphReport(unlockCatalog, startingKeys, new Date("2026-03-01T00:00:00.000Z"));
  const formatted = formatUnlockGraphReport(report);
  assert.match(formatted, /Unlock Graph Report/);
  assert.match(formatted, /Generated: 2026-03-01T00:00:00.000Z/);
  assert.match(formatted, /Static Sufficiency Summary/);
  assert.match(formatted, /Canonical Sufficiencies/);
  assert.match(formatted, /Diagnostics/);
  assert.doesNotMatch(formatted, /Traversal/);
  assert.doesNotMatch(formatted, /Passes/);
  assert.doesNotMatch(formatted, /Proof Summary/);

  const mermaid = formatUnlockGraphMermaid(report.graph);
  assert.match(mermaid, /subgraph UnlockedKeys/);
  assert.match(mermaid, /subgraph OtherUnlockTargets/);
  assert.match(mermaid, /subgraph SufficiencyTokens/);
  assert.match(mermaid, /subgraph KeyUniverse/);
  assert.doesNotMatch(mermaid, /subgraph Starting/);
  assert.doesNotMatch(mermaid, /subgraph Proven/);

  const orderedCatalog: UnlockDefinition[] = [
    makeUnlock("ordered_set_fixture", valueExpr("digit_2"), [[valueExpr("digit_1"), "digit_nonzero", valueExpr("digit_1")]]),
  ];
  const orderedAnalysis = analyzeUnlockGraph(orderedCatalog, [valueExpr("digit_1"), valueExpr("digit_3"), valueExpr("digit_9")]);
  assert.deepEqual(
    orderedAnalysis.canonicalUnlocks[0]?.canonicalSourceRequirements,
    ["digit_nonzero", valueExpr("digit_1")].sort((a, b) => a.localeCompare(b)),
    "canonical set is normalized by dedupe+sort while keeping first-set semantics",
  );

  const multiSetCatalog: UnlockDefinition[] = [
    makeUnlock(
      "multi_set_fixture",
      valueExpr("digit_3"),
      [
        [valueExpr("digit_1"), "digit_nonzero"],
        [valueExpr("digit_9")],
      ],
    ),
  ];
  const multiSetAnalysis = analyzeUnlockGraph(multiSetCatalog, [valueExpr("digit_1"), valueExpr("digit_2"), valueExpr("digit_9")]);
  assert.deepEqual(
    multiSetAnalysis.canonicalUnlocks[0]?.canonicalSourceRequirements,
    ["digit_nonzero", valueExpr("digit_1")].sort((a, b) => a.localeCompare(b)),
    "first sufficient set is canonical",
  );
  assert.equal(multiSetAnalysis.canonicalUnlocks[0]?.sufficientSetCount, 2, "all declared sufficient sets are counted");

  const invalidCatalog: UnlockDefinition[] = [
    {
      id: "invalid_missing_sets",
      description: "invalid",
      predicate: { type: "total_equals", value: 1n },
      effect: { type: "unlock_digit", key: valueExpr("digit_4") },
      sufficientKeySets: [],
      once: true,
      domainNodeId: "NN",
      targetNodeId: "invalid_target_1",
    },
    {
      id: "invalid_unknown_key",
      description: "invalid",
      predicate: { type: "total_equals", value: 1n },
      effect: { type: "unlock_digit", key: valueExpr("digit_5") },
      sufficientKeySets: [["not_a_real_key" as unknown as ReturnType<typeof valueExpr>]],
      once: true,
      domainNodeId: "NN",
      targetNodeId: "invalid_target_2",
    },
    {
      id: "invalid_empty_target",
      description: "invalid",
      predicate: { type: "total_equals", value: 1n },
      effect: { type: "unlock_digit", key: valueExpr("digit_6") },
      sufficientKeySets: [[valueExpr("digit_1")]],
      once: true,
      domainNodeId: "NN",
      targetNodeId: " ",
    },
  ];
  const invalidAnalysis = analyzeUnlockGraph(invalidCatalog, [valueExpr("digit_1")]);
  assert.equal(invalidAnalysis.canonicalUnlocks.length, 0, "invalid unlock rows do not create canonical entries");
  assert.equal(invalidAnalysis.diagnostics.length, 3, "invalid rows are surfaced in diagnostics");

  const executionKeyCatalog: UnlockDefinition[] = [
    makeUnlock("invalid_exec_key_set", valueExpr("digit_7"), [["exec_equals" as unknown as ReturnType<typeof valueExpr>]]),
  ];
  const executionKeyAnalysis = analyzeUnlockGraph(executionKeyCatalog, [valueExpr("digit_1")]);
  assert.equal(executionKeyAnalysis.canonicalUnlocks.length, 0, "execution keys in sufficient sets are rejected");
  assert.equal(
    executionKeyAnalysis.diagnostics.some((entry) => entry.reason === "execution_key_in_sufficient_set"),
    true,
    "execution-key diagnostics are surfaced",
  );
};
