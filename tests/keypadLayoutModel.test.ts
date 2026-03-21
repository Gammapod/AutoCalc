import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import {
  fromKeyLayoutArray,
  generateSlotId,
  resizeAnchored,
  toCoordFromIndex,
  toIndexFromCoord,
  toKeyLayoutArray,
} from "../src/domain/keypadLayoutModel.js";
import type { LayoutCell } from "../src/domain/types.js";
import { k } from "./support/keyCompat.js";

const empty = (): LayoutCell => ({ kind: "placeholder", area: "empty" });

export const runKeypadLayoutModelTests = (): void => {
  const columns = 5;
  const rows = 4;
  for (let index = 0; index < columns * rows; index += 1) {
    const coord = toCoordFromIndex(index, columns, rows);
    const roundTrip = toIndexFromCoord(coord, columns, rows);
    assert.equal(roundTrip, index, `index<->coord roundtrip holds (${index})`);
  }

  assert.equal(generateSlotId(1, 1), "kp:r1:c1", "R1C1 slot id is deterministic");

  const base: LayoutCell[] = [
    { kind: "key", key: k("digit_1") },
    { kind: "key", key: k("op_add") },
    { kind: "key", key: k("exec_equals") },
  ];
  const baseRecords = fromKeyLayoutArray(base, 3, 1);
  const grown = resizeAnchored(baseRecords, 4, 2);
  const grownLayout = toKeyLayoutArray(grown, 4, 2);
  assert.equal(grownLayout[0]?.kind, "placeholder", "top-left grown slot is new placeholder");
  assert.equal(grownLayout[5]?.kind === "key" ? grownLayout[5].key : null, k("digit_1"), "existing key remains BR anchored");
  assert.equal(grownLayout[7]?.kind === "key" ? grownLayout[7].key : null, k("exec_equals"), "equals remains bottom-right");

  const shrunk = resizeAnchored(grown, 3, 1);
  const shrunkLayout = toKeyLayoutArray(shrunk, 3, 1);
  assert.deepEqual(
    shrunkLayout.map((cell) => (cell.kind === "key" ? cell.key : null)),
    [k("digit_1"), k("op_add"), k("exec_equals")],
    "shrinking with BR anchor preserves bottom-right content",
  );

  const preservedIds = new Set(baseRecords.map((record) => record.id));
  for (const record of shrunk) {
    assert.equal(preservedIds.has(record.id), true, `existing slot id preserved: ${record.id}`);
  }

  const newIds = grown.map((record) => record.id).filter((id) => !preservedIds.has(id));
  assert.ok(newIds.length > 0, "growing introduces new slot ids");
  assert.ok(newIds.every((id) => id.startsWith("kp:r")), "new ids follow keypad id format");

  assert.equal(empty().kind, "placeholder", "test helper remains placeholder");
};


