import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const collectTsFiles = (dir: string): string[] => {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...collectTsFiles(fullPath));
      continue;
    }
    if (entry.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
};

const normalize = (value: string): string => value.replaceAll("\\", "/");

export const runV2ImportBoundaryTests = (): void => {
  const root = resolve(process.cwd(), "src");
  const files = collectTsFiles(root);

  const offenders: string[] = [];
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const hasForbiddenImport =
      /from\s+["'][^"']*src\//.test(content) ||
      /import\(["'][^"']*src\//.test(content) ||
      /from\s+["'][^"']*src_legacy_tmp\//.test(content) ||
      /import\(["'][^"']*src_legacy_tmp\//.test(content);
    if (hasForbiddenImport) {
      offenders.push(normalize(file));
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `src must not use root-style src/* imports or src_legacy_tmp imports. Offenders: ${offenders.join(", ")}`,
  );
};
