import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const releaseDir = resolve(root, "release");
mkdirSync(releaseDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = join("release", `build-${stamp}`);
const outputAbs = resolve(root, outputDir);

const cmd = `electron-builder --win portable --x64 --publish never --config.directories.output="${outputDir}"`;
const run = spawnSync(cmd, {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    CSC_IDENTITY_AUTO_DISCOVERY: "false",
  },
});

if (run.status !== 0) {
  process.exit(run.status ?? 1);
}

const exeName = readdirSync(outputAbs).find((name) => name.endsWith(".exe"));
if (!exeName) {
  console.error(`No .exe artifact found in ${outputAbs}`);
  process.exit(1);
}

const sourceExe = join(outputAbs, exeName);
const targetExe = join(releaseDir, exeName);
copyFileSync(sourceExe, targetExe);

console.log(`DESKTOP_BUILD_ARTIFACT ${targetExe}`);
