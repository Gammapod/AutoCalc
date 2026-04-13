import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const runBootstrapDebugControlBindingsTests = (): void => {
  const refsSource = readFileSync(resolve(process.cwd(), "src/ui/bootstrap/bootstrapUiRefs.ts"), "utf8");
  const controllerSource = readFileSync(resolve(process.cwd(), "src/ui/bootstrap/bootstrapUiController.ts"), "utf8");
  const htmlSource = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

  assert.equal(
    refsSource.includes("[data-debug-control-delta-q]"),
    true,
    "bootstrap refs should query delta_q debug selector",
  );
  assert.equal(
    refsSource.includes("delta_q: deltaQInput"),
    true,
    "bootstrap refs should expose delta_q debug input binding",
  );
  assert.equal(
    controllerSource.includes("\"delta_q\""),
    true,
    "bootstrap controller should include delta_q control field",
  );
  assert.equal(
    controllerSource.includes("delta_q: fallback.delta_q"),
    true,
    "bootstrap controller should apply delta_q fallback value",
  );
  assert.equal(
    htmlSource.includes("data-debug-control-delta-q"),
    true,
    "desktop debug menu should render delta_q input",
  );
};
