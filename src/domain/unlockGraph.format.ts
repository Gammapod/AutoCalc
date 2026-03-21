import type { Key, UnlockDefinition } from "./types.js";
import type { GraphNode, UnlockGraph, UnlockGraphReport } from "./unlockGraph.types.js";
import { analyzeUnlockGraph } from "./unlockGraph.analysis.js";
import { buildUnlockGraph } from "./unlockGraph.rules.js";

const formatKeyList = (keys: readonly Key[]): string => keys.join(", ") || "(none)";

export const buildUnlockGraphReport = (
  catalog: UnlockDefinition[],
  startingKeys: Key[],
  generatedAt: Date = new Date(),
): UnlockGraphReport => ({
  generatedAtIso: generatedAt.toISOString(),
  graph: buildUnlockGraph(catalog, startingKeys),
  analysis: analyzeUnlockGraph(catalog, startingKeys),
});

export const formatUnlockGraphReport = (report: UnlockGraphReport): string => {
  const diagnosticLines = report.analysis.diagnostics.map((entry) =>
    `- ${entry.unlockId}: ${entry.reason}; ${entry.detail}`);
  const canonicalLines = report.analysis.canonicalUnlocks.map((entry) =>
    `- ${entry.unlockId}: [${entry.canonicalSourceRequirements.join(", ")}] -> ${entry.targetLabel} (${entry.effectType})`);

  const keyNodeCount = report.graph.nodes.filter((node) => node.type === "key").length;
  const targetNodeCount = report.graph.nodes.filter((node) => node.type === "unlock_target").length;
  const tokenNodeCount = report.graph.nodes.filter((node) => node.type === "sufficiency_token").length;

  const lines = [
    "Unlock Graph Report",
    `Generated: ${report.generatedAtIso}`,
    "",
    "Graph Summary",
    `- Nodes (total): ${report.graph.nodes.length.toString()}`,
    `- Nodes (keys): ${keyNodeCount.toString()}`,
    `- Nodes (targets): ${targetNodeCount.toString()}`,
    `- Nodes (tokens): ${tokenNodeCount.toString()}`,
    `- Edges (unlocks): ${report.graph.edges.length.toString()}`,
    "",
    "Static Sufficiency Summary",
    `- Starting keys: ${formatKeyList(report.analysis.startingKeys)}`,
    `- Known keys: ${formatKeyList(report.analysis.knownKeys)}`,
    `- Canonical unlock entries: ${report.analysis.canonicalUnlocks.length.toString()}`,
    "",
    "Canonical Sufficiencies",
    ...(canonicalLines.length > 0 ? canonicalLines : ["- (none)"]),
    "",
    "Diagnostics",
    ...(diagnosticLines.length > 0 ? diagnosticLines : ["- (none)"]),
  ];

  return lines.join("\n");
};

const escapeMermaidLabel = (value: string): string => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const sortNodes = (nodes: GraphNode[]): GraphNode[] =>
  [...nodes].sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));

export const formatUnlockGraphMermaid = (graph: UnlockGraph): string => {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const lines: string[] = ["graph TD"];
  const orderedNodes = sortNodes(graph.nodes);
  const nodeAliasById = new Map(orderedNodes.map((node, index) => [node.id, `n${index}`]));

  const unlockedKeyNodeIds = new Set(
    graph.edges
      .map((edge) => edge.to)
      .filter((nodeId) => nodesById.get(nodeId)?.type === "key"),
  );
  const otherUnlockNodeIds = new Set(
    graph.edges
      .map((edge) => edge.to)
      .filter((nodeId) => nodesById.get(nodeId)?.type === "unlock_target"),
  );
  const tokenNodeIds = new Set(
    graph.nodes
      .filter((node) => node.type === "sufficiency_token")
      .map((node) => node.id),
  );

  const appendSubgraph = (title: string, filter: (node: GraphNode) => boolean, prefix: string): void => {
    lines.push(`  subgraph ${title}`);
    for (const node of orderedNodes) {
      if (!filter(node)) {
        continue;
      }
      const alias = nodeAliasById.get(node.id) as string;
      lines.push(`    ${alias}["${escapeMermaidLabel(`${prefix}: ${node.label}`)}"]`);
    }
    lines.push("  end");
  };

  appendSubgraph("UnlockedKeys", (node) => node.type === "key" && unlockedKeyNodeIds.has(node.id), "key");
  appendSubgraph("OtherUnlockTargets", (node) => node.type === "unlock_target" && otherUnlockNodeIds.has(node.id), "target");
  appendSubgraph("SufficiencyTokens", (node) => tokenNodeIds.has(node.id), "token");
  appendSubgraph("KeyUniverse", (node) => node.type === "key" && !unlockedKeyNodeIds.has(node.id), "key");

  const orderedEdges = [...graph.edges]
    .filter((edge) => nodesById.has(edge.from) && nodesById.has(edge.to))
    .sort((a, b) =>
      (nodesById.get(a.from)?.label ?? "").localeCompare(nodesById.get(b.from)?.label ?? "")
      || (nodesById.get(a.to)?.label ?? "").localeCompare(nodesById.get(b.to)?.label ?? "")
      || (a.unlockId ?? "").localeCompare(b.unlockId ?? ""),
    );

  for (const edge of orderedEdges) {
    const fromAlias = nodeAliasById.get(edge.from) as string;
    const toAlias = nodeAliasById.get(edge.to) as string;
    const edgeLabel = edge.unlockId ? `unlock:${edge.unlockId}` : "unlock";
    lines.push(`  ${fromAlias} -->|${escapeMermaidLabel(edgeLabel)}| ${toAlias}`);
  }

  return `${lines.join("\n")}\n`;
};
