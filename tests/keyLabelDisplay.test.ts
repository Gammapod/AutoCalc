import assert from "node:assert/strict";
import { formatKeyLabel } from "../src/ui/render.js";

export const runKeyLabelDisplayTests = (): void => {
  assert.equal(formatKeyLabel("*"), "×", "mul key label renders as ×");
  assert.equal(formatKeyLabel("+"), "+", "plus key label remains +");
  assert.equal(formatKeyLabel("NEG"), "-𝑥", "NEG key label uses stylized indicator");
};
