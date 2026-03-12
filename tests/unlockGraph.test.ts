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
  filterUnlockGraphToIncomingUnlockKeys,
  formatUnlockGraphMermaid,
  formatUnlockGraphReport,
} from "../src/domain/unlockGraph.js";
import { execution, k, valueExpr } from "./support/keyCompat.js";

export const runUnlockGraphTests = (): void => {
  const startingKeys = deriveUnlockedKeysFromState(initialState());
  const graph = buildUnlockGraph(unlockCatalog, startingKeys);

  const conditionNodes = graph.nodes.filter((node) => node.type === "condition");
  const effectTargetNodes = graph.nodes.filter((node) => node.type === "effect_target");
  const unlockEdges = graph.edges.filter((edge) => edge.type === "unlocks");
  const requireEdges = graph.edges.filter((edge) => edge.type === "requires");
  const sufficientEdges = graph.edges.filter((edge) => edge.type === "sufficient");
  const necessaryEdges = graph.edges.filter((edge) => edge.type === "necessary");

  assert.equal(
    conditionNodes.length,
    unlockCatalog.length,
    "each unlock definition should map to exactly one condition node",
  );
  assert.ok(effectTargetNodes.length > 0, "expected graph to include non-key effect target nodes");
  assert.ok(unlockEdges.length > 0, "expected unlock edges from conditions to targets");
  assert.ok(requireEdges.length > 0, "expected requirement edges from conditions to functions");
  assert.ok(sufficientEdges.length > 0, "expected sufficient edges from keys or sufficient-set nodes");
  assert.ok(necessaryEdges.length > 0, "expected necessary edges for multi-key sufficient sets");
  const functionNodeIds = new Set(graph.nodes.filter((node) => node.type === "function").map((node) => node.id));
  for (const edge of requireEdges) {
    assert.equal(functionNodeIds.has(edge.to), true, `requires edge must target function node (${edge.to})`);
  }

  const analysis = analyzeUnlockGraph(unlockCatalog, startingKeys);
  assert.ok(
    analysis.unlockedKeysReached.includes(execution("=")),
    "analysis should include the = key in reached unlock set",
  );
  assert.ok(
    analysis.unreachableKeys.includes(valueExpr("1")),
    "analysis should include keys with no unlock path as unreachable under current sufficiency rules",
  );
  assert.equal(Array.isArray(analysis.reachedEffectTargets), true, "analysis should include effect-target reachability data");

  const report = buildUnlockGraphReport(unlockCatalog, startingKeys, new Date("2026-03-01T00:00:00.000Z"));
  const formatted = formatUnlockGraphReport(report);
  assert.match(formatted, /Unlock Graph Report/);
  assert.match(formatted, /Generated: 2026-03-01T00:00:00.000Z/);
  assert.match(formatted, /Graph Summary/);
  assert.match(formatted, /sufficient_set=/);
  assert.match(formatted, /effect_target=/);
  assert.match(formatted, /Edges: necessary=/);

  const filteredMermaid = formatUnlockGraphMermaid({
    nodes: [
      { id: "key.A", type: "key", label: "A" },
      { id: "key.B", type: "key", label: "B" },
      { id: "set.fn.mid.0", type: "sufficient_set", label: "A & B" },
      { id: "fn.mid", type: "function", label: "mid" },
      { id: "cond.Z", type: "condition", label: "Z" },
    ],
    edges: [
      { from: "key.A", to: "set.fn.mid.0", type: "necessary" },
      { from: "set.fn.mid.0", to: "fn.mid", type: "sufficient" },
      { from: "cond.Z", to: "fn.mid", type: "requires" },
      { from: "key.A", to: "cond.Z", type: "unlocks" },
      { from: "cond.Z", to: "key.B", type: "unlocks" },
    ],
  });
  assert.match(filteredMermaid, /sufficient_set: A & B/);
  assert.match(filteredMermaid, /subgraph Keys/);
  assert.match(filteredMermaid, /subgraph SufficientSets/);
  assert.match(filteredMermaid, /subgraph Functions/);
  assert.match(filteredMermaid, /subgraph Conditions/);
  assert.match(filteredMermaid, /-->\|necessary\|/);
  assert.match(filteredMermaid, /-->\|sufficient\|/);
  assert.match(filteredMermaid, /-->\|unlocks\|/);

  const requirementMermaid = formatUnlockGraphMermaid({
    nodes: [
      { id: "key.A", type: "key", label: "A" },
      { id: "fn.main", type: "function", label: "main" },
      { id: "cond.Z", type: "condition", label: "Z" },
    ],
    edges: [
      { from: "key.A", to: "fn.main", type: "sufficient" },
      { from: "cond.Z", to: "fn.main", type: "requires" },
      { from: "cond.Z", to: "key.A", type: "unlocks" },
    ],
  });
  assert.match(requirementMermaid, /-->\|requires\|/);
  assert.match(requirementMermaid, /-->\|required_for\|/);
  assert.ok(
    requirementMermaid.indexOf('["key: A"]') < requirementMermaid.indexOf('["function: main"]'),
    "node ordering should place upstream keys before downstream functions",
  );

  const functionNodes = graph.nodes.filter((node) => node.type === "function");
  for (const functionNode of functionNodes) {
    const incomingSufficient = graph.edges.some((edge) => edge.type === "sufficient" && edge.to === functionNode.id);
    assert.equal(incomingSufficient, true, `function ${functionNode.id} should have at least one sufficient incoming edge`);
  }
  const edgeSignatures = new Set<string>();
  for (const edge of graph.edges) {
    const signature = `${edge.from}|${edge.to}|${edge.type}|${edge.label ?? ""}`;
    assert.equal(edgeSignatures.has(signature), false, `duplicate edge emitted: ${signature}`);
    edgeSignatures.add(signature);
  }
  const setNodesById = new Map(graph.nodes.filter((node) => node.type === "sufficient_set").map((node) => [node.id, node]));
  const sufficientSetTargets = new Map<string, Set<string>>();
  for (const edge of graph.edges) {
    if (edge.type !== "sufficient") {
      continue;
    }
    const sourceNode = setNodesById.get(edge.from);
    if (!sourceNode) {
      continue;
    }
    const targets = sufficientSetTargets.get(sourceNode.id);
    if (targets) {
      targets.add(edge.to);
    } else {
      sufficientSetTargets.set(sourceNode.id, new Set([edge.to]));
    }
  }
  assert.ok(
    [...sufficientSetTargets.values()].some((targets) => targets.size > 1),
    "global sufficient-set dedupe should allow at least one sufficient_set node to feed multiple functions",
  );

  const filteredGraph = filterUnlockGraphToIncomingUnlockKeys({
    nodes: [
      { id: "key.++", type: "key", label: "=" },
      { id: "key.--", type: "key", label: "=" },
      { id: "key.A", type: "key", label: "A" },
      { id: "key.X", type: "key", label: "X" },
      { id: "effect.allocator.max_points", type: "effect_target", label: "allocator.max_points" },
      { id: "fn.keep", type: "function", label: "keep" },
      { id: "fn.drop", type: "function", label: "drop" },
      { id: "cond.keep", type: "condition", label: "keep" },
      { id: "cond.effect", type: "condition", label: "effect" },
    ],
    edges: [
      { from: "cond.keep", to: "key.A", type: "unlocks" },
      { from: "cond.effect", to: "effect.allocator.max_points", type: "unlocks" },
      { from: "cond.keep", to: "fn.keep", type: "requires" },
      { from: "key.A", to: "fn.keep", type: "sufficient" },
      { from: "key.X", to: "fn.drop", type: "sufficient" },
    ],
  });
  assert.equal(filteredGraph.nodes.some((node) => node.id === "key.++"), false, "removed keys are not force-kept in incoming-unlock filter");
  assert.equal(filteredGraph.nodes.some((node) => node.id === "key.--"), false, "removed keys are excluded from incoming-unlock filter");
  assert.equal(filteredGraph.nodes.some((node) => node.id === "key.X"), false, "keys with no incoming unlock should be removed");
  assert.equal(filteredGraph.nodes.some((node) => node.id === "fn.drop"), false, "downstream dependencies of removed keys should be removed");
  assert.equal(
    filteredGraph.nodes.some((node) => node.id === "effect.allocator.max_points"),
    false,
    "non-key unlock targets should not be included in incoming-unlock-keys filter",
  );

  const todoSpecCatalog: UnlockDefinition[] = [
    {
      id: "todo_predicate_fixture",
      description: "fixture",
      predicate: { type: "total_at_most", value: 1n },
      effect: { type: "unlock_digit", key: valueExpr("1") },
      once: true,
      domainNodeId: "NN",
      targetNodeId: "fixture",
    },
  ];
  assert.doesNotThrow(
    () => buildUnlockGraph(todoSpecCatalog, startingKeys),
    "unlock graph should build when non-catalog predicate specs are concrete",
  );
};

