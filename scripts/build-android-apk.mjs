import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const androidDir = resolve(root, "android");
if (!existsSync(androidDir)) {
  console.error(`Android project not found: ${androidDir}`);
  console.error("Run npm run mobile:android:sync first.");
  process.exit(1);
}

const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const assemble = spawnSync(`${gradlew} assembleRelease`, {
  cwd: androidDir,
  stdio: "inherit",
  shell: true,
});
if (assemble.status !== 0) {
  process.exit(assemble.status ?? 1);
}

const apkPath = resolve(androidDir, "app", "build", "outputs", "apk", "release", "app-release.apk");
if (!existsSync(apkPath)) {
  console.error(`Expected release APK not found: ${apkPath}`);
  process.exit(1);
}

console.log(`ANDROID_APK_ARTIFACT ${apkPath}`);
