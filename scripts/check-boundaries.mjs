import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
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

const runDepCruise = (args) =>
  spawnSync(depCruiseBin, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

await mkdir(resolve(rootDir, "dist/reports"), { recursive: true });

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
