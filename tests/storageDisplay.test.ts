import assert from "node:assert/strict";
import { getStorageRowCount } from "../src/ui/render.js";

export const runStorageDisplayTests = (): void => {
  assert.equal(getStorageRowCount(0), 1, "empty storage still reserves one row");
  assert.equal(getStorageRowCount(1), 1, "single button uses one row");
  assert.equal(getStorageRowCount(8), 1, "full first row uses one row");
  assert.equal(getStorageRowCount(9), 2, "ninth button creates second row");
  assert.equal(getStorageRowCount(25), 4, "row count scales with number of buttons");
};
