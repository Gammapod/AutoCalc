import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

const [{ unlockCatalog }, { initialState }, { setContentProvider }, { setAppServices }, { defaultContentProvider }] = await Promise.all([
  import(pathToFileURL(resolve(rootDir, "dist/src/content/unlocks.catalog.js")).href),
  import(pathToFileURL(resolve(rootDir, "dist/src/domain/state.js")).href),
  import(pathToFileURL(resolve(rootDir, "dist/src/contracts/contentRegistry.js")).href),
  import(pathToFileURL(resolve(rootDir, "dist/src/contracts/appServices.js")).href),
  import(pathToFileURL(resolve(rootDir, "dist/src/content/defaultContentProvider.js")).href),
]);
setContentProvider(defaultContentProvider);
setAppServices({ contentProvider: defaultContentProvider });

const unlockGraphModule = await import(pathToFileURL(resolve(rootDir, "dist/src/domain/unlockGraph.js")).href);

const {
  buildUnlockGraphReport,
  buildUnlockProofReport,
  deriveUnlockedKeysFromState,
  filterUnlockGraphToIncomingUnlockKeys,
  formatUnlockGraphReport,
  formatUnlockGraphMermaid,
  formatUnlockProofReport,
} = unlockGraphModule;

const parseBound = (name, fallback) => {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.trunc(parsed);
};

const cacheMode = process.env.CI === "true" ? "off" : (process.env.PROOF_CACHE_MODE === "off" ? "off" : "local");
const bounds = {
  maxSeconds: parseBound("PROOF_MAX_SECONDS", 60),
  maxDepth: parseBound("PROOF_MAX_DEPTH", 18),
  maxStatesPerUnlock: parseBound("PROOF_MAX_STATES", 20000),
};

const bigintReviver = (_key, value) =>
  value && typeof value === "object" && "__bigint" in value
    ? BigInt(value.__bigint)
    : value;
const bigintReplacer = (_key, value) =>
  typeof value === "bigint"
    ? { __bigint: value.toString() }
    : value;

const cacheDir = resolve(rootDir, ".cache");
const cachePath = resolve(cacheDir, "unlock-proof-cache.json");
let cacheSnapshot = null;
if (cacheMode === "local") {
  try {
    const cacheRaw = await readFile(cachePath, "utf8");
    cacheSnapshot = JSON.parse(cacheRaw, bigintReviver);
  } catch {
    cacheSnapshot = null;
  }
}

const proofResult = buildUnlockProofReport(unlockCatalog, {
  now: new Date(),
  bounds,
  cacheMode,
  cacheSnapshot,
  initialStates: [initialState()],
});
if (cacheMode === "local") {
  await mkdir(cacheDir, { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(proofResult.cacheSnapshot, bigintReplacer, 2)}\n`, "utf8");
}

const report = buildUnlockGraphReport(
  unlockCatalog,
  deriveUnlockedKeysFromState(initialState()),
  new Date(),
  proofResult.report,
);
const markdown = formatUnlockGraphReport(report);
const json = `${JSON.stringify(report, null, 2)}\n`;
const mermaid = formatUnlockGraphMermaid(report.graph);
const proofMarkdown = formatUnlockProofReport(proofResult.report);
const proofJson = `${JSON.stringify(proofResult.report, null, 2)}\n`;
const incomingUnlockOnlyMermaid = formatUnlockGraphMermaid(
  filterUnlockGraphToIncomingUnlockKeys(report.graph, ["++"]),
);

const outDir = resolve(rootDir, "dist/reports");
await mkdir(outDir, { recursive: true });
await Promise.all([
  writeFile(resolve(outDir, "unlock-graph-report.md"), markdown, "utf8"),
  writeFile(resolve(outDir, "unlock-graph-report.json"), json, "utf8"),
  writeFile(resolve(outDir, "unlock-graph-report.mmd"), mermaid, "utf8"),
  writeFile(resolve(outDir, "unlock-graph-report.incoming-unlock-keys.mmd"), incomingUnlockOnlyMermaid, "utf8"),
  writeFile(resolve(outDir, "unlock-proof-report.md"), proofMarkdown, "utf8"),
  writeFile(resolve(outDir, "unlock-proof-report.json"), proofJson, "utf8"),
]);

console.log("Generated unlock graph reports:");
console.log("- dist/reports/unlock-graph-report.md");
console.log("- dist/reports/unlock-graph-report.json");
console.log("- dist/reports/unlock-graph-report.mmd");
console.log("- dist/reports/unlock-graph-report.incoming-unlock-keys.mmd");
console.log("- dist/reports/unlock-proof-report.md");
console.log("- dist/reports/unlock-proof-report.json");
