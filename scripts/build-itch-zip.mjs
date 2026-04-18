import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const releaseDir = resolve(root, "release");
const stagingRoot = resolve(releaseDir, ".itch-staging");
const designRefsSource = existsSync(resolve(root, "design_refs"))
  ? resolve(root, "design_refs")
  : resolve(root, "docs", "design_refs");

const packageJsonPath = resolve(root, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const rawVersion = String(packageJson.version ?? "").trim();
const versionMatch = rawVersion.match(/^(\d+)\.(\d+)\.(\d+)/);

if (!versionMatch) {
  console.error(`Unable to derive semantic version from package.json version: "${rawVersion}"`);
  process.exit(1);
}

const [, major, minor, patch] = versionMatch;
const zipName = `AutoCalc_itch_v${major}_${minor}_${patch}.zip`;
const zipPath = resolve(releaseDir, zipName);

const requiredPaths = [
  resolve(root, "index.html"),
  resolve(root, "styles", "key-visual-affordance.css"),
  resolve(root, "dist"),
  designRefsSource,
  resolve(root, "dist", "reports"),
  resolve(root, "node_modules", "katex", "dist", "katex.min.css"),
  resolve(root, "node_modules", "katex", "dist", "katex.min.js"),
  resolve(root, "node_modules", "katex", "dist", "fonts"),
  resolve(root, "node_modules", "chart.js", "dist", "chart.umd.min.js"),
  resolve(root, "node_modules", "algebrite", "dist", "algebrite.bundle-for-browser.js"),
];

for (const path of requiredPaths) {
  if (!existsSync(path)) {
    console.error(`Required build input not found: ${path}`);
    process.exit(1);
  }
}

mkdirSync(releaseDir, { recursive: true });
rmSync(stagingRoot, { recursive: true, force: true });
mkdirSync(stagingRoot, { recursive: true });

if (existsSync(zipPath)) {
  rmSync(zipPath, { force: true });
}

const isExcludedWebDistPath = (sourcePath) => {
  const normalized = sourcePath.replaceAll("\\", "/");
  if (normalized.endsWith(".map")) {
    return true;
  }
  if (normalized.includes("/dist/tests/")) {
    return true;
  }
  return normalized.endsWith("/dist/tests");
};

const copyRuntimeWebPayload = (sourceDir, targetDir) => {
  cpSync(sourceDir, targetDir, {
    recursive: true,
    filter: (sourcePath) => !isExcludedWebDistPath(sourcePath),
  });
};

const copyIntoStaging = (fromRootRelativePath, toStagingRelativePath = fromRootRelativePath) => {
  const source = resolve(root, fromRootRelativePath);
  const destination = resolve(stagingRoot, toStagingRelativePath);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
};

// Build a fresh mobile_web payload in staging (avoid stale local mobile_web artifacts).
copyIntoStaging("index.html", "mobile_web/index.html");
copyIntoStaging("styles", "mobile_web/styles");
copyRuntimeWebPayload(resolve(root, "dist"), resolve(stagingRoot, "mobile_web", "dist"));
copyIntoStaging("node_modules/katex/dist/katex.min.css", "mobile_web/node_modules/katex/dist/katex.min.css");
copyIntoStaging("node_modules/katex/dist/katex.min.js", "mobile_web/node_modules/katex/dist/katex.min.js");
copyIntoStaging("node_modules/katex/dist/fonts", "mobile_web/node_modules/katex/dist/fonts");
copyIntoStaging("node_modules/chart.js/dist/chart.umd.min.js", "mobile_web/node_modules/chart.js/dist/chart.umd.min.js");
copyIntoStaging("node_modules/algebrite/dist/algebrite.bundle-for-browser.js", "mobile_web/node_modules/algebrite/dist/algebrite.bundle-for-browser.js");

// Keep requested folders in the archive.
cpSync(designRefsSource, resolve(stagingRoot, "design_refs"), { recursive: true });
cpSync(resolve(root, "dist", "reports"), resolve(stagingRoot, "dist", "reports"), { recursive: true });

// Add itch-playable root structure.
cpSync(resolve(stagingRoot, "mobile_web", "index.html"), resolve(stagingRoot, "index.html"));
cpSync(resolve(stagingRoot, "mobile_web", "styles"), resolve(stagingRoot, "styles"), { recursive: true });
cpSync(resolve(stagingRoot, "mobile_web", "dist"), resolve(stagingRoot, "dist"), { recursive: true });
cpSync(resolve(stagingRoot, "mobile_web", "node_modules"), resolve(stagingRoot, "node_modules"), { recursive: true });

const archive = spawnSync(
  "tar",
  [
    "-a",
    "-c",
    "-f",
    zipPath,
    "-C",
    stagingRoot,
    "index.html",
    "styles",
    "dist",
    "node_modules",
    "mobile_web",
    "design_refs",
  ],
  { stdio: "inherit" },
);

rmSync(stagingRoot, { recursive: true, force: true });

if (archive.status !== 0) {
  process.exit(archive.status ?? 1);
}

console.log(`ITCH_ZIP_ARTIFACT ${zipPath}`);
