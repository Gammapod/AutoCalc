import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");
const depCruiseBin = process.platform === "win32"
  ? resolve(rootDir, "node_modules/.bin/depcruise.cmd")
  : resolve(rootDir, "node_modules/.bin/depcruise");
const configPath = resolve(rootDir, ".dependency-cruiser.cjs");
const snapshotPath = resolve(rootDir, "dist/reports/boundary-violations.json");
const orphanReportPath = resolve(rootDir, "dist/reports/orphan-modules.json");
const filenameHygienePath = resolve(rootDir, "dist/reports/filename-hygiene.json");
const reportsDir = resolve(rootDir, "dist/reports");

const runDepCruise = (args) =>
  spawnSync(depCruiseBin, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

const runGit = (args) =>
  spawnSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

const stripComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const isTypeOnlyModule = async (pathFromRoot) => {
  if (pathFromRoot.endsWith(".d.ts")) {
    return true;
  }
  const source = await readFile(resolve(rootDir, pathFromRoot), "utf8");
  const text = stripComments(source);
  if (/\bexport\s+default\b/.test(text)) {
    return false;
  }
  if (/(^|\n)\s*import\s+["'][^"']+["']\s*;?/m.test(text)) {
    return false;
  }
  if (/\b(?:export\s+)?(?:const|let|var|function|class|enum)\b/.test(text)) {
    return false;
  }
  if (/(^|\n)\s*export\s*\{(?!\s*type\b)[^}]+\}\s*;?/m.test(text)) {
    return false;
  }
  return true;
};

const collectFilesInRepo = () => {
  const tracked = runGit(["ls-files"]);
  const untracked = runGit(["ls-files", "--others", "--exclude-standard"]);
  const parse = (value) =>
    (value ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  return [...new Set([...parse(tracked.stdout), ...parse(untracked.stdout)])];
};

const allowedValueOrphans = new Set([
  // Intentional legacy test/adapter seam; used via tests/scripts dynamic loading.
  "src/contracts/contentRegistry.ts",
]);

await mkdir(reportsDir, { recursive: true });
try {
  await access(reportsDir);
} catch {
  throw new Error(`Boundary precondition failed: reports directory not available at ${reportsDir}`);
}

const jsonRun = runDepCruise(["--config", configPath, "--output-type", "json", "src"]);
const snapshot = (jsonRun.stdout ?? "").trim();
if (snapshot.length > 0) {
  await writeFile(snapshotPath, `${snapshot}\n`, "utf8");
} else {
  await writeFile(snapshotPath, `${JSON.stringify({ warning: "No dependency-cruiser output." }, null, 2)}\n`, "utf8");
}

const reportRun = runDepCruise(["--config", configPath, "--output-type", "err-long", "src"]);
if (reportRun.stdout) {
  process.stdout.write(reportRun.stdout);
}
if (reportRun.stderr) {
  process.stderr.write(reportRun.stderr);
}

if (jsonRun.status !== 0 || reportRun.status !== 0) {
  if (jsonRun.error) {
    console.error(jsonRun.error);
  }
  if (reportRun.error) {
    console.error(reportRun.error);
  }
  process.exit(1);
}

const cruiseReport = snapshot.length > 0 ? JSON.parse(snapshot) : { modules: [] };
const orphanModules = (cruiseReport.modules ?? [])
  .filter((module) => module.orphan === true)
  .map((module) => module.source)
  .sort((a, b) => a.localeCompare(b));

const orphanMeta = await Promise.all(
  orphanModules.map(async (modulePath) => ({
    modulePath,
    typeOnly: await isTypeOnlyModule(modulePath),
  })),
);
const actionableOrphans = orphanMeta
  .filter((entry) => !entry.typeOnly && !allowedValueOrphans.has(entry.modulePath))
  .map((entry) => entry.modulePath);

const files = collectFilesInRepo();
const duplicateNamePattern = /\s\(\d+\)\.[^/\\]+$/;
const duplicateFilenameHits = files.filter((filePath) => duplicateNamePattern.test(basename(filePath)));

await writeFile(
  orphanReportPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      orphanModules: orphanMeta,
      actionableOrphans,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

await writeFile(
  filenameHygienePath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      duplicateFilenameHits,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

if (actionableOrphans.length > 0 || duplicateFilenameHits.length > 0) {
  if (actionableOrphans.length > 0) {
    console.error("Actionable orphan value modules detected:");
    for (const modulePath of actionableOrphans) {
      console.error(`- ${modulePath}`);
    }
  }
  if (duplicateFilenameHits.length > 0) {
    console.error("Duplicate-artifact filename pattern detected:");
    for (const filePath of duplicateFilenameHits) {
      console.error(`- ${filePath}`);
    }
  }
  process.exit(1);
}
