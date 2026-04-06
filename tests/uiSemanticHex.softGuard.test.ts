import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type HexScanTarget = {
  path: string;
  label: string;
};

const TARGETS: readonly HexScanTarget[] = [
  { path: "index.html", label: "primary shell html" },
  { path: "mobile_web/index.html", label: "mobile shell html" },
  { path: "styles/visualizer-number-line.css", label: "number-line stylesheet" },
  { path: "src/ui/modules/grapherRenderer.ts", label: "grapher renderer" },
];

const SEMANTIC_HEX_PATTERNS: readonly RegExp[] = [
  /#ff6f6f/gi,
  /#ff8f7f/gi,
  /#be8ee8/gi,
  /#b4f1d3/gi,
  /#f2cf57/gi,
  /#79c3ff/gi,
  /#63c26b/gi,
  /#c996f0/gi,
];

const ALLOWLIST_LINE_PATTERNS: readonly RegExp[] = [
  /--ux-role-/,
  /--settings-stripe-family-/,
  /UX_ROLE_FALLBACK_HEX/,
  /resolveUxRoleColor/,
];

export const runUiSemanticHexStrictGuardTests = (): void => {
  const violations: string[] = [];

  for (const target of TARGETS) {
    const source = readFileSync(resolve(process.cwd(), target.path), "utf8");
    const lines = source.split(/\r?\n/);
    lines.forEach((line, index) => {
      const hasSemanticHex = SEMANTIC_HEX_PATTERNS.some((pattern) => pattern.test(line));
      SEMANTIC_HEX_PATTERNS.forEach((pattern) => {
        pattern.lastIndex = 0;
      });
      if (!hasSemanticHex) {
        return;
      }
      const allowed = ALLOWLIST_LINE_PATTERNS.some((pattern) => pattern.test(line));
      if (!allowed) {
        violations.push(`${target.label}:${(index + 1).toString()} ${line.trim()}`);
      }
    });
  }

  if (violations.length > 0) {
    assert.fail(
      [
        "[strict-guard] Semantic hex detected outside allowlist in migrated ux-role scope:",
        ...violations.map((violation) => `- ${violation}`),
      ].join("\n"),
    );
  }
};
