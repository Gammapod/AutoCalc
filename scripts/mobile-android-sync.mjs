import { existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, sep } from "node:path";

const root = process.cwd();
const androidDir = resolve(root, "android");
const isWindows = process.platform === "win32";

const runCommand = (command, options = { capture: false }) => {
  const result = spawnSync(command, {
    cwd: root,
    shell: true,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });

  if (options.capture) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    if (result.error) {
      console.error(result.error);
    }
  }

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    errorMessage: result.error ? String(result.error.message ?? result.error) : "",
  };
};

const runOrExit = (command) => {
  const result = runCommand(command);
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const containsEPERMSignal = (result) => {
  const merged = `${result.stdout}\n${result.stderr}\n${result.errorMessage}`;
  return /(?:\bEPERM\b|operation not permitted)/i.test(merged);
};

const normalizeWithinAndroid = (candidatePath) => {
  const normalized = resolve(candidatePath);
  const androidPrefix = `${androidDir}${sep}`;
  if (normalized !== androidDir && !normalized.startsWith(androidPrefix)) {
    throw new Error(`Refusing cleanup outside android/ tree: ${normalized}`);
  }
  return normalized;
};

const runAttribReadonlyClear = (targetPath) => {
  const escaped = targetPath.replaceAll("\"", "\"\"");
  runCommand(`attrib -R "${escaped}" /S /D`);
};

const performWindowsEPERMCleanup = () => {
  const recoveryTargets = [
    resolve(root, "android", "app", "src", "main", "assets", "public"),
    resolve(root, "android", "capacitor-cordova-android-plugins", "src", "main", "java"),
    resolve(root, "android", "capacitor-cordova-android-plugins", "src", "main", "res"),
  ].map(normalizeWithinAndroid);

  const actions = [];
  for (const target of recoveryTargets) {
    if (!existsSync(target)) {
      actions.push(`SKIP_MISSING:${target}`);
      continue;
    }
    try {
      runAttribReadonlyClear(target);
      rmSync(target, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 100,
      });
      actions.push(`CLEARED_AND_REMOVED:${target}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      actions.push(`CLEANUP_FAILED:${target}:${message}`);
    }
  }
  return actions;
};

const extractFailureSignal = (result) => {
  const lines = `${result.stderr}\n${result.stdout}\n${result.errorMessage}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const priorityLine = lines.find((line) => /(?:\bEPERM\b|operation not permitted|error|failed|fail)/i.test(line));
  return priorityLine ?? lines[0] ?? "no-signal";
};

if (!existsSync(androidDir)) {
  console.log("Android project not found. Running: npx cap add android");
  runOrExit("npx cap add android");
}

console.log("ANDROID_SYNC_ATTEMPT 1");
const attemptOne = runCommand("npx cap sync android", { capture: true });
if (attemptOne.status === 0) {
  console.log(`ANDROID_SYNC_COMPLETE ${androidDir}`);
  process.exit(0);
}

if (!isWindows || !containsEPERMSignal(attemptOne)) {
  process.exit(attemptOne.status);
}

console.error("ANDROID_SYNC_WINDOWS_EPERM_RECOVERY");
const cleanupActions = performWindowsEPERMCleanup();
console.error(`ANDROID_SYNC_WINDOWS_EPERM_RECOVERY_ACTIONS ${cleanupActions.join(" | ")}`);

console.log("ANDROID_SYNC_ATTEMPT 2");
const attemptTwo = runCommand("npx cap sync android", { capture: true });
if (attemptTwo.status === 0) {
  console.log(`ANDROID_SYNC_COMPLETE ${androidDir}`);
  process.exit(0);
}

console.error("ANDROID_SYNC_FAILED");
console.error(`ANDROID_SYNC_FIRST_FAILURE_SIGNAL ${extractFailureSignal(attemptOne)}`);
console.error(`ANDROID_SYNC_RECOVERY_ACTIONS ${cleanupActions.join(" | ")}`);
console.error(`ANDROID_SYNC_SECOND_FAILURE_SIGNAL ${extractFailureSignal(attemptTwo)}`);
process.exit(attemptTwo.status);
