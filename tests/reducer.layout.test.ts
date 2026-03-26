import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { toIndexFromCoord } from "../src/domain/keypadLayoutModel.js";
import { reducer } from "../src/domain/reducer.js";
import { normalizeRuntimeStateInvariants } from "../src/domain/runtimeStateInvariants.js";
import { initialState } from "../src/domain/state.js";
import { calculatorSeedManifest } from "../src/domain/calculatorSeedManifest.js";
import { legacyInitialState } from "./support/legacyState.js";
import type { GameState } from "../src/domain/types.js";

const rv = (num: bigint, den: bigint = 1n): { num: bigint; den: bigint } => ({ num, den });
const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue(rv(num, den));

export const runReducerLayoutTests = (): void => {
  const indexAt = (columns: number, rows: number, row: number, col: number): number =>
    toIndexFromCoord({ row, col }, columns, rows);
  const keyOrNull = (cell: ReturnType<typeof initialState>["ui"]["keyLayout"][number] | undefined): string | null =>
    cell?.kind === "key" ? cell.key : null;
  const keySnapshot = (state: ReturnType<typeof initialState>): { keypad: Array<string | null>; storage: Array<string | null> } => ({
    keypad: state.ui.keyLayout.map((cell) => (cell.kind === "key" ? cell.key : null)),
    storage: state.ui.storageLayout.map((cell) => (cell ? cell.key : null)),
  });

  const baseline = normalizeRuntimeStateInvariants(legacyInitialState());
  const baselineLayout = baseline.ui.keyLayout;
  const baselineExpectedLayout = Array.from({ length: baselineLayout.length }, () => null as string | null);
  const fSeed = calculatorSeedManifest.f.placements;
  const coordFor = (key: string): { row: number; col: number } => {
    const found = fSeed.find((placement) => placement.key === key);
    if (!found) {
      throw new Error(`missing f seed placement for ${key}`);
    }
    return { row: found.row, col: found.col };
  };
  const incCoord = coordFor(k("unary_inc"));
  const saveQuitCoord = coordFor(k("system_save_quit_main_menu"));
  const equalsCoord = coordFor(k("exec_equals"));
  const incIndex = toIndexFromCoord(incCoord, baseline.ui.keypadColumns, baseline.ui.keypadRows);
  const saveQuitIndex = toIndexFromCoord(saveQuitCoord, baseline.ui.keypadColumns, baseline.ui.keypadRows);
  const equalsIndex = toIndexFromCoord(equalsCoord, baseline.ui.keypadColumns, baseline.ui.keypadRows);
  baselineExpectedLayout[incIndex] = k("unary_inc");
  baselineExpectedLayout[saveQuitIndex] = k("system_save_quit_main_menu");
  baselineExpectedLayout[equalsIndex] = k("exec_equals");
  assert.deepEqual(
    baselineLayout.map((cell) => (cell.kind === "key" ? cell.key : null)),
    baselineExpectedLayout,
    "default keypad starts with Save&Quit at R3C2, ++ at R1C2, and = at R1C1",
  );
  assert.equal(
    baseline.ui.storageLayout.some((cell) => cell?.key === k("digit_1")),
    false,
    "default storage excludes locked keys",
  );
  assert.equal(
    baseline.ui.storageLayout.some((cell) => cell?.key === k("op_add")),
    false,
    "default storage excludes locked operators",
  );

  const lastKeypadIndex = baselineLayout.length - 1;

  const moved = reducer(baseline, { type: "MOVE_KEY_SLOT", fromIndex: incIndex, toIndex: lastKeypadIndex });
  assert.equal(moved.ui.keyLayout.length, baselineLayout.length, "move preserves layout length");
  assert.notDeepEqual(moved.ui.keyLayout, baseline.ui.keyLayout, "move updates keypad ordering on default keypad");

  const swapped = reducer(baseline, { type: "SWAP_KEY_SLOTS", firstIndex: 0, secondIndex: 99 });
  assert.deepEqual(swapped, baseline, "legacy swap with invalid index leaves state unchanged");

  const invalidMove = reducer(baseline, { type: "MOVE_KEY_SLOT", fromIndex: -1, toIndex: 2 });
  assert.deepEqual(invalidMove, baseline, "invalid move index leaves state unchanged");

  const invalidSwap = reducer(baseline, { type: "SWAP_KEY_SLOTS", firstIndex: 2, secondIndex: 99 });
  assert.deepEqual(invalidSwap, baseline, "invalid swap index leaves state unchanged");

  const noOpSwap = reducer(baseline, { type: "SWAP_KEY_SLOTS", firstIndex: lastKeypadIndex, secondIndex: lastKeypadIndex });
  assert.deepEqual(noOpSwap, baseline, "same-index swap is a no-op");

  const baselineWithSpaceUnlocked: GameState = {
    ...baseline,
    unlocks: {
      ...baseline.unlocks,
      utilities: {
        ...baseline.unlocks.utilities,
        [utility("util_clear_all")]: true,
        [utility("util_undo")]: true,
      },
      execution: {
        ...baseline.unlocks.execution,
        [execution("exec_equals")]: true,
      },
      visualizers: {
        ...baseline.unlocks.visualizers,
        [visualizer("viz_graph")]: true,
        [visualizer("viz_feed")]: true,
      },
    },
  };
  const baselineWithSpace = reducer(baselineWithSpaceUnlocked, { type: "SET_KEYPAD_DIMENSIONS", columns: 4, rows: 1 });
  const emptyKeypadIndex = baselineWithSpace.ui.keyLayout.findIndex((cell) => cell.kind === "placeholder");
  const baselineCStorageIndex = baselineWithSpace.ui.storageLayout.findIndex((cell) => cell?.key === utility("util_clear_all"));
  assert.equal(emptyKeypadIndex, 0, "column growth adds new column on the left");
  assert.ok(baselineCStorageIndex >= 0, "baseline storage includes C key");

  const toKeypadMove = reducer(baselineWithSpace, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "storage",
    fromIndex: baselineCStorageIndex,
    toSurface: "keypad",
    toIndex: emptyKeypadIndex,
  });
  assert.equal(toKeypadMove.ui.keyLayout[emptyKeypadIndex]?.kind, "key", "storage key can move onto empty keypad slot");
  assert.equal(toKeypadMove.ui.keyLayout[emptyKeypadIndex]?.key, utility("util_clear_all"), "moved storage key lands in keypad destination slot");
  assert.equal(toKeypadMove.ui.storageLayout[baselineCStorageIndex], null, "moving from storage clears source storage slot");

  const backToStorage = reducer(toKeypadMove, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad",
    fromIndex: emptyKeypadIndex,
    toSurface: "storage",
    toIndex: baselineCStorageIndex,
  });
  assert.equal(
    backToStorage.ui.keyLayout[emptyKeypadIndex]?.kind,
    "placeholder",
    "moving keypad key to storage clears keypad source",
  );
  assert.equal(
    backToStorage.ui.storageLayout[baselineCStorageIndex]?.key,
    utility("util_clear_all"),
    "moving keypad key to storage fills storage destination",
  );

  const toKeypadMoveViaAliasSurface = reducer(baselineWithSpace, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "storage",
    fromIndex: baselineCStorageIndex,
    toSurface: "keypad_f",
    toIndex: emptyKeypadIndex,
  });
  assert.equal(
    toKeypadMoveViaAliasSurface.ui.keyLayout[emptyKeypadIndex]?.kind,
    "key",
    "single-calculator mode accepts keypad_f alias for move destination",
  );
  assert.equal(
    toKeypadMoveViaAliasSurface.ui.keyLayout[emptyKeypadIndex]?.key,
    utility("util_clear_all"),
    "single-calculator keypad_f alias move places key in destination",
  );
  assert.equal(
    toKeypadMoveViaAliasSurface.ui.storageLayout[baselineCStorageIndex],
    null,
    "single-calculator keypad_f alias move clears storage source",
  );

  const swapWithinAliasSurface = reducer(toKeypadMoveViaAliasSurface, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "keypad_f",
    fromIndex: emptyKeypadIndex,
    toSurface: "keypad_f",
    toIndex: baselineWithSpace.ui.keyLayout.length - 1,
  });
  assert.equal(
    swapWithinAliasSurface.ui.keyLayout[emptyKeypadIndex]?.kind,
    "key",
    "single-calculator mode accepts keypad_f alias for swap source",
  );
  assert.equal(
    swapWithinAliasSurface.ui.keyLayout[baselineWithSpace.ui.keyLayout.length - 1]?.kind,
    "key",
    "single-calculator mode accepts keypad_f alias for swap destination",
  );

  const entryClearState: GameState = {
    ...baselineWithSpace,
    calculator: {
      ...baselineWithSpace.calculator,
      total: r(7n),
      rollEntries: [{ y: r(7n), remainder: rv(1n) }],
      operationSlots: [{ operator: op("op_add"), operand: 3n }],
      draftingSlot: { operator: op("op_sub"), operandInput: "digit_2", isNegative: false },
    },
    unlocks: {
      ...baselineWithSpace.unlocks,
      utilities: {
        ...baselineWithSpace.unlocks.utilities,
        [utility("util_clear_all")]: true,
      },
    },
  };
  const sameSurfaceMoveNoEntryClear = reducer(entryClearState, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad",
    fromIndex: baselineWithSpace.ui.keyLayout.findIndex((cell) => cell.kind === "key" && cell.key === k("unary_inc")),
    toSurface: "keypad",
    toIndex: emptyKeypadIndex,
  });
  assert.deepEqual(
    sameSurfaceMoveNoEntryClear.calculator.total,
    entryClearState.calculator.total,
    "keypad-only move does not trigger entry-clear reset",
  );
  assert.equal(
    sameSurfaceMoveNoEntryClear.calculator.stepProgress.active,
    false,
    "layout move clears active step session state",
  );
  assert.equal(sameSurfaceMoveNoEntryClear.calculator.rollEntries.length, 1, "keypad-only move preserves roll");

  const acrossSurfaceMoveTriggersEntryClear = reducer(entryClearState, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "storage",
    fromIndex: baselineCStorageIndex,
    toSurface: "keypad",
    toIndex: emptyKeypadIndex,
  });
  assert.deepEqual(
    acrossSurfaceMoveTriggersEntryClear.calculator.total,
    r(7n),
    "cross-surface move triggers entry-clear reset and preserves total",
  );
  assert.equal(
    acrossSurfaceMoveTriggersEntryClear.calculator.rollEntries.length <= entryClearState.calculator.rollEntries.length,
    true,
    "cross-surface move does not increase roll length",
  );
  assert.equal(
    acrossSurfaceMoveTriggersEntryClear.calculator.rollEntries.length,
    0,
    "cross-surface move clears euclid remainders via entry-clear reset",
  );
  assert.equal(
    acrossSurfaceMoveTriggersEntryClear.calculator.operationSlots.length,
    0,
    "cross-surface move clears operation slots via entry-clear reset",
  );
  assert.equal(
    acrossSurfaceMoveTriggersEntryClear.calculator.draftingSlot,
    null,
    "cross-surface move clears drafting slot via entry-clear reset",
  );

  const graphStorageIndex = baselineWithSpace.ui.storageLayout.findIndex((cell) => cell?.key === visualizer("viz_graph"));
  assert.ok(graphStorageIndex >= 0, "baseline storage includes GRAPH key");
  const graphMovedToKeypad = reducer(baselineWithSpace, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "storage",
    fromIndex: graphStorageIndex,
    toSurface: "keypad",
    toIndex: emptyKeypadIndex,
  });
  const graphToggledOn = reducer(graphMovedToKeypad, { type: "TOGGLE_VISUALIZER", visualizer: "graph" });
  assert.equal(graphToggledOn.ui.activeVisualizer, "graph", "GRAPH visualizer can be enabled on keypad");
  const graphMoveBackToStorage = reducer(graphToggledOn, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad",
    fromIndex: emptyKeypadIndex,
    toSurface: "storage",
    toIndex: graphStorageIndex,
  });
  assert.equal(
    graphMoveBackToStorage.ui.activeVisualizer,
    "total",
    "moving active GRAPH off keypad resets active visualizer to total",
  );

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
    fromIndex: baselineCStorageIndex,
    toSurface: "keypad",
    toIndex: emptyKeypadIndex,
  });
  const undoStorageIndex = storagePrepared.ui.storageLayout.findIndex((cell) => cell?.key === utility("util_undo"));
  assert.ok(undoStorageIndex >= 0, "storage includes UNDO key for cross-surface swap");
  const swapAcross = reducer(storagePrepared, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "keypad",
    fromIndex: emptyKeypadIndex,
    toSurface: "storage",
    toIndex: undoStorageIndex,
  });
  assert.equal(swapAcross.ui.storageLayout[undoStorageIndex]?.key, utility("util_clear_all"), "swap across surfaces places keypad key into storage");
  assert.equal(
    swapAcross.ui.keyLayout[emptyKeypadIndex]?.kind,
    "key",
    "swap across surfaces keeps keypad destination occupied",
  );
  assert.equal(swapAcross.ui.keyLayout[emptyKeypadIndex]?.key, utility("util_undo"), "swap across surfaces places storage key into keypad");

  const executionKeypadIndex = baselineWithSpace.ui.keyLayout.findIndex(
    (cell) => cell.kind === "key" && cell.key === k("exec_equals"),
  );
  const firstStorageEmptyIndex = baselineWithSpace.ui.storageLayout.findIndex((cell) => cell === null);
  const firstStorageExecutionIndex = baselineWithSpace.ui.storageLayout.findIndex((cell) => cell?.key === k("exec_equals"));
  const firstStorageNonExecutionIndex = baselineWithSpace.ui.storageLayout.findIndex(
    (cell) => !!cell && cell.key !== k("exec_equals"),
  );
  const firstEmptyKeypadIndex = baselineWithSpace.ui.keyLayout.findIndex((cell) => cell.kind === "placeholder");
  assert.ok(executionKeypadIndex >= 0, "baseline keypad includes an execution key");
  assert.ok(firstStorageEmptyIndex >= 0, "baseline storage includes at least one empty slot");
  assert.equal(firstStorageExecutionIndex, -1, "baseline storage does not duplicate keypad execution key");
  assert.ok(firstStorageNonExecutionIndex >= 0, "baseline storage includes a non-execution key");
  assert.ok(firstEmptyKeypadIndex >= 0, "baseline keypad includes an empty slot");

  const lockedExecutionOnKeypad: GameState = {
    ...baselineWithSpace,
    unlocks: {
      ...baselineWithSpace.unlocks,
      execution: {
        ...baselineWithSpace.unlocks.execution,
        [execution("exec_equals")]: false,
      },
    },
  };
  const lockedExecutionMoveWithinKeypad = reducer(lockedExecutionOnKeypad, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad",
    fromIndex: executionKeypadIndex,
    toSurface: "keypad",
    toIndex: firstEmptyKeypadIndex,
  });
  assert.equal(
    lockedExecutionMoveWithinKeypad.ui.keyLayout[firstEmptyKeypadIndex]?.kind === "key"
      ? lockedExecutionMoveWithinKeypad.ui.keyLayout[firstEmptyKeypadIndex].key
      : null,
    k("exec_equals"),
    "locked keypad keys can still move within the same keypad",
  );

  const lockedExecutionMoveOutToStorage = reducer(lockedExecutionOnKeypad, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad",
    fromIndex: executionKeypadIndex,
    toSurface: "storage",
    toIndex: firstStorageEmptyIndex,
  });
  assert.equal(
    lockedExecutionMoveOutToStorage.ui.keyLayout[executionKeypadIndex]?.kind === "key"
      ? lockedExecutionMoveOutToStorage.ui.keyLayout[executionKeypadIndex].key
      : null,
    k("exec_equals"),
    "locked keypad keys cannot move off-calculator into storage",
  );
  assert.notEqual(
    lockedExecutionMoveOutToStorage.ui.storageLayout[firstStorageEmptyIndex]?.key,
    k("exec_equals"),
    "blocked locked move leaves storage destination unchanged",
  );

  const validExecutionMoveOutToStorage = reducer(baselineWithSpace, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad",
    fromIndex: executionKeypadIndex,
    toSurface: "storage",
    toIndex: firstStorageEmptyIndex,
  });
  assert.equal(
    validExecutionMoveOutToStorage.ui.keyLayout[executionKeypadIndex]?.kind,
    "placeholder",
    "unlocked execution key can move off keypad into storage",
  );
  assert.equal(
    validExecutionMoveOutToStorage.ui.storageLayout[firstStorageEmptyIndex]?.key ?? null,
    k("exec_equals"),
    "unlocked execution-key move writes destination storage slot",
  );

  assert.equal(firstEmptyKeypadIndex >= 0, true, "baseline keypad includes an empty slot for movement tests");

  const allowedNonExecutionSwapIntoExecutionSlot = reducer(baselineWithSpace, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "keypad",
    fromIndex: executionKeypadIndex,
    toSurface: "storage",
    toIndex: firstStorageNonExecutionIndex,
  });
  assert.deepEqual(
    allowedNonExecutionSwapIntoExecutionSlot === baselineWithSpace,
    false,
    "swap that moves unlocked execution key off keypad is allowed",
  );
  assert.equal(
    allowedNonExecutionSwapIntoExecutionSlot.ui.storageLayout[firstStorageNonExecutionIndex]?.key ?? null,
    k("exec_equals"),
    "allowed swap places execution key into storage destination",
  );

  if (firstStorageExecutionIndex >= 0) {
    const acrossSurfaceSwapTriggersEntryClear = reducer(entryClearState, {
      type: "SWAP_LAYOUT_CELLS",
      fromSurface: "keypad",
      fromIndex: executionKeypadIndex,
      toSurface: "storage",
      toIndex: firstStorageExecutionIndex,
    });
    assert.deepEqual(
      acrossSurfaceSwapTriggersEntryClear.calculator.total,
      r(7n),
      "cross-surface swap triggers entry-clear reset and preserves total",
    );
    assert.equal(
      acrossSurfaceSwapTriggersEntryClear.calculator.rollEntries.length <= entryClearState.calculator.rollEntries.length,
      true,
      "cross-surface swap does not increase roll length",
    );
    assert.equal(
      acrossSurfaceSwapTriggersEntryClear.calculator.operationSlots.length,
      0,
      "cross-surface swap clears operation slots via entry-clear reset",
    );
    assert.equal(
      acrossSurfaceSwapTriggersEntryClear.calculator.draftingSlot,
      null,
      "cross-surface swap clears drafting slot via entry-clear reset",
    );
  }

  const swapGraphStorageIndex = baselineWithSpace.ui.storageLayout.findIndex((cell) => cell?.key === visualizer("viz_graph"));
  assert.ok(swapGraphStorageIndex >= 0, "baseline storage includes GRAPH key for swap test");
  const graphOnKeypadForSwap = reducer(baselineWithSpace, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "storage",
    fromIndex: swapGraphStorageIndex,
    toSurface: "keypad",
    toIndex: emptyKeypadIndex,
  });
  const graphOnKeypadSwappedFlag = reducer(graphOnKeypadForSwap, { type: "TOGGLE_VISUALIZER", visualizer: "graph" });
  const swapStorageTargetIndex = graphOnKeypadSwappedFlag.ui.storageLayout.findIndex((cell) => cell?.key === utility("util_clear_all"));
  assert.ok(swapStorageTargetIndex >= 0, "storage includes C key for GRAPH swap target");
  const graphSwappedOut = reducer(graphOnKeypadSwappedFlag, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "keypad",
    fromIndex: emptyKeypadIndex,
    toSurface: "storage",
    toIndex: swapStorageTargetIndex,
  });
  assert.equal(
    graphSwappedOut.ui.activeVisualizer,
    "total",
    "swapping active GRAPH off keypad resets active visualizer to total",
  );

  const feedStorageIndex = baselineWithSpace.ui.storageLayout.findIndex((cell) => cell?.key === visualizer("viz_feed"));
  assert.ok(feedStorageIndex >= 0, "baseline storage includes FEED key");
  const feedMovedToKeypad = reducer(baselineWithSpace, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "storage",
    fromIndex: feedStorageIndex,
    toSurface: "keypad",
    toIndex: emptyKeypadIndex,
  });
  const feedToggledOn = reducer(feedMovedToKeypad, { type: "TOGGLE_VISUALIZER", visualizer: "feed" });
  assert.equal(feedToggledOn.ui.activeVisualizer, "feed", "FEED visualizer can be enabled on keypad");
  const feedMoveBackToStorage = reducer(feedToggledOn, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "keypad",
    fromIndex: emptyKeypadIndex,
    toSurface: "storage",
    toIndex: feedStorageIndex,
  });
  assert.equal(
    feedMoveBackToStorage.ui.activeVisualizer,
    "total",
    "moving active FEED off keypad resets active visualizer to total",
  );

  const allowedFormerBottomRightSwap = reducer(toKeypadMove, {
    type: "SWAP_LAYOUT_CELLS",
    fromSurface: "keypad",
    fromIndex: emptyKeypadIndex,
    toSurface: "keypad",
    toIndex: executionKeypadIndex,
  });
  assert.notEqual(
    allowedFormerBottomRightSwap,
    toKeypadMove,
    "swapping non-execution into former bottom-right is now allowed",
  );

  const filledStorage = {
    ...baseline,
    unlocks: {
      ...baseline.unlocks,
      utilities: {
        ...baseline.unlocks.utilities,
        [utility("util_clear_all")]: true,
      },
    },
    ui: {
      ...baseline.ui,
      storageLayout: Array.from({ length: 8 }, () => ({ kind: "key" as const, key: utility("util_clear_all") })),
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
  assert.deepEqual(invalidSurfaceMove, baseline, "invalid surface indices are rejected");

  const movedForInvariant = reducer(baselineWithSpace, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "storage",
    fromIndex: baselineCStorageIndex,
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
    if (index === baselineCStorageIndex) {
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
  assert.equal(
    keyOrNull(resizedBigger.ui.keyLayout[indexAt(5, 4, saveQuitCoord.row, saveQuitCoord.col)]),
    k("system_save_quit_main_menu"),
    "Save&Quit stays anchored at R3C2 when expanding",
  );
  assert.equal(
    keyOrNull(resizedBigger.ui.keyLayout[indexAt(5, 4, incCoord.row, incCoord.col)]),
    k("unary_inc"),
    "++ stays anchored at R1C2 when expanding",
  );
  assert.equal(
    keyOrNull(resizedBigger.ui.keyLayout[indexAt(5, 4, equalsCoord.row, equalsCoord.col)]),
    k("exec_equals"),
    "= stays anchored at R1C1 when expanding",
  );

  const stepActiveResizeSource: GameState = {
    ...baseline,
    calculator: {
      ...baseline.calculator,
      stepProgress: {
        active: true,
        seedTotal: r(1n),
        currentTotal: r(2n),
        nextSlotIndex: 1,
        executedSlotResults: [r(2n)],
      },
    },
  };
  const stepClearedOnResize = reducer(stepActiveResizeSource, { type: "SET_KEYPAD_DIMENSIONS", columns: 3, rows: 1 });
  assert.equal(stepClearedOnResize.calculator.stepProgress.active, false, "keypad resize clears active step session");

  const resizedSmaller = reducer(resizedBigger, { type: "SET_KEYPAD_DIMENSIONS", columns: 2, rows: 3 });
  assert.equal(resizedSmaller.ui.keyLayout.length, 6, "resizing down truncates layout tail");
  assert.equal(resizedSmaller.ui.keypadColumns, 2, "resizing down updates columns");
  assert.equal(resizedSmaller.ui.keypadRows, 3, "resizing down updates rows");
  assert.equal(
    keyOrNull(resizedSmaller.ui.keyLayout[indexAt(2, 3, saveQuitCoord.row, saveQuitCoord.col)]),
    k("system_save_quit_main_menu"),
    "Save&Quit remains anchored at R3C2 after shrink",
  );
  assert.equal(
    keyOrNull(resizedSmaller.ui.keyLayout[indexAt(2, 3, incCoord.row, incCoord.col)]),
    k("unary_inc"),
    "++ remains anchored at R1C2 after shrink",
  );
  assert.equal(
    keyOrNull(resizedSmaller.ui.keyLayout[indexAt(2, 3, equalsCoord.row, equalsCoord.col)]),
    k("exec_equals"),
    "= remains anchored at R1C1 after shrink",
  );

  const shrinkWithOccupiedRemovedSlotSource = reducer(baselineWithSpaceUnlocked, { type: "SET_KEYPAD_DIMENSIONS", columns: 4, rows: 1 });
  const cStorageIndexForShrink = shrinkWithOccupiedRemovedSlotSource.ui.storageLayout.findIndex(
    (cell) => cell?.key === utility("util_clear_all"),
  );
  assert.ok(cStorageIndexForShrink >= 0, "setup: storage includes C key for shrink removal test");
  const shrinkRemovedSlotOccupied = reducer(shrinkWithOccupiedRemovedSlotSource, {
    type: "MOVE_LAYOUT_CELL",
    fromSurface: "storage",
    fromIndex: cStorageIndexForShrink,
    toSurface: "keypad",
    toIndex: 0,
  });
  assert.equal(
    shrinkRemovedSlotOccupied.ui.keyLayout[0]?.kind === "key" ? shrinkRemovedSlotOccupied.ui.keyLayout[0].key : null,
    utility("util_clear_all"),
    "setup: removable slot is occupied before shrink",
  );
  const shrinkEvacuated = reducer(shrinkRemovedSlotOccupied, { type: "SET_KEYPAD_DIMENSIONS", columns: 3, rows: 1 });
  assert.equal(
    shrinkEvacuated.ui.keyLayout[0]?.kind,
    "placeholder",
    "shrinking clears removed keypad slot from keypad surface",
  );
  assert.ok(
    shrinkEvacuated.ui.storageLayout.some((cell) => cell?.key === utility("util_clear_all")),
    "key from removed slot is moved into storage",
  );

  const fullStorageBeforeShrink: GameState = {
    ...shrinkRemovedSlotOccupied,
    ui: {
      ...shrinkRemovedSlotOccupied.ui,
      storageLayout: Array.from({ length: 8 }, () => ({ kind: "key" as const, key: k("digit_1") })),
    },
  };
  const shrinkWithFullStorage = reducer(fullStorageBeforeShrink, { type: "SET_KEYPAD_DIMENSIONS", columns: 3, rows: 1 });
  assert.equal(shrinkWithFullStorage.ui.storageLayout.length, 16, "shrink evacuation expands storage when no empty slot exists");
  assert.ok(
    shrinkWithFullStorage.ui.storageLayout.some((cell) => cell?.key === utility("util_clear_all")),
    "shrink evacuation preserves removed key even when storage was full",
  );

  const clampedResize = reducer(baseline, { type: "SET_KEYPAD_DIMENSIONS", columns: 99, rows: -4 });
  assert.equal(clampedResize.ui.keypadColumns, 8, "columns clamp to max bound");
  assert.equal(clampedResize.ui.keypadRows, 1, "rows clamp to min bound");
  assert.equal(
    keyOrNull(clampedResize.ui.keyLayout[indexAt(8, 1, equalsCoord.row, equalsCoord.col)]),
    k("exec_equals"),
    "= stays anchored at R1C1 after clamped resize",
  );
  assert.equal(
    keyOrNull(clampedResize.ui.keyLayout[indexAt(8, 1, incCoord.row, incCoord.col)]),
    k("unary_inc"),
    "++ remains anchored at R1C2 when row 2 is removed",
  );
  assert.equal(
    clampedResize.ui.keyLayout.some((cell) => cell.kind === "key" && cell.key === k("system_save_quit_main_menu")),
    false,
    "Save&Quit is evacuated off keypad when rows above 1 are removed",
  );

  const upgradedRow = reducer(baseline, { type: "UPGRADE_KEYPAD_ROW" });
  assert.equal(upgradedRow.ui.keypadRows, baseline.ui.keypadRows + 1, "row upgrade increases rows by one");
  assert.equal(
    upgradedRow.ui.keyLayout.length,
    baseline.ui.keypadColumns * (baseline.ui.keypadRows + 1),
    "row upgrade appends one keypad row",
  );
  assert.equal(upgradedRow.ui.keyLayout[0]?.kind, "placeholder", "row upgrade pushes keys down");
  assert.equal(upgradedRow.ui.keyLayout[1]?.kind, "placeholder", "row upgrade keeps top row empty");
  assert.equal(
    keyOrNull(upgradedRow.ui.keyLayout[indexAt(upgradedRow.ui.keypadColumns, upgradedRow.ui.keypadRows, saveQuitCoord.row, saveQuitCoord.col)]),
    k("system_save_quit_main_menu"),
    "row upgrade preserves Save&Quit anchor",
  );
  assert.equal(
    keyOrNull(upgradedRow.ui.keyLayout[indexAt(upgradedRow.ui.keypadColumns, upgradedRow.ui.keypadRows, incCoord.row, incCoord.col)]),
    k("unary_inc"),
    "row upgrade preserves ++ anchor at R1C2",
  );
  assert.equal(
    keyOrNull(upgradedRow.ui.keyLayout[indexAt(upgradedRow.ui.keypadColumns, upgradedRow.ui.keypadRows, equalsCoord.row, equalsCoord.col)]),
    k("exec_equals"),
    "row upgrade preserves = anchor",
  );

  const upgradedColumn = reducer(baseline, { type: "UPGRADE_KEYPAD_COLUMN" });
  assert.equal(upgradedColumn.ui.keypadColumns, baseline.ui.keypadColumns + 1, "column upgrade increases columns by one");
  assert.equal(
    upgradedColumn.ui.keyLayout.length,
    (baseline.ui.keypadColumns + 1) * baseline.ui.keypadRows,
    "column upgrade appends one keypad column",
  );
  assert.equal(upgradedColumn.ui.keyLayout[0]?.kind, "placeholder", "column upgrade pushes keys right");
  assert.equal(
    keyOrNull(upgradedColumn.ui.keyLayout[indexAt(upgradedColumn.ui.keypadColumns, upgradedColumn.ui.keypadRows, saveQuitCoord.row, saveQuitCoord.col)]),
    k("system_save_quit_main_menu"),
    "column upgrade preserves Save&Quit anchor",
  );
  assert.equal(
    keyOrNull(upgradedColumn.ui.keyLayout[indexAt(upgradedColumn.ui.keypadColumns, upgradedColumn.ui.keypadRows, incCoord.row, incCoord.col)]),
    k("unary_inc"),
    "column upgrade preserves ++ anchor at R1C2",
  );
  assert.equal(
    keyOrNull(upgradedColumn.ui.keyLayout[indexAt(upgradedColumn.ui.keypadColumns, upgradedColumn.ui.keypadRows, equalsCoord.row, equalsCoord.col)]),
    k("exec_equals"),
    "column upgrade preserves = anchor",
  );

  const atMaxRows = reducer(baseline, { type: "SET_KEYPAD_DIMENSIONS", columns: baseline.ui.keypadColumns, rows: 8 });
  const noOpUpgradeRow = reducer(atMaxRows, { type: "UPGRADE_KEYPAD_ROW" });
  assert.deepEqual(noOpUpgradeRow, atMaxRows, "row upgrade no-ops at max bound");
  const atMaxColumns = reducer(baseline, { type: "SET_KEYPAD_DIMENSIONS", columns: 8, rows: baseline.ui.keypadRows });
  const noOpUpgradeColumn = reducer(atMaxColumns, { type: "UPGRADE_KEYPAD_COLUMN" });
  assert.deepEqual(noOpUpgradeColumn, atMaxColumns, "column upgrade no-ops at max bound");

  const noopResize = reducer(baseline, {
    type: "SET_KEYPAD_DIMENSIONS",
    columns: baseline.ui.keypadColumns,
    rows: baseline.ui.keypadRows,
  });
  assert.deepEqual(noopResize, baseline, "unchanged dimensions are a no-op");
};











