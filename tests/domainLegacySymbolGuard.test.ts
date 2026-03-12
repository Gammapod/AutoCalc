import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DOMAIN_ROOT = join(process.cwd(), "src", "domain");
const EXCLUDED_FILES = new Set(["keyPresentation.ts", "buttonRegistry.ts"]);
const LEGACY_SYMBOL_COMPARE_RE = /\b(key|operator)\b\s*===\s*["'][^"']+["']/;

const walkFiles = (root: string): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(root)) {
    const fullPath = join(root, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      out.push(...walkFiles(fullPath));
      continue;
    }
    if (entry.endsWith(".ts")) {
      out.push(fullPath);
    }
  }
  return out;
};

export const runDomainLegacySymbolGuardTests = (): void => {
  const violations: string[] = [];
  const files = walkFiles(DOMAIN_ROOT).filter((filePath) => !EXCLUDED_FILES.has(filePath.split(/[\\/]/).at(-1) ?? ""));
  for (const filePath of files) {
    const content = readFileSync(filePath, "utf8");
    if (LEGACY_SYMBOL_COMPARE_RE.test(content)) {
      violations.push(filePath);
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Found legacy symbol equality checks in domain files:\n${violations.join("\n")}`,
  );
};
