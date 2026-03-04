import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const releaseDir = resolve(root, "release");
mkdirSync(releaseDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputDir = join("release", `build-${stamp}`);
const outputAbs = resolve(root, outputDir);

const hasWinSigningInputs = Boolean(process.env.WIN_CSC_LINK && process.env.WIN_CSC_KEY_PASSWORD);
const env = {
  ...process.env,
};

if (hasWinSigningInputs) {
  env.CSC_LINK = process.env.WIN_CSC_LINK;
  env.CSC_KEY_PASSWORD = process.env.WIN_CSC_KEY_PASSWORD;
  if (process.env.WIN_CSC_TSA_URL) {
    env.CSC_TSA_URL = process.env.WIN_CSC_TSA_URL;
  }
} else {
  // Keep local unsigned builds deterministic when no cert is configured.
  env.CSC_IDENTITY_AUTO_DISCOVERY = "false";
}

const unsignedOverride = hasWinSigningInputs ? "" : " --config.win.signAndEditExecutable=false";
const cmd = `electron-builder --win portable --x64 --publish never --config.directories.output="${outputDir}"${unsignedOverride}`;
const run = spawnSync(cmd, {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env,
});

if (run.status !== 0) {
  process.exit(run.status ?? 1);
}

if (!existsSync(outputAbs)) {
  console.error(`Expected output directory does not exist: ${outputAbs}`);
  process.exit(1);
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
