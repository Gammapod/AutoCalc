import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RUNTIME_FILE_NAME = "dependency_map.runtime.mmd";

const toMermaidNodeId = (unlockId) => {
  const normalized = unlockId.replace(/[^A-Za-z0-9_]/g, "_");
  return normalized.match(/^[A-Za-z]/) ? `U_${normalized}` : `U_unlock_${normalized}`;
};

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
  const resolverModulePath = join(projectRoot, "dist", "src", "content", "unlockDomainResolver.js");

  const catalogModule = await import(pathToFileURL(catalogModulePath).href);
  const resolverModule = await import(pathToFileURL(resolverModulePath).href);

  if (!Array.isArray(catalogModule.unlockCatalog)) {
    throw new Error("unlockCatalog export not found in compiled catalog module.");
  }

  if (typeof resolverModule.resolveUnlockDomainNodeId !== "function") {
    throw new Error("resolveUnlockDomainNodeId export not found in compiled resolver module.");
  }

  return {
    unlockCatalog: catalogModule.unlockCatalog,
    resolveUnlockDomainNodeId: resolverModule.resolveUnlockDomainNodeId,
  };
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

const buildDomainEdges = (unlocks, resolveUnlockDomainNodeId) =>
  unlocks.map((unlock) => {
    const nodeId = toMermaidNodeId(unlock.id);
    const domainNodeId = resolveUnlockDomainNodeId(unlock);
    return `${domainNodeId} --> ${nodeId}`;
  });

const resolveUnlockTarget = (unlock, existingNodeIds) => {
  const makeTarget = (preferredNodeId, label, fallbackNodeId) => {
    if (existingNodeIds.has(preferredNodeId)) {
      return { nodeId: preferredNodeId, label, synthetic: false };
    }
    return { nodeId: fallbackNodeId, label, synthetic: true };
  };

  if (unlock.effect.type === "unlock_slot_operator") {
    if (unlock.effect.key === "+") {
      return makeTarget("Oplus", "+", "Ut_op_plus");
    }
    if (unlock.effect.key === "-") {
      return makeTarget("Ominus", "-", "Ut_op_minus");
    }
  }

  if (unlock.effect.type === "unlock_utility") {
    if (unlock.effect.key === "C") {
      return makeTarget("Uc", "C", "Ut_utility_C");
    }
    if (unlock.effect.key === "CE") {
      return makeTarget("Uce", "CE", "Ut_utility_CE");
    }
  }

  if (unlock.effect.type === "unlock_execution") {
    return makeTarget("Oeq", "=", "Ut_exec_eq");
  }

  if (unlock.effect.type === "unlock_digit") {
    if (!existingNodeIds.has("Idigits")) {
      throw new Error(
        `Cannot resolve unlock target for "${unlock.id}" with effect "unlock_digit". Missing Idigits node in dependency_map.mmd.`,
      );
    }
    return { nodeId: "Idigits", label: "0-9", synthetic: false };
  }

  if (unlock.effect.type === "increase_max_total_digits") {
    return {
      nodeId: `Ut_max_total_digits_plus_${unlock.effect.amount}`,
      label: `max total digits +${unlock.effect.amount}`,
      synthetic: true,
    };
  }

  const effectType = unlock.effect && typeof unlock.effect.type === "string" ? unlock.effect.type : "unknown";
  throw new Error(
    `Cannot resolve unlock target for "${unlock.id}" with effect "${effectType}". Add mapping rule or explicit target metadata.`,
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
  const { unlockCatalog, resolveUnlockDomainNodeId } = await loadCompiledUnlockModules(projectRoot);
  const unlockTargets = buildUnlockTargetEdgesAndSyntheticNodes(unlockCatalog, existingNodeIds);
  const withoutSubgraphEdges = stripSubgraphEdges(dependencyMap);
  const withSyntheticUtilities = addSyntheticUtilitiesNodes(withoutSubgraphEdges, unlockTargets.syntheticNodes);
  const unlockSubgraph = buildUnlockSubgraph(unlockCatalog);
  const domainEdges = buildDomainEdges(unlockCatalog, resolveUnlockDomainNodeId);
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
