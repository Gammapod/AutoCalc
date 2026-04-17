import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { getButtonFace, getOperatorSlotFace, resolveKeyId } from "../src/domain/keyPresentation.js";

export const runKeyIdentityAdaptersTests = (): void => {
  assert.equal(resolveKeyId("op_add"), "op_add", "resolver keeps canonical key id");
  assert.equal(getButtonFace("op_div"), "\u00F7", "button-face lookup accepts canonical key ids");
  assert.equal(getOperatorSlotFace("op_mod"), "\u25C7", "operator-slot lookup accepts canonical key ids");
  assert.equal(getOperatorSlotFace("op_euclid_tuple"), "\u2A38", "euclidean tuple uses \u2A38 in operator slots");
  assert.equal(getOperatorSlotFace("op_eulog"), "\u2225", "eulog uses \u2225 in operator slots");
  assert.equal(getOperatorSlotFace("op_residual"), "\u{1F79B}", "residual uses \u{1F79B} in operator slots");
  assert.equal(getOperatorSlotFace("op_log_tuple"), "\u29B7", "log tuple uses \u29B7 in operator slots");
  assert.equal(getOperatorSlotFace("op_whole_steps"), "\u2669\u2191", "whole-steps uses \u2669\u2191 in operator slots");
  assert.equal(getOperatorSlotFace("op_interval"), "\u22EE", "interval uses \u22EE in operator slots");
  assert.equal(getOperatorSlotFace("unary_reciprocal"), "\u00B9\u2044\u2099", "reciprocal uses \u00B9\u2044\u2099 in operator slots");
};



