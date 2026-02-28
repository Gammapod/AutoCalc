import assert from "node:assert/strict";
import { formatKeyLabel } from "../src/ui/render.js";

export const runKeyLabelDisplayTests = (): void => {
  assert.equal(formatKeyLabel("*"), "\u00D7", "mul key label renders as \u00D7");
  assert.equal(formatKeyLabel("/"), "\u00F7", "div key label renders as \u00F7");
  assert.equal(formatKeyLabel("#"), "#/⟡", "euclidean division key label renders as #/⟡");
  assert.equal(formatKeyLabel("⟡"), "⟡", "modulo key label renders as ⟡");
  assert.equal(formatKeyLabel("+"), "+", "plus key label remains +");
  assert.equal(formatKeyLabel("NEG"), "-\u{1D465}", "NEG key label uses stylized indicator");
};

