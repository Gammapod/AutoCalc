import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const assertBootHtmlUsesLazyJsDeps = (path: string): void => {
  const source = readFileSync(resolve(process.cwd(), path), "utf8");
  assert.equal(
    source.includes('<script src="./node_modules/katex/dist/katex.min.js"></script>'),
    false,
    `${path} should not eagerly load katex.min.js`,
  );
  assert.equal(
    source.includes('<script src="./node_modules/chart.js/dist/chart.umd.min.js"></script>'),
    false,
    `${path} should not eagerly load chart.umd.min.js`,
  );
  assert.equal(
    source.includes('<script src="./node_modules/algebrite/dist/algebrite.bundle-for-browser.js"></script>'),
    false,
    `${path} should not eagerly load algebrite bundle`,
  );
  assert.equal(
    source.includes('<link rel="stylesheet" href="./node_modules/katex/dist/katex.min.css" />'),
    true,
    `${path} keeps KaTeX CSS eager in this slice`,
  );
};

export const runBootDependencyLazyLoadContractTests = (): void => {
  assertBootHtmlUsesLazyJsDeps("index.html");
  assertBootHtmlUsesLazyJsDeps("mobile_web/index.html");
};

