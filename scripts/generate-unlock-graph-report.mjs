import { mkdir, writeFile } from "node:fs/promises";
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
  deriveUnlockedKeysFromState,
  formatUnlockGraphReport,
  formatUnlockGraphMermaid,
} = unlockGraphModule;

const report = buildUnlockGraphReport(
  unlockCatalog,
  deriveUnlockedKeysFromState(initialState()),
  new Date(),
);
const markdown = formatUnlockGraphReport(report);
const json = `${JSON.stringify(report, null, 2)}\n`;
const mermaid = formatUnlockGraphMermaid(report.graph);

const outDir = resolve(rootDir, "dist/reports");
await mkdir(outDir, { recursive: true });
await Promise.all([
  writeFile(resolve(outDir, "unlock-graph-report.md"), markdown, "utf8"),
  writeFile(resolve(outDir, "unlock-graph-report.json"), json, "utf8"),
  writeFile(resolve(outDir, "unlock-graph-report.mmd"), mermaid, "utf8"),
]);

console.log("Generated unlock graph reports:");
console.log("- dist/reports/unlock-graph-report.md");
console.log("- dist/reports/unlock-graph-report.json");
console.log("- dist/reports/unlock-graph-report.mmd");
