import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const runUiGrapherRoleColorTests = (): void => {
  const source = readFileSync(resolve(process.cwd(), "src/ui/modules/grapherRenderer.ts"), "utf8");

  assert.equal(
    source.includes("resolveUxRoleColor"),
    true,
    "grapher renderer resolves semantic colors through ux-role color resolver",
  );
  assert.equal(
    source.includes("resolveUxRoleColor(\"default\"")
      && source.includes("resolveUxRoleColor(\"imaginary\"")
      && source.includes("resolveUxRoleColor(\"analysis\"")
      && source.includes("resolveUxRoleColor(\"error\""),
    true,
    "grapher renderer maps default/imaginary/analysis/error paths to role-derived colors",
  );
  assert.equal(
    source.includes("#"),
    false,
    "grapher renderer no longer hardcodes semantic hex literals",
  );
};
