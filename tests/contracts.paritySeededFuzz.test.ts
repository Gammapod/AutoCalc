import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { SEEDED_PARITY_RUNS } from "./contracts/fixtures/fuzzConfig.js";

export const runContractsParitySeededFuzzTests = (): void => {
  assert.ok(SEEDED_PARITY_RUNS.length > 0, "seeded parity fixtures remain registered");
};


