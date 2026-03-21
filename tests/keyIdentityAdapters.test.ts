import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import { getButtonFace, getOperatorSlotFace, resolveKeyId } from "../src/domain/keyPresentation.js";

export const runKeyIdentityAdaptersTests = (): void => {
  assert.equal(resolveKeyId("op_add"), "op_add", "resolver keeps canonical key id");
  assert.equal(getButtonFace("op_div"), "\u00F7", "button-face lookup accepts canonical key ids");
  assert.equal(getOperatorSlotFace("op_mod"), "\u25C7", "operator-slot lookup accepts canonical key ids");

  const canonicalResult = reducer(initialState(), { type: "PRESS_KEY", key: k("exec_equals") });
  const repeatedCanonical = reducer(initialState(), { type: "PRESS_KEY", key: k("exec_equals") });
  assert.deepEqual(canonicalResult, repeatedCanonical, "canonical PRESS_KEY routing is deterministic");
};



