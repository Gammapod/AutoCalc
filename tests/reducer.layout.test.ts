import assert from "node:assert/strict";
import { reducer } from "../src/domain/reducer.js";
import { initialState } from "../src/domain/state.js";

export const runReducerLayoutTests = (): void => {
  const keySnapshot = (state: ReturnType<typeof initialState>): { keypad: Array<string | null>; storage: Array<string | null> } => ({
    keypad: state.ui.keyLayout.map((cell) => (cell.kind === "key" ? cell.key : null)),
    storage: state.ui.storageLayout.map((cell) => (cell ? cell.key : null)),
  });

  const baseline = initialState();
  const baselineLayout = baseline.ui.keyLayout;
  assert.equal(
    baselineLayout.some((cell) => cell.kind === "key"),
    false,
    "default keypad starts empty and all keys begin in storage",
  );
  assert.ok(
    baseline.ui.storageLayout.some((cell) => cell?.key === "*"),
    "default storage includes mul key",
  );

  const moved = reducer(baseline, { type: "MOVE_KEY_SLOT", fromIndex: 0, toIndex: 3 });
  assert.equal(moved.ui.keyLayout.length, baselineLayout.length, "move preserves layout length");
  assert.deepEqual(
    moved.ui.keyLayout.slice(0, 4).map((cell) => (cell.kind === "key" ? cell.key : cell.area)),
    ["empty", "empty", "empty", "empty"],
    "legacy move shifts placeholders and reinserts moved placeholder in empty keypad",
  );

  const swapped = reducer(baseline, { type: "SWAP_KEY_SLOTS", firstIndex: 0, secondIndex: 1 });
  assert.deepEqual(
    swapped.ui.keyLayout.slice(0, 2).map((cell) => (cell.kind === "key" ? cell.key : cell.area)),
    ["empty", "empty"],
    "legacy swap exchanges placeholder slots",
  );

  const invalidMove = reducer(baseline, { type: "MOVE_KEY_SLOT", fromIndex: -1, toIndex: 2 });
  assert.equal(invalidMove, baseline, "invalid move index returns original state reference");

  const invalidSwap = reducer(baseline, { type: "SWAP_KEY_SLOTS", firstIndex: 2, secondIndex: 99 });
  assert.equal(invalidSwap, baseline, "invalid swap index returns original state reference");

  const noOpSwap = reducer(baseline, { type: "SWAP_KEY_SLOTS", firstIndex: 4, secondIndex: 4 });
  assert.equal(noOpSwap, baseline, "same-index swap is a no-op");

  const toKeypadMove = reducer(baseline, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "storage",
    fromIndex: 0,
    toSurface: "keypad",
    toIndex: 2,
  });
  assert.equal(toKeypadMove.ui.keyLayout[2]?.kind, "key", "storage key can move onto empty keypad slot");
  assert.equal(toKeypadMove.ui.keyLayout[2]?.key, "CE", "moved storage key lands in keypad destination slot");
  assert.equal(toKeypadMove.ui.storageLayout[0], null, "moving from storage clears source storage slot");

  const backToStorage = reducer(toKeypadMove, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad",
    fromIndex: 2,
    toSurface: "storage",
    toIndex: 0,
  });
  assert.equal(backToStorage.ui.keyLayout[2]?.kind, "placeholder", "moving keypad key to storage clears keypad source");
  assert.equal(backToStorage.ui.storageLayout[0]?.key, "CE", "moving keypad key to storage fills storage destination");

  const keypadPrepared = reducer(
    reducer(baseline, {
      type: "MOVE_LAYOUT_CELL",
      fromSurface: "storage",
      fromIndex: 0,
      toSurface: "keypad",
      toIndex: 2,
    }),
    {
      type: "MOVE_LAYOUT_CELL",
      fromSurface: "storage",
      fromIndex: 1,
      toSurface: "keypad",
      toIndex: 3,
    },
  );
  const swapWithinKeypad = reducer(keypadPrepared, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "keypad",
    fromIndex: 2,
    toSurface: "keypad",
    toIndex: 3,
  });
  assert.equal(swapWithinKeypad.ui.keyLayout[2]?.kind, "key", "swap preserves key occupancy in source slot");
  assert.equal(swapWithinKeypad.ui.keyLayout[3]?.kind, "key", "swap preserves key occupancy in destination slot");

  const storagePrepared = reducer(baseline, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "storage",
    fromIndex: 0,
    toSurface: "keypad",
    toIndex: 3,
  });
  const swapAcross = reducer(storagePrepared, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "keypad",
    fromIndex: 3,
    toSurface: "storage",
    toIndex: 1,
  });
  assert.equal(swapAcross.ui.storageLayout[1]?.key, "CE", "swap across surfaces places keypad key into storage");
  assert.equal(swapAcross.ui.keyLayout[3]?.kind, "key", "swap across surfaces keeps keypad destination occupied");
  assert.equal(swapAcross.ui.keyLayout[3]?.key, "C", "swap across surfaces places storage key into keypad");

  const filledStorage = {
    ...baseline,
    ui: {
      ...baseline.ui,
      storageLayout: Array.from({ length: 8 }, () => ({ kind: "key" as const, key: "1" as const })),
    },
  };
  const expandStorage = reducer(filledStorage, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "storage",
    fromIndex: 0,
    toSurface: "storage",
    toIndex: 1,
  });
  assert.equal(expandStorage.ui.storageLayout.length, 16, "storage auto-expands by one row when it becomes full");

  const invalidSurfaceMove = reducer(baseline, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "storage",
    fromIndex: 100,
    toSurface: "keypad",
    toIndex: 0,
  });
  assert.equal(invalidSurfaceMove, baseline, "invalid surface indices are rejected");

  const movedForInvariant = reducer(baseline, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "storage",
    fromIndex: 0,
    toSurface: "keypad",
    toIndex: 2,
  });
  const baselineSnapshot = keySnapshot(baseline);
  const movedSnapshot = keySnapshot(movedForInvariant);
  for (let index = 0; index < baselineSnapshot.keypad.length; index += 1) {
    if (index === 2) {
      continue;
    }
    assert.equal(
      movedSnapshot.keypad[index],
      baselineSnapshot.keypad[index],
      `only moved source key changes keypad position (index ${index})`,
    );
  }
  for (let index = 0; index < baselineSnapshot.storage.length; index += 1) {
    if (index === 0) {
      continue;
    }
    assert.equal(
      movedSnapshot.storage[index],
      baselineSnapshot.storage[index],
      `only moved destination changes storage position (index ${index})`,
    );
  }

  const swappedForInvariant = reducer(movedForInvariant, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "storage",
    fromIndex: 1,
    toSurface: "keypad",
    toIndex: 2,
  });
  const beforeSwapSnapshot = keySnapshot(movedForInvariant);
  const afterSwapSnapshot = keySnapshot(swappedForInvariant);
  for (let index = 0; index < beforeSwapSnapshot.keypad.length; index += 1) {
    if (index === 2) {
      continue;
    }
    assert.equal(
      afterSwapSnapshot.keypad[index],
      beforeSwapSnapshot.keypad[index],
      `swap changes only selected keypad slot (index ${index})`,
    );
  }
  for (let index = 0; index < beforeSwapSnapshot.storage.length; index += 1) {
    if (index === 1) {
      continue;
    }
    assert.equal(
      afterSwapSnapshot.storage[index],
      beforeSwapSnapshot.storage[index],
      `swap changes only selected storage slot (index ${index})`,
    );
  }

  const resizedBigger = reducer(baseline, { type: "SET_KEYPAD_DIMENSIONS", columns: 5, rows: 4 });
  assert.equal(resizedBigger.ui.keypadColumns, 5, "set keypad dimensions updates columns");
  assert.equal(resizedBigger.ui.keypadRows, 4, "set keypad dimensions updates rows");
  assert.equal(resizedBigger.ui.keyLayout.length, 20, "resizing up appends placeholder slots");
  assert.ok(
    resizedBigger.ui.keyLayout.slice(12).every((cell) => cell.kind === "placeholder"),
    "resized-up slots are placeholders",
  );

  const resizedSmaller = reducer(resizedBigger, { type: "SET_KEYPAD_DIMENSIONS", columns: 3, rows: 2 });
  assert.equal(resizedSmaller.ui.keyLayout.length, 6, "resizing down truncates layout tail");
  assert.equal(resizedSmaller.ui.keypadColumns, 3, "resizing down updates columns");
  assert.equal(resizedSmaller.ui.keypadRows, 2, "resizing down updates rows");

  const clampedResize = reducer(baseline, { type: "SET_KEYPAD_DIMENSIONS", columns: 99, rows: -4 });
  assert.equal(clampedResize.ui.keypadColumns, 8, "columns clamp to max bound");
  assert.equal(clampedResize.ui.keypadRows, 1, "rows clamp to min bound");

  const noopResize = reducer(baseline, {
    type: "SET_KEYPAD_DIMENSIONS",
    columns: baseline.ui.keypadColumns,
    rows: baseline.ui.keypadRows,
  });
  assert.equal(noopResize, baseline, "unchanged dimensions are a no-op");
};
