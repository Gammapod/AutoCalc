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
  assert.deepEqual(
    baselineLayout.map((cell) => (cell.kind === "key" ? cell.key : null)),
    ["++"],
    "default keypad starts as 1x1 with ++ in bottom-right slot",
  );
  assert.ok(
    baseline.ui.storageLayout.some((cell) => cell?.key === "1"),
    "default storage includes 1 key",
  );
  assert.ok(
    baseline.ui.storageLayout.some((cell) => cell?.key === "+"),
    "default storage includes + key",
  );

  const lastKeypadIndex = baselineLayout.length - 1;

  const moved = reducer(baseline, { type: "MOVE_KEY_SLOT", fromIndex: 0, toIndex: lastKeypadIndex });
  assert.equal(moved.ui.keyLayout.length, baselineLayout.length, "move preserves layout length");
  assert.deepEqual(moved.ui.keyLayout, baseline.ui.keyLayout, "legacy move on 1x1 keypad is a no-op");

  const swapped = reducer(baseline, { type: "SWAP_KEY_SLOTS", firstIndex: 0, secondIndex: 1 });
  assert.equal(swapped, baseline, "legacy swap with invalid index returns original state");

  const invalidMove = reducer(baseline, { type: "MOVE_KEY_SLOT", fromIndex: -1, toIndex: 2 });
  assert.equal(invalidMove, baseline, "invalid move index returns original state reference");

  const invalidSwap = reducer(baseline, { type: "SWAP_KEY_SLOTS", firstIndex: 2, secondIndex: 99 });
  assert.equal(invalidSwap, baseline, "invalid swap index returns original state reference");

  const noOpSwap = reducer(baseline, { type: "SWAP_KEY_SLOTS", firstIndex: lastKeypadIndex, secondIndex: lastKeypadIndex });
  assert.equal(noOpSwap, baseline, "same-index swap is a no-op");

  const baselineWithSpace = reducer(baseline, { type: "SET_KEYPAD_DIMENSIONS", columns: 4, rows: 1 });
  const emptyKeypadIndex = baselineWithSpace.ui.keyLayout.findIndex((cell) => cell.kind === "placeholder");
  assert.equal(emptyKeypadIndex, 0, "column growth adds new column on the left");

  const toKeypadMove = reducer(baselineWithSpace, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "storage",
    fromIndex: 0,
    toSurface: "keypad",
    toIndex: emptyKeypadIndex,
  });
  assert.equal(toKeypadMove.ui.keyLayout[emptyKeypadIndex]?.kind, "key", "storage key can move onto empty keypad slot");
  assert.equal(toKeypadMove.ui.keyLayout[emptyKeypadIndex]?.key, "CE", "moved storage key lands in keypad destination slot");
  assert.equal(toKeypadMove.ui.storageLayout[0], null, "moving from storage clears source storage slot");

  const backToStorage = reducer(toKeypadMove, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad",
    fromIndex: emptyKeypadIndex,
    toSurface: "storage",
    toIndex: 0,
  });
  assert.equal(
    backToStorage.ui.keyLayout[emptyKeypadIndex]?.kind,
    "placeholder",
    "moving keypad key to storage clears keypad source",
  );
  assert.equal(backToStorage.ui.storageLayout[0]?.key, "CE", "moving keypad key to storage fills storage destination");

  const cUnlockedWithRoll = {
    ...baselineWithSpace,
    calculator: {
      ...baselineWithSpace.calculator,
      total: { num: 7n, den: 1n },
      roll: [{ num: 7n, den: 1n }],
    },
    unlocks: {
      ...baselineWithSpace.unlocks,
      utilities: {
        ...baselineWithSpace.unlocks.utilities,
        C: true,
      },
    },
  };
  const sameSurfaceMoveNoC = reducer(cUnlockedWithRoll, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad",
    fromIndex: 1,
    toSurface: "keypad",
    toIndex: emptyKeypadIndex,
  });
  assert.deepEqual(
    sameSurfaceMoveNoC.calculator.total,
    cUnlockedWithRoll.calculator.total,
    "keypad-only move does not trigger C",
  );
  assert.equal(sameSurfaceMoveNoC.calculator.roll.length, 1, "keypad-only move preserves roll");

  const acrossSurfaceMoveTriggersC = reducer(cUnlockedWithRoll, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "storage",
    fromIndex: 0,
    toSurface: "keypad",
    toIndex: emptyKeypadIndex,
  });
  assert.deepEqual(acrossSurfaceMoveTriggersC.calculator.total, { num: 0n, den: 1n }, "cross-surface move triggers C reset");
  assert.equal(acrossSurfaceMoveTriggersC.calculator.roll.length, 0, "cross-surface move clears roll via C");

  const swapWithinKeypad = reducer(toKeypadMove, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "keypad",
    fromIndex: emptyKeypadIndex,
    toSurface: "keypad",
    toIndex: baselineWithSpace.ui.keyLayout.length - 1,
  });
  assert.equal(swapWithinKeypad.ui.keyLayout[emptyKeypadIndex]?.kind, "key", "swap preserves key occupancy in source slot");
  assert.equal(
    swapWithinKeypad.ui.keyLayout[baselineWithSpace.ui.keyLayout.length - 1]?.kind,
    "key",
    "swap preserves key occupancy in destination slot",
  );

  const storagePrepared = reducer(baselineWithSpace, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "storage",
    fromIndex: 0,
    toSurface: "keypad",
    toIndex: emptyKeypadIndex,
  });
  const swapAcross = reducer(storagePrepared, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "keypad",
    fromIndex: emptyKeypadIndex,
    toSurface: "storage",
    toIndex: 1,
  });
  assert.equal(swapAcross.ui.storageLayout[1]?.key, "CE", "swap across surfaces places keypad key into storage");
  assert.equal(
    swapAcross.ui.keyLayout[emptyKeypadIndex]?.kind,
    "key",
    "swap across surfaces keeps keypad destination occupied",
  );
  assert.equal(swapAcross.ui.keyLayout[emptyKeypadIndex]?.key, "C", "swap across surfaces places storage key into keypad");

  const bottomRightIndex = baselineWithSpace.ui.keyLayout.length - 1;
  const firstStorageEmptyIndex = baselineWithSpace.ui.storageLayout.findIndex((cell) => cell === null);
  const firstStorageExecutionIndex = baselineWithSpace.ui.storageLayout.findIndex((cell) => cell?.key === "=");
  assert.ok(firstStorageEmptyIndex >= 0, "baseline storage includes at least one empty slot");
  assert.ok(firstStorageExecutionIndex >= 0, "baseline storage includes execution key in storage");

  const validBottomRightMoveOutToStorage = reducer(baselineWithSpace, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad",
    fromIndex: bottomRightIndex,
    toSurface: "storage",
    toIndex: firstStorageEmptyIndex,
  });
  assert.equal(
    validBottomRightMoveOutToStorage.ui.keyLayout[bottomRightIndex]?.kind,
    "placeholder",
    "moving execution key out of bottom-right slot into storage is allowed",
  );
  assert.equal(
    validBottomRightMoveOutToStorage.ui.storageLayout[firstStorageEmptyIndex]?.key,
    "++",
    "moving execution key out of bottom-right slot places it into storage",
  );

  const invalidBottomRightMove = reducer(baselineWithSpace, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "storage",
    fromIndex: 0,
    toSurface: "keypad",
    toIndex: bottomRightIndex,
  });
  assert.equal(
    invalidBottomRightMove,
    baselineWithSpace,
    "moving non-execution key into bottom-right slot is rejected",
  );

  const validBottomRightSwapWithExecution = reducer(baselineWithSpace, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "storage",
    fromIndex: firstStorageExecutionIndex,
    toSurface: "keypad",
    toIndex: bottomRightIndex,
  });
  assert.equal(
    validBottomRightSwapWithExecution.ui.keyLayout[bottomRightIndex]?.kind === "key"
      ? validBottomRightSwapWithExecution.ui.keyLayout[bottomRightIndex].key
      : null,
    "=",
    "swapping execution key into bottom-right slot is allowed even when storage receives an execution key",
  );

  const invalidExecutionToNonBottomRightSwap = reducer(toKeypadMove, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "storage",
    fromIndex: firstStorageExecutionIndex,
    toSurface: "keypad",
    toIndex: emptyKeypadIndex,
  });
  assert.equal(
    invalidExecutionToNonBottomRightSwap,
    toKeypadMove,
    "swapping execution key into non-bottom-right slot is rejected",
  );

  const invalidBottomRightSwap = reducer(baselineWithSpace, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "keypad",
    fromIndex: 1,
    toSurface: "keypad",
    toIndex: bottomRightIndex,
  });
  assert.equal(
    invalidBottomRightSwap,
    baselineWithSpace,
    "swapping a non-execution key into bottom-right slot is rejected",
  );

  const acrossSurfaceSwapTriggersC = reducer(cUnlockedWithRoll, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "keypad",
    fromIndex: bottomRightIndex,
    toSurface: "storage",
    toIndex: firstStorageExecutionIndex,
  });
  assert.deepEqual(acrossSurfaceSwapTriggersC.calculator.total, { num: 0n, den: 1n }, "cross-surface swap triggers C reset");
  assert.equal(acrossSurfaceSwapTriggersC.calculator.roll.length, 0, "cross-surface swap clears roll via C");

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

  const movedForInvariant = reducer(baselineWithSpace, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "storage",
    fromIndex: 0,
    toSurface: "keypad",
    toIndex: emptyKeypadIndex,
  });
  const baselineSnapshot = keySnapshot(baselineWithSpace);
  const movedSnapshot = keySnapshot(movedForInvariant);
  for (let index = 0; index < baselineSnapshot.keypad.length; index += 1) {
    if (index === emptyKeypadIndex) {
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
    toIndex: emptyKeypadIndex,
  });
  const beforeSwapSnapshot = keySnapshot(movedForInvariant);
  const afterSwapSnapshot = keySnapshot(swappedForInvariant);
  for (let index = 0; index < beforeSwapSnapshot.keypad.length; index += 1) {
    if (index === emptyKeypadIndex) {
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
  assert.ok(resizedBigger.ui.keyLayout.slice(0, 19).every((cell) => cell.kind === "placeholder"), "top/left growth is placeholder");
  assert.equal(resizedBigger.ui.keyLayout[19]?.kind === "key" ? resizedBigger.ui.keyLayout[19].key : null, "++", "++ stays bottom-right");

  const resizedSmaller = reducer(resizedBigger, { type: "SET_KEYPAD_DIMENSIONS", columns: 3, rows: 2 });
  assert.equal(resizedSmaller.ui.keyLayout.length, 6, "resizing down truncates layout tail");
  assert.equal(resizedSmaller.ui.keypadColumns, 3, "resizing down updates columns");
  assert.equal(resizedSmaller.ui.keypadRows, 2, "resizing down updates rows");
  assert.ok(resizedSmaller.ui.keyLayout.slice(0, 5).every((cell) => cell.kind === "placeholder"), "shrink drops top/left first");
  assert.equal(resizedSmaller.ui.keyLayout[5]?.kind === "key" ? resizedSmaller.ui.keyLayout[5].key : null, "++", "++ remains bottom-right anchored after shrink");

  const clampedResize = reducer(baseline, { type: "SET_KEYPAD_DIMENSIONS", columns: 99, rows: -4 });
  assert.equal(clampedResize.ui.keypadColumns, 8, "columns clamp to max bound");
  assert.equal(clampedResize.ui.keypadRows, 1, "rows clamp to min bound");
  assert.ok(clampedResize.ui.keyLayout.slice(0, 7).every((cell) => cell.kind === "placeholder"), "column growth adds new columns on the left");
  assert.equal(clampedResize.ui.keyLayout[7]?.kind === "key" ? clampedResize.ui.keyLayout[7].key : null, "++", "++ stays right anchored");

  const upgradedRow = reducer(baseline, { type: "UPGRADE_KEYPAD_ROW" });
  assert.equal(upgradedRow.ui.keypadRows, 2, "row upgrade increases rows by one");
  assert.equal(upgradedRow.ui.keyLayout.length, 2, "row upgrade creates a second keypad slot");
  assert.equal(upgradedRow.ui.keyLayout[0]?.kind, "placeholder", "row upgrade pushes keys down");
  assert.equal(upgradedRow.ui.keyLayout[1]?.kind === "key" ? upgradedRow.ui.keyLayout[1].key : null, "++", "row upgrade preserves ++ anchor");

  const upgradedColumn = reducer(baseline, { type: "UPGRADE_KEYPAD_COLUMN" });
  assert.equal(upgradedColumn.ui.keypadColumns, 2, "column upgrade increases columns by one");
  assert.equal(upgradedColumn.ui.keyLayout.length, 2, "column upgrade creates a second keypad slot");
  assert.equal(upgradedColumn.ui.keyLayout[0]?.kind, "placeholder", "column upgrade pushes keys right");
  assert.equal(upgradedColumn.ui.keyLayout[1]?.kind === "key" ? upgradedColumn.ui.keyLayout[1].key : null, "++", "column upgrade preserves ++ anchor");

  const atMaxRows = reducer(baseline, { type: "SET_KEYPAD_DIMENSIONS", columns: baseline.ui.keypadColumns, rows: 8 });
  const noOpUpgradeRow = reducer(atMaxRows, { type: "UPGRADE_KEYPAD_ROW" });
  assert.equal(noOpUpgradeRow, atMaxRows, "row upgrade no-ops at max bound");
  const atMaxColumns = reducer(baseline, { type: "SET_KEYPAD_DIMENSIONS", columns: 8, rows: baseline.ui.keypadRows });
  const noOpUpgradeColumn = reducer(atMaxColumns, { type: "UPGRADE_KEYPAD_COLUMN" });
  assert.equal(noOpUpgradeColumn, atMaxColumns, "column upgrade no-ops at max bound");

  const noopResize = reducer(baseline, {
    type: "SET_KEYPAD_DIMENSIONS",
    columns: baseline.ui.keypadColumns,
    rows: baseline.ui.keypadRows,
  });
  assert.equal(noopResize, baseline, "unchanged dimensions are a no-op");
};
