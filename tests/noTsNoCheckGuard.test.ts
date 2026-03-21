import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const collectTestFiles = (rootDir: string): string[] => {
  const stack: string[] = [rootDir];
  const files: string[] = [];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    for (const entry of readdirSync(current)) {
      const fullPath = join(current, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        stack.push(fullPath);
      } else if (stats.isFile() && fullPath.endsWith(".ts")) {
        files.push(fullPath);
      }
    }
  }
  return files;
};

export const runNoTsNoCheckGuardTests = (): void => {
  const testsDir = join(process.cwd(), "tests");
  const offenders: string[] = [];
  for (const filePath of collectTestFiles(testsDir)) {
    const source = readFileSync(filePath, "utf8");
    if (source.includes("@ts-" + "nocheck")) {
      offenders.push(relative(process.cwd(), filePath));
    }
  }
  assert.deepEqual(offenders, [], `tests must not contain @ts-${"nocheck"}; offenders: ${offenders.join(", ")}`);
};

