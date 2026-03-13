import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const releaseDir = resolve(root, "release");

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

const requiredDirs = [
  resolve(root, "mobile_web"),
  resolve(root, "design_refs"),
  resolve(root, "dist", "reports"),
];

for (const dir of requiredDirs) {
  if (!existsSync(dir)) {
    console.error(`Required directory not found: ${dir}`);
    process.exit(1);
  }
}

mkdirSync(releaseDir, { recursive: true });

if (existsSync(zipPath)) {
  rmSync(zipPath, { force: true });
}

const archive = spawnSync(
  "tar",
  [
    "-a",
    "-c",
    "-f",
    zipPath,
    "-C",
    root,
    "mobile_web",
    "design_refs",
    "dist/reports",
  ],
  { stdio: "inherit" },
);

if (archive.status !== 0) {
  process.exit(archive.status ?? 1);
}

console.log(`ITCH_ZIP_ARTIFACT ${zipPath}`);
