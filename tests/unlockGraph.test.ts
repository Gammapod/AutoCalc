import assert from "node:assert/strict";
import { unlockCatalog } from "../src/content/unlocks.catalog.js";
import { initialState } from "../src/domain/state.js";
import {
  analyzeUnlockGraph,
  buildUnlockGraph,
  buildUnlockGraphReport,
  deriveUnlockedKeysFromState,
  formatUnlockGraphReport,
} from "../src/domain/unlockGraph.js";

export const runUnlockGraphTests = (): void => {
  const startingKeys = deriveUnlockedKeysFromState(initialState());
  const graph = buildUnlockGraph(unlockCatalog, startingKeys);

  const conditionNodes = graph.nodes.filter((node) => node.type === "condition");
  const unlockEdges = graph.edges.filter((edge) => edge.type === "unlocks");
  const requireEdges = graph.edges.filter((edge) => edge.type === "requires");

  assert.equal(
    conditionNodes.length,
    unlockCatalog.length,
    "each unlock definition should map to exactly one condition node",
  );
  assert.ok(unlockEdges.length > 0, "expected unlock edges from conditions to keys");
  assert.ok(requireEdges.length > 0, "expected requirement edges from conditions to functions");

  const analysis = analyzeUnlockGraph(unlockCatalog, startingKeys);
  assert.ok(
    analysis.unlockedKeysReached.includes("="),
    "analysis should reach the = key via total_equals progression",
  );
  assert.ok(
    analysis.unreachableKeys.includes("2"),
    "analysis should include keys with no unlock path as unreachable",
  );

  const report = buildUnlockGraphReport(unlockCatalog, startingKeys, new Date("2026-03-01T00:00:00.000Z"));
  const formatted = formatUnlockGraphReport(report);
  assert.match(formatted, /Unlock Graph Report/);
  assert.match(formatted, /Generated: 2026-03-01T00:00:00.000Z/);
  assert.match(formatted, /Graph Summary/);
};
