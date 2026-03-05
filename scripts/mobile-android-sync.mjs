import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const androidDir = resolve(root, "android");

const run = (command) => {
  const result = spawnSync(command, {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

if (!existsSync(androidDir)) {
  console.log("Android project not found. Running: npx cap add android");
  run("npx cap add android");
}

run("npx cap sync android");
console.log(`ANDROID_SYNC_COMPLETE ${androidDir}`);
