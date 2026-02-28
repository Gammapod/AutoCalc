import assert from "node:assert/strict";
import { getKeyVisualGroup } from "../src/ui/render.js";

export const runKeyVisualGroupTests = (): void => {
  assert.equal(getKeyVisualGroup("0"), "value_expression", "digit keys use value_expression group");
  assert.equal(getKeyVisualGroup("NEG"), "value_expression", "NEG uses value_expression group");
  assert.equal(getKeyVisualGroup("+"), "slot_operator", "slot operators use slot_operator group");
  assert.equal(getKeyVisualGroup("⟡"), "slot_operator", "modulo operator uses slot_operator group");
  assert.equal(getKeyVisualGroup("C"), "utility", "C uses utility group");
  assert.equal(getKeyVisualGroup("CE"), "utility", "CE uses utility group");
  assert.equal(getKeyVisualGroup("="), "execution", "equals uses execution group");
  assert.equal(getKeyVisualGroup("\u23EF"), "execution", "play/pause uses execution group");
};

