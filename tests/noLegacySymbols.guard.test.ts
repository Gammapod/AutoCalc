import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ACTIVE_DOCS = [
  "docs/functional-spec.md",
  "docs/ux-spec.md",
  "docs/contracts/action-event-reducer-boundary.md",
  "docs/contracts/ui-domain-contract.md",
  "docs/planning/Planning Board.md",
] as const;

const ACTIVE_CODE = [
  "src/domain/engine.ts",
  "src/domain/events.ts",
  "src/domain/commands.ts",
  "src/infra/persistence/localStorageRepo.ts",
  "src/infra/persistence/migrations.core.ts",
] as const;

const RETIRED_SYMBOL_PATTERNS: readonly RegExp[] = [
  /\bALLOCATOR_/,
  /\bv(?:iz_)?eigen_allocator\b/,
  /\bmemory_(adjust|cycle|recall)/,
  /\bsessionControlProfiles\b/,
  /\bselectedControlField\b/,
  /\ballocator(Return|Allocate)PressCount\b/,
  /\bexecutePlanIRLegacyPath\b/,
];

const assertNoRetiredSymbols = (path: string): void => {
  const content = readFileSync(path, "utf8");
  for (const pattern of RETIRED_SYMBOL_PATTERNS) {
    assert.equal(
      pattern.test(content),
      false,
      `retired legacy symbol '${pattern.toString()}' must not appear in active surface ${path}`,
    );
  }
};

export const runNoLegacySymbolsGuardTests = (): void => {
  for (const path of ACTIVE_DOCS) {
    assertNoRetiredSymbols(path);
  }
  for (const path of ACTIVE_CODE) {
    assertNoRetiredSymbols(path);
  }
};
