import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { toMermaidNodeId } from "./mermaid-node-id.mjs";

const RUNTIME_FILE_NAME = "dependency_map.runtime.mmd";
const NUMBER_DOMAIN_NODE_IDS = new Set(["NN", "NZ", "NQ", "NA", "NR", "NC"]);

const escapeMermaidLabel = (label) => label.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const extractNodeIds = (source) => {
  const nodeIds = new Set();
  const nodeDefinitionRegex = /([A-Za-z][A-Za-z0-9_]*)\s*\["[^"]*"\]/g;
  for (const match of source.matchAll(nodeDefinitionRegex)) {
    nodeIds.add(match[1]);
  }
  return nodeIds;
};

const stripSubgraphEdges = (source) => {
  const lines = source.split(/\r?\n/);
  const kept = [];
  let subgraphDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^subgraph\b/.test(trimmed)) {
      subgraphDepth += 1;
      kept.push(line);
      continue;
    }

    if (trimmed === "end") {
      if (subgraphDepth > 0) {
        subgraphDepth -= 1;
      }
      kept.push(line);
      continue;
    }

    if (subgraphDepth > 0 && line.includes("-->")) {
      continue;
    }

    kept.push(line);
  }

  return kept.join("\n");
};

const loadCompiledUnlockModules = async (projectRoot) => {
  const catalogModulePath = join(projectRoot, "dist", "src", "content", "unlocks.catalog.js");

  const catalogModule = await import(pathToFileURL(catalogModulePath).href);

  if (!Array.isArray(catalogModule.unlockCatalog)) {
    throw new Error("unlockCatalog export not found in compiled catalog module.");
  }
  return { unlockCatalog: catalogModule.unlockCatalog };
};

const assertUnlockMetadata = (unlock) => {
  if (!NUMBER_DOMAIN_NODE_IDS.has(unlock.domainNodeId)) {
    throw new Error(
      `Invalid or missing domainNodeId for unlock "${unlock.id}". Expected one of ${[...NUMBER_DOMAIN_NODE_IDS].join(", ")}.`,
    );
  }
  if (typeof unlock.targetNodeId !== "string" || unlock.targetNodeId.trim().length === 0) {
    throw new Error(`Missing targetNodeId for unlock "${unlock.id}".`);
  }
};

const buildUnlockSubgraph = (unlocks) => {
  const lines = [];
  lines.push('subgraph Unlocks ["Unlocks"]');

  for (const unlock of unlocks) {
    const nodeId = toMermaidNodeId(unlock.id);
    const label = escapeMermaidLabel(`${unlock.id}: ${unlock.description}`);
    lines.push(`    ${nodeId}["${label}"]`);
  }

  lines.push("end");
  return lines.join("\n");
};

const buildDomainEdges = (unlocks) =>
  unlocks.map((unlock) => {
    assertUnlockMetadata(unlock);
    const nodeId = toMermaidNodeId(unlock.id);
    return `${unlock.domainNodeId} --> ${nodeId}`;
  });

const resolveUnlockTarget = (unlock, existingNodeIds) => {
  assertUnlockMetadata(unlock);
  if (existingNodeIds.has(unlock.targetNodeId)) {
    return { nodeId: unlock.targetNodeId, label: unlock.targetLabel, synthetic: false };
  }
  if (unlock.targetLabel) {
    return { nodeId: unlock.targetNodeId, label: unlock.targetLabel, synthetic: true };
  }
  throw new Error(
    `Cannot resolve unlock target "${unlock.targetNodeId}" for "${unlock.id}". Add targetLabel metadata or define the node in dependency_map.mmd.`,
  );
};

const buildUnlockTargetEdgesAndSyntheticNodes = (unlocks, existingNodeIds) => {
  const edges = [];
  const syntheticNodes = new Map();

  for (const unlock of unlocks) {
    const unlockNodeId = toMermaidNodeId(unlock.id);
    const target = resolveUnlockTarget(unlock, existingNodeIds);
    edges.push(`${unlockNodeId} --> ${target.nodeId}`);
    if (target.synthetic) {
      syntheticNodes.set(target.nodeId, target.label);
    }
  }

  return { edges, syntheticNodes };
};

const addSyntheticUtilitiesNodes = (source, syntheticNodes) => {
  if (syntheticNodes.size === 0) {
    return source;
  }

  const nodeLines = [...syntheticNodes.entries()].map(
    ([nodeId, label]) => `        ${nodeId}["${escapeMermaidLabel(label)}"]`,
  );
  const utilitiesSubgraphRegex = /(subgraph\s+Utilities\s+\["Utilities"\][\s\S]*?)(\n\s*end)/m;

  if (utilitiesSubgraphRegex.test(source)) {
    return source.replace(utilitiesSubgraphRegex, (fullMatch, beforeEnd, endLine) => {
      const existing = beforeEnd;
      const toInsert = nodeLines.filter((line) => !existing.includes(line.trim()));
      if (toInsert.length === 0) {
        return fullMatch;
      }
      return `${beforeEnd}\n${toInsert.join("\n")}${endLine}`;
    });
  }

  return `${source.trimEnd()}\n\nsubgraph Utilities ["Utilities"]\n${nodeLines.join("\n")}\nend\n`;
};

export const generateRuntimeDependencyMap = async (projectRoot) => {
  const dependencyMapPath = join(projectRoot, "design_refs", "dependency_map.mmd");
  const outputPath = join(projectRoot, "design_refs", RUNTIME_FILE_NAME);

  const dependencyMap = readFileSync(dependencyMapPath, "utf8");
  const existingNodeIds = extractNodeIds(dependencyMap);
  const { unlockCatalog } = await loadCompiledUnlockModules(projectRoot);
  const unlockTargets = buildUnlockTargetEdgesAndSyntheticNodes(unlockCatalog, existingNodeIds);
  const withoutSubgraphEdges = stripSubgraphEdges(dependencyMap);
  const withSyntheticUtilities = addSyntheticUtilitiesNodes(withoutSubgraphEdges, unlockTargets.syntheticNodes);
  const unlockSubgraph = buildUnlockSubgraph(unlockCatalog);
  const domainEdges = buildDomainEdges(unlockCatalog);
  const generated = `${withSyntheticUtilities.trimEnd()}\n\n${unlockSubgraph}\n\n${domainEdges.join("\n")}\n\n${unlockTargets.edges.join("\n")}\n`;

  writeFileSync(outputPath, generated, "utf8");

  return {
    outputPath,
    unlockCount: unlockCatalog.length,
    edgeCount: domainEdges.length + unlockTargets.edges.length,
    domainEdgeCount: domainEdges.length,
    unlockTargetEdgeCount: unlockTargets.edges.length,
  };
};

const runAsCli = async () => {
  const projectRoot = process.cwd();
  const generated = await generateRuntimeDependencyMap(projectRoot);
  console.log(
    `GENERATED_MMD ${generated.outputPath} unlock_nodes=${generated.unlockCount} unlock_edges=${generated.edgeCount}`,
  );
};

const thisFilePath = fileURLToPath(import.meta.url);
const entryFilePath = process.argv[1] ? resolve(process.argv[1]) : null;
if (entryFilePath && thisFilePath === entryFilePath) {
  runAsCli().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`GENERATED_MMD_FAILED ${message}`);
    process.exitCode = 1;
  });
}

export { buildUnlockSubgraph, buildDomainEdges, toMermaidNodeId };
