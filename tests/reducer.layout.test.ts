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
  assert.ok(
    baselineLayout.some((cell) => cell.kind === "key" && cell.key === "*"),
    "default layout includes mul key",
  );
  assert.equal(
    baselineLayout.some((cell) => cell.kind === "placeholder" && cell.area === "mul"),
    false,
    "default layout no longer includes mul placeholder",
  );

  const moved = reducer(baseline, { type: "MOVE_KEY_SLOT", fromIndex: 0, toIndex: 3 });
  assert.equal(moved.ui.keyLayout.length, baselineLayout.length, "move preserves layout length");
  assert.deepEqual(
    moved.ui.keyLayout.slice(0, 4).map((cell) => (cell.kind === "key" ? cell.key : cell.area)),
    ["empty", "CE", "C", "graph"],
    "move shifts intermediate entries and reinserts moved entry",
  );

  const swapped = reducer(baseline, { type: "SWAP_KEY_SLOTS", firstIndex: 0, secondIndex: 1 });
  assert.deepEqual(
    swapped.ui.keyLayout.slice(0, 2).map((cell) => (cell.kind === "key" ? cell.key : cell.area)),
    ["empty", "graph"],
    "swap exchanges the two target slots",
  );

  const invalidMove = reducer(baseline, { type: "MOVE_KEY_SLOT", fromIndex: -1, toIndex: 2 });
  assert.equal(invalidMove, baseline, "invalid move index returns original state reference");

  const invalidSwap = reducer(baseline, { type: "SWAP_KEY_SLOTS", firstIndex: 2, secondIndex: 99 });
  assert.equal(invalidSwap, baseline, "invalid swap index returns original state reference");

  const noOpSwap = reducer(baseline, { type: "SWAP_KEY_SLOTS", firstIndex: 4, secondIndex: 4 });
  assert.equal(noOpSwap, baseline, "same-index swap is a no-op");

  const toStorageMove = reducer(baseline, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad",
    fromIndex: 2,
    toSurface: "storage",
    toIndex: 0,
  });
  assert.equal(
    toStorageMove.ui.keyLayout[2]?.kind,
    "placeholder",
    "moving keypad key to storage clears source keypad slot",
  );
  assert.equal(
    toStorageMove.ui.storageLayout[0]?.key,
    "CE",
    "moving keypad key to empty storage slot stores the key",
  );

  const backToKeypad = reducer(toStorageMove, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "storage",
    fromIndex: 0,
    toSurface: "keypad",
    toIndex: 0,
  });
  assert.equal(backToKeypad.ui.keyLayout[0]?.kind, "key", "storage key can move onto empty keypad slot");
  assert.equal(backToKeypad.ui.keyLayout[0]?.key, "CE", "moved storage key lands in keypad destination slot");
  assert.equal(backToKeypad.ui.storageLayout[0], null, "moving from storage clears source storage slot");

  const swapWithinKeypad = reducer(backToKeypad, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "keypad",
    fromIndex: 0,
    toSurface: "keypad",
    toIndex: 3,
  });
  assert.equal(swapWithinKeypad.ui.keyLayout[0]?.kind, "key", "swap preserves key occupancy in source slot");
  assert.equal(swapWithinKeypad.ui.keyLayout[3]?.kind, "key", "swap preserves key occupancy in destination slot");

  const storagePrepared = reducer(baseline, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad",
    fromIndex: 2,
    toSurface: "storage",
    toIndex: 0,
  });
  const swapAcross = reducer(storagePrepared, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "keypad",
    fromIndex: 3,
    toSurface: "storage",
    toIndex: 0,
  });
  assert.equal(swapAcross.ui.storageLayout[0]?.key, "C", "swap across surfaces places keypad key into storage");
  assert.equal(swapAcross.ui.keyLayout[3]?.kind, "key", "swap across surfaces keeps keypad destination occupied");
  assert.equal(swapAcross.ui.keyLayout[3]?.key, "CE", "swap across surfaces places storage key into keypad");

  const filledStorage = {
    ...baseline,
    ui: {
      ...baseline.ui,
      storageLayout: Array.from({ length: 8 }, () => ({ kind: "key" as const, key: "1" as const })),
    },
  };
  const expandStorage = reducer(filledStorage, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "keypad",
    fromIndex: 2,
    toSurface: "storage",
    toIndex: 0,
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

  const wideBlockedOffSide = reducer(baseline, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad",
    fromIndex: 20,
    toSurface: "storage",
    toIndex: 7,
  });
  assert.equal(wideBlockedOffSide, baseline, "wide key move is blocked when span would exceed row bounds");

  const withOccupiedSpan = {
    ...baseline,
    ui: {
      ...baseline.ui,
      storageLayout: [
        { kind: "key" as const, key: "1" as const },
        { kind: "key" as const, key: "2" as const },
        ...baseline.ui.storageLayout.slice(2),
      ],
    },
  };
  const wideBlockedByFilledNeighbor = reducer(withOccupiedSpan, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad",
    fromIndex: 20,
    toSurface: "storage",
    toIndex: 0,
  });
  assert.equal(wideBlockedByFilledNeighbor, withOccupiedSpan, "wide key move is blocked when extra span cell is occupied");

  const tallBlockedOffBottom = reducer(baseline, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad",
    fromIndex: 19,
    toSurface: "storage",
    toIndex: 4,
  });
  assert.equal(tallBlockedOffBottom, baseline, "tall key move is blocked when span would exceed bottom bounds");

  const oneFreeSlotLayout = {
    ...baseline,
    ui: {
      ...baseline.ui,
      keyLayout: baseline.ui.keyLayout.map((cell, index) =>
        index === 1 ? ({ kind: "key", key: "1" } as const) : cell,
      ),
    },
  };
  const wideNeedsTwoFreeSlotsMove = reducer(oneFreeSlotLayout, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad",
    fromIndex: 20,
    toSurface: "storage",
    toIndex: 0,
  });
  assert.equal(
    wideNeedsTwoFreeSlotsMove,
    oneFreeSlotLayout,
    "wide key move is blocked when keypad has fewer than two free slots",
  );

  const oneFreeSlotWithStorageKey = {
    ...oneFreeSlotLayout,
    ui: {
      ...oneFreeSlotLayout.ui,
      storageLayout: [{ kind: "key" as const, key: "2" as const }, ...oneFreeSlotLayout.ui.storageLayout.slice(1)],
    },
  };
  const wideNeedsTwoFreeSlotsSwap = reducer(oneFreeSlotWithStorageKey, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "keypad",
    fromIndex: 20,
    toSurface: "storage",
    toIndex: 0,
  });
  assert.equal(
    wideNeedsTwoFreeSlotsSwap,
    oneFreeSlotWithStorageKey,
    "wide key swap is blocked when keypad has fewer than two free slots",
  );

  const movedForInvariant = reducer(baseline, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad",
    fromIndex: 2,
    toSurface: "storage",
    toIndex: 0,
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
  for (let index = 1; index < baselineSnapshot.storage.length; index += 1) {
    assert.equal(
      movedSnapshot.storage[index],
      baselineSnapshot.storage[index],
      `only moved destination changes storage position (index ${index})`,
    );
  }

  const swappedForInvariant = reducer(movedForInvariant, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "storage",
    fromIndex: 0,
    toSurface: "keypad",
    toIndex: 3,
  });
  const beforeSwapSnapshot = keySnapshot(movedForInvariant);
  const afterSwapSnapshot = keySnapshot(swappedForInvariant);
  for (let index = 0; index < beforeSwapSnapshot.keypad.length; index += 1) {
    if (index === 3) {
      continue;
    }
    assert.equal(
      afterSwapSnapshot.keypad[index],
      beforeSwapSnapshot.keypad[index],
      `swap changes only selected keypad slot (index ${index})`,
    );
  }
  for (let index = 0; index < beforeSwapSnapshot.storage.length; index += 1) {
    if (index === 0) {
      continue;
    }
    assert.equal(
      afterSwapSnapshot.storage[index],
      beforeSwapSnapshot.storage[index],
      `swap changes only selected storage slot (index ${index})`,
    );
  }
};
