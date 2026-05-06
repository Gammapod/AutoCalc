import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readRequiredSource = (path: string): string =>
  readFileSync(resolve(process.cwd(), path), "utf8");

export const runUiVisualizerFitContractTests = (): void => {
  const sources = [
    readRequiredSource("index.html"),
    readRequiredSource("styles/key-visual-affordance.css"),
    readRequiredSource("styles/key-family.css"),
  ];

  assert.equal(
    sources.every((source) => source.trim().length > 0),
    true,
    "visualizer/key-affordance source files are readable for runtime and semantic renderer tests",
  );
  assert.equal(
    sources.some((source) => source.includes("<<<<<<<") || source.includes("=======") || source.includes(">>>>>>>")),
    false,
    "visualizer/key-affordance source files do not contain merge conflict markers",
  );
};
