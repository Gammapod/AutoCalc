import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readIndexHtml = (): string =>
  readFileSync(resolve(process.cwd(), "index.html"), "utf8");

export const runUiVisualizerFitContractTests = (): void => {
  const css = readIndexHtml();

  assert.equal(
    /v2-algebraic-equation[^}]*overflow-x:\s*auto;/.test(css),
    false,
    "algebraic visualizer does not use horizontal scroll fallback",
  );
  assert.equal(
    /v2-eigen-equation[^}]*overflow-x:\s*auto;/.test(css),
    false,
    "eigen visualizer does not use horizontal scroll fallback",
  );
  assert.equal(
    /v2-factorization-table[^}]*overflow-y:\s*auto;/.test(css),
    false,
    "factorization visualizer does not use vertical scroll fallback",
  );
  assert.equal(
    css.includes("data-v2-fit-overflow"),
    true,
    "visualizer host CSS contract includes fit-overflow state selector",
  );
};

