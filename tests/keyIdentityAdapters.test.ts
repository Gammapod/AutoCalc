import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { reducer } from "../src/domain/reducer.js";
import { getButtonFace, getOperatorSlotFace, resolveKeyId, toKeyId, toLegacyKey } from "../src/domain/keyPresentation.js";

export const runKeyIdentityAdaptersTests = (): void => {
  assert.equal(toKeyId("+"), "op_add", "legacy plus maps to canonical op_add");
  assert.equal(toLegacyKey("op_add"), "+", "canonical op_add maps to legacy plus");
  assert.equal(resolveKeyId("+"), "op_add", "resolver normalizes legacy key");
  assert.equal(resolveKeyId("op_add"), "op_add", "resolver keeps canonical key id");
  assert.equal(getButtonFace("op_div"), "\u00F7", "button-face lookup accepts canonical key ids");
  assert.equal(getOperatorSlotFace("op_mod"), "\u25C7", "operator-slot lookup accepts canonical key ids");

  assert.throws(() => toLegacyKey("not_a_key_id" as never), /Unsupported key id/, "invalid key id throws");

  const legacyResult = reducer(initialState(), { type: "PRESS_KEY", key: k("=") });
  const canonicalResult = reducer(initialState(), { type: "PRESS_KEY", key: k("exec_equals") });
  assert.deepEqual(canonicalResult, legacyResult, "canonical PRESS_KEY routing matches legacy behavior");
};


