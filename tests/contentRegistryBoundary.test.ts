import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const collectSourceFiles = (dir: string): string[] => {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
};

export const runContentRegistryBoundaryTests = (): void => {
  const srcFiles = collectSourceFiles(resolve(process.cwd(), "src"));
  for (const file of srcFiles) {
    const normalized = file.replaceAll("\\", "op_div");
    if (
      normalized.endsWith("/src/contracts/contentRegistry.ts")
      || normalized.endsWith("/src/contracts/appServices.ts")
    ) {
      continue;
    }
    const source = readFileSync(file, "utf8");
    assert.equal(
      source.includes("getContentProvider("),
      false,
      `production source must not read global contentRegistry: ${normalized}`,
    );
  }
};

