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
  const root = resolve(process.cwd(), "src_v2");
  const files = collectTsFiles(root);

  const offenders: string[] = [];
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const hasUiImport = /from\s+["'][^"']*src\/ui\//.test(content) || /import\(["'][^"']*src\/ui\//.test(content);
    if (hasUiImport) {
      offenders.push(normalize(file));
    }
  }

  assert.deepEqual(offenders, [], `src_v2 must not import src/ui modules. Offenders: ${offenders.join(", ")}`);
};
