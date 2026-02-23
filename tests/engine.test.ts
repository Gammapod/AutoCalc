import assert from "node:assert/strict";
import { executeSlots } from "../src/domain/engine.js";

export const runEngineTests = (): void => {
  assert.equal(executeSlots(42n, []), 42n, "identity behavior when no slots exist");

  const result = executeSlots(10n, [{ operator: "+", operand: 5n }]);
  assert.equal(result, 15n, "single plus slot executes");
};
