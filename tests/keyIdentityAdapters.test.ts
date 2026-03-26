import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { getButtonFace, getOperatorSlotFace, resolveKeyId } from "../src/domain/keyPresentation.js";

export const runKeyIdentityAdaptersTests = (): void => {
  assert.equal(resolveKeyId("op_add"), "op_add", "resolver keeps canonical key id");
  assert.equal(getButtonFace("op_div"), "\u00F7", "button-face lookup accepts canonical key ids");
  assert.equal(getOperatorSlotFace("op_mod"), "\u25C7", "operator-slot lookup accepts canonical key ids");
};



