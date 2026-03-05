import assert from "node:assert/strict";
import { resolveCalculatorKeysLocked } from "../src_v2/ui/modules/calculatorStorageLegacyParity.js";

export const runUiModuleCalculatorStorageV2Tests = (): void => {
  assert.equal(
    resolveCalculatorKeysLocked("modify", false, "desktop"),
    false,
    "desktop modify mode keeps keypad buttons interactive for drag operations",
  );
  assert.equal(
    resolveCalculatorKeysLocked("modify", false, "mobile"),
    true,
    "mobile modify mode keeps keypad buttons locked",
  );
  assert.equal(
    resolveCalculatorKeysLocked("calculator", false, "desktop"),
    false,
    "calculator mode keeps keypad buttons available",
  );
  assert.equal(
    resolveCalculatorKeysLocked("calculator", true, "desktop"),
    true,
    "input blocking overrides shell-specific keypad behavior",
  );
};
