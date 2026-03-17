import assert from "node:assert/strict";
import { LONG_TRACE_FIXTURES } from "./contracts/fixtures/actionSequences.js";

export const runContractsParityLongTracesTests = (): void => {
  assert.ok(LONG_TRACE_FIXTURES.length > 0, "parity long-trace fixtures remain registered");
};
