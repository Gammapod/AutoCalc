import assert from "node:assert/strict";
import { resolveCalculatorKeysLocked } from "../src/ui/modules/calculatorStorageCore.js";

export const runUiModuleCalculatorStorageV2Tests = (): void => {
  assert.equal(
    resolveCalculatorKeysLocked(false),
    false,
    "desktop keeps keypad buttons interactive",
  );
  assert.equal(
    resolveCalculatorKeysLocked(false),
    false,
    "mobile keeps keypad buttons interactive",
  );
  assert.equal(
    resolveCalculatorKeysLocked(false),
    false,
    "calculator mode keeps keypad buttons available",
  );
  assert.equal(
    resolveCalculatorKeysLocked(true),
    true,
    "input blocking overrides shell-specific keypad behavior",
  );
};
