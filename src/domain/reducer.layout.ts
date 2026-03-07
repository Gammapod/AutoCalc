import {
  fromKeyLayoutArray,
  getCellAtIndex,
  resizeAnchored,
  setCellAtIndex,
  toKeyLayoutArray,
} from "./keypadLayoutModel.js";
import {
  KEYPAD_DEFAULT_COLUMNS,
  KEYPAD_DEFAULT_ROWS,
  KEYPAD_DIM_MAX,
  KEYPAD_DIM_MIN,
  STORAGE_COLUMNS,
  STORAGE_INITIAL_SLOTS,
} from "./state.js";
import {
  evaluateLayoutDrop,
} from "./layoutRules.js";
import { keyToVisualizerId } from "./buttonRegistry.js";
import type { GameState, KeyCell, KeypadCellRecord, LayoutCell, LayoutSurface, VisualizerId } from "./types.js";

export { isStorageLayoutValid } from "./layoutRules.js";

// Layout-only reducer logic for key slot move/swap actions.
const isValidLayoutIndex = (layoutLength: number, index: number): boolean =>
  Number.isInteger(index) && index >= 0 && index < layoutLength;

const isKeyCell = (cell: LayoutCell | KeyCell | null): cell is KeyCell =>
  !!cell && cell.kind === "key";

const isKeypadEmptyCell = (cell: LayoutCell): boolean => cell.kind === "placeholder";
const isStorageEmptyCell = (cell: KeyCell | null): boolean => cell === null;

const nextStorageWithTrailingEmptyRow = (storageLayout: Array<KeyCell | null>): Array<KeyCell | null> => {
  const nextStorage = [...storageLayout];
  const normalizedLength = Math.max(STORAGE_INITIAL_SLOTS, Math.ceil(nextStorage.length / STORAGE_COLUMNS) * STORAGE_COLUMNS);
  while (nextStorage.length < normalizedLength) {
    nextStorage.push(null);
  }
  if (nextStorage.some((cell) => cell === null)) {
    return nextStorage;
  }
  return [...nextStorage, ...Array.from({ length: STORAGE_COLUMNS }, () => null)];
};

const appendKeyToStorage = (
  storageLayout: Array<KeyCell | null>,
  keyCell: KeyCell,
): Array<KeyCell | null> => {
  const next = [...storageLayout];
  const emptyIndex = next.findIndex((cell) => cell === null);
  if (emptyIndex >= 0) {
    next[emptyIndex] = keyCell;
    return nextStorageWithTrailingEmptyRow(next);
  }
  const expanded = [...next, ...Array.from({ length: STORAGE_COLUMNS }, () => null)];
  expanded[next.length] = keyCell;
  return nextStorageWithTrailingEmptyRow(expanded);
};

const emptyCell = (): LayoutCell => ({ kind: "placeholder", area: "empty" });

const getCurrentKeypadCells = (state: GameState): KeypadCellRecord[] => {
  const columns = Math.max(1, state.ui.keypadColumns || KEYPAD_DEFAULT_COLUMNS);
  const rows = Math.max(1, state.ui.keypadRows || KEYPAD_DEFAULT_ROWS);
  const expectedLength = columns * rows;
  if (state.ui.keypadCells.length === expectedLength) {
    return state.ui.keypadCells;
  }
  return fromKeyLayoutArray(state.ui.keyLayout, columns, rows);
};

const withKeypadState = (
  state: GameState,
  keypadCells: KeypadCellRecord[],
  columns: number,
  rows: number,
): GameState => {
  const keyLayout = toKeyLayoutArray(keypadCells, columns, rows);
  return {
    ...state,
    ui: {
      ...state.ui,
      keyLayout,
      keypadCells,
      keypadColumns: columns,
      keypadRows: rows,
    },
  };
};

const getSurfaceLength = (state: GameState, surface: LayoutSurface): number =>
  surface === "keypad"
    ? Math.max(1, (state.ui.keypadColumns || KEYPAD_DEFAULT_COLUMNS) * (state.ui.keypadRows || KEYPAD_DEFAULT_ROWS))
    : state.ui.storageLayout.length;

const readSurfaceCell = (state: GameState, surface: LayoutSurface, index: number): LayoutCell | KeyCell | null => {
  if (surface === "keypad") {
    const columns = state.ui.keypadColumns || KEYPAD_DEFAULT_COLUMNS;
    const rows = state.ui.keypadRows || KEYPAD_DEFAULT_ROWS;
    return getCellAtIndex(getCurrentKeypadCells(state), index, columns, rows);
  }
  return state.ui.storageLayout[index];
};

const writeSurfaceCell = (
  state: GameState,
  surface: LayoutSurface,
  index: number,
  value: LayoutCell | KeyCell | null,
): GameState => {
  if (surface === "keypad") {
    const columns = state.ui.keypadColumns || KEYPAD_DEFAULT_COLUMNS;
    const rows = state.ui.keypadRows || KEYPAD_DEFAULT_ROWS;
    const nextKeypadCells = setCellAtIndex(getCurrentKeypadCells(state), index, columns, rows, value as LayoutCell);
    return withKeypadState(state, nextKeypadCells, columns, rows);
  }

  const nextStorageLayout = [...state.ui.storageLayout];
  nextStorageLayout[index] = value as KeyCell | null;
  return {
    ...state,
    ui: {
      ...state.ui,
      storageLayout: nextStorageWithTrailingEmptyRow(nextStorageLayout),
    },
  };
};

const sourceClearedCell = (surface: LayoutSurface): LayoutCell | null =>
  surface === "keypad" ? emptyCell() : null;

const isEmptyCell = (surface: LayoutSurface, cell: LayoutCell | KeyCell | null): boolean =>
  surface === "keypad" ? isKeypadEmptyCell(cell as LayoutCell) : isStorageEmptyCell(cell as KeyCell | null);

const hasValidSurfaceIndex = (state: GameState, surface: LayoutSurface, index: number): boolean =>
  isValidLayoutIndex(getSurfaceLength(state, surface), index);

const keySignature = (cell: LayoutCell | KeyCell | null): string | null => {
  if (!cell || cell.kind !== "key") {
    return null;
  }
  return cell.key;
};

type SurfaceIndex = {
  surface: LayoutSurface;
  index: number;
};

const hasOnlyExpectedKeyChanges = (
  previous: GameState,
  next: GameState,
  allowedChanges: SurfaceIndex[],
): boolean => {
  const allow = new Set(allowedChanges.map((entry) => `${entry.surface}:${entry.index}`));

  for (let index = 0; index < previous.ui.keyLayout.length; index += 1) {
    if (allow.has(`keypad:${index}`)) {
      continue;
    }
    if (keySignature(previous.ui.keyLayout[index]) !== keySignature(next.ui.keyLayout[index])) {
      return false;
    }
  }

  for (let index = 0; index < previous.ui.storageLayout.length; index += 1) {
    if (allow.has(`storage:${index}`)) {
      continue;
    }
    if (keySignature(previous.ui.storageLayout[index]) !== keySignature(next.ui.storageLayout[index])) {
      return false;
    }
  }

  for (let index = previous.ui.storageLayout.length; index < next.ui.storageLayout.length; index += 1) {
    if (next.ui.storageLayout[index] !== null) {
      return false;
    }
  }

  return true;
};

const clampDimension = (value: number, fallback: number): number =>
  Math.max(KEYPAD_DIM_MIN, Math.min(KEYPAD_DIM_MAX, Number.isInteger(value) ? value : fallback));

export const resizeKeyLayout = (
  layout: LayoutCell[],
  fromColumns: number,
  fromRows: number,
  toColumns: number,
  toRows: number,
): LayoutCell[] => {
  const sourceCells = fromKeyLayoutArray(layout, fromColumns, fromRows);
  return toKeyLayoutArray(resizeAnchored(sourceCells, toColumns, toRows), toColumns, toRows);
};

const clearButtonFlag = (state: GameState, flag: string): GameState => {
  const trimmed = flag.trim();
  if (trimmed.length === 0 || !state.ui.buttonFlags[trimmed]) {
    return state;
  }
  const nextFlags = { ...state.ui.buttonFlags };
  delete nextFlags[trimmed];
  return {
    ...state,
    ui: {
      ...state.ui,
      buttonFlags: nextFlags,
    },
  };
};

const visualizerFromKey = (key: KeyCell["key"]): VisualizerId | null => {
  return keyToVisualizerId(key);
};

const clearToggleFlagWhenLeavingKeypad = (
  state: GameState,
  keyCell: KeyCell,
  fromSurface: LayoutSurface,
  toSurface: LayoutSurface,
): GameState => {
  const visualizer = visualizerFromKey(keyCell.key);
  if (visualizer && fromSurface === "keypad" && toSurface === "storage" && state.ui.activeVisualizer === visualizer) {
    return {
      ...state,
      ui: {
        ...state.ui,
        activeVisualizer: "total",
      },
    };
  }

  if (fromSurface !== "keypad" || toSurface !== "storage" || keyCell.behavior?.type !== "toggle_flag") {
    return state;
  }
  return clearButtonFlag(state, keyCell.behavior.flag);
};

export const applyMoveKeySlot = (state: GameState, fromIndex: number, toIndex: number): GameState => {
  const columns = state.ui.keypadColumns || KEYPAD_DEFAULT_COLUMNS;
  const rows = state.ui.keypadRows || KEYPAD_DEFAULT_ROWS;
  const layout = toKeyLayoutArray(getCurrentKeypadCells(state), columns, rows);
  if (
    !isValidLayoutIndex(layout.length, fromIndex) ||
    !isValidLayoutIndex(layout.length, toIndex) ||
    fromIndex === toIndex
  ) {
    return state;
  }

  const nextLayout = [...layout];
  const [movedCell] = nextLayout.splice(fromIndex, 1);
  nextLayout.splice(toIndex, 0, movedCell);
  const keypadCells = fromKeyLayoutArray(nextLayout, columns, rows);
  return withKeypadState(state, keypadCells, columns, rows);
};

export const applySwapKeySlots = (state: GameState, firstIndex: number, secondIndex: number): GameState => {
  const columns = state.ui.keypadColumns || KEYPAD_DEFAULT_COLUMNS;
  const rows = state.ui.keypadRows || KEYPAD_DEFAULT_ROWS;
  const layout = toKeyLayoutArray(getCurrentKeypadCells(state), columns, rows);
  if (
    !isValidLayoutIndex(layout.length, firstIndex) ||
    !isValidLayoutIndex(layout.length, secondIndex) ||
    firstIndex === secondIndex
  ) {
    return state;
  }

  const nextLayout = [...layout];
  [nextLayout[firstIndex], nextLayout[secondIndex]] = [nextLayout[secondIndex], nextLayout[firstIndex]];
  const keypadCells = fromKeyLayoutArray(nextLayout, columns, rows);
  return withKeypadState(state, keypadCells, columns, rows);
};

export const applyMoveLayoutCell = (
  state: GameState,
  fromSurface: LayoutSurface,
  fromIndex: number,
  toSurface: LayoutSurface,
  toIndex: number,
): GameState => {
  if (
    !hasValidSurfaceIndex(state, fromSurface, fromIndex) ||
    !hasValidSurfaceIndex(state, toSurface, toIndex) ||
    (fromSurface === toSurface && fromIndex === toIndex)
  ) {
    return state;
  }

  const sourceCell = readSurfaceCell(state, fromSurface, fromIndex);
  const destinationCell = readSurfaceCell(state, toSurface, toIndex);
  if (!isKeyCell(sourceCell) || !isEmptyCell(toSurface, destinationCell)) {
    return state;
  }
  const moveDecision = evaluateLayoutDrop(
    state,
    { surface: fromSurface, index: fromIndex },
    { surface: toSurface, index: toIndex },
    { enforceUnlockedKeypadDestination: false },
  );
  if (!moveDecision.allowed || moveDecision.action !== "move") {
    return state;
  }

  const toggledResetState = clearToggleFlagWhenLeavingKeypad(state, sourceCell, fromSurface, toSurface);
  const cleared = writeSurfaceCell(toggledResetState, fromSurface, fromIndex, sourceClearedCell(fromSurface));
  const nextState = writeSurfaceCell(cleared, toSurface, toIndex, sourceCell);
  const allowed = [
    { surface: fromSurface, index: fromIndex },
    { surface: toSurface, index: toIndex },
  ];
  if (!hasOnlyExpectedKeyChanges(state, nextState, allowed)) {
    return state;
  }
  return nextState;
};

export const applySwapLayoutCells = (
  state: GameState,
  fromSurface: LayoutSurface,
  fromIndex: number,
  toSurface: LayoutSurface,
  toIndex: number,
): GameState => {
  if (
    !hasValidSurfaceIndex(state, fromSurface, fromIndex) ||
    !hasValidSurfaceIndex(state, toSurface, toIndex) ||
    (fromSurface === toSurface && fromIndex === toIndex)
  ) {
    return state;
  }

  const sourceCell = readSurfaceCell(state, fromSurface, fromIndex);
  const destinationCell = readSurfaceCell(state, toSurface, toIndex);
  if (!isKeyCell(sourceCell) || !isKeyCell(destinationCell)) {
    return state;
  }
  const swapDecision = evaluateLayoutDrop(
    state,
    { surface: fromSurface, index: fromIndex },
    { surface: toSurface, index: toIndex },
    { enforceUnlockedKeypadDestination: false },
  );
  if (!swapDecision.allowed || swapDecision.action !== "swap") {
    return state;
  }

  const sourceReset = clearToggleFlagWhenLeavingKeypad(state, sourceCell, fromSurface, toSurface);
  const destinationReset = clearToggleFlagWhenLeavingKeypad(sourceReset, destinationCell, toSurface, fromSurface);
  const withSwappedFrom = writeSurfaceCell(destinationReset, fromSurface, fromIndex, destinationCell);
  const nextState = writeSurfaceCell(withSwappedFrom, toSurface, toIndex, sourceCell);
  const allowed = [
    { surface: fromSurface, index: fromIndex },
    { surface: toSurface, index: toIndex },
  ];
  if (!hasOnlyExpectedKeyChanges(state, nextState, allowed)) {
    return state;
  }
  return nextState;
};

export const applySetKeypadDimensions = (state: GameState, columns: number, rows: number): GameState => {
  const currentColumns = state.ui.keypadColumns || KEYPAD_DEFAULT_COLUMNS;
  const currentRows = state.ui.keypadRows || KEYPAD_DEFAULT_ROWS;
  const clampedColumns = clampDimension(columns, currentColumns);
  const clampedRows = clampDimension(rows, currentRows);
  if (state.ui.keypadColumns === clampedColumns && state.ui.keypadRows === clampedRows) {
    return state;
  }
  const currentKeypadCells = getCurrentKeypadCells(state);
  const removedKeyCells: KeyCell[] = currentKeypadCells
    .filter(
      (record) =>
        (record.row > clampedRows || record.col > clampedColumns) &&
        record.cell.kind === "key",
    )
    .map((record) => record.cell as KeyCell);

  let nextState = state;
  for (const removedCell of removedKeyCells) {
    nextState = clearToggleFlagWhenLeavingKeypad(nextState, removedCell, "keypad", "storage");
  }

  const keyLayout = resizeKeyLayout(nextState.ui.keyLayout, currentColumns, currentRows, clampedColumns, clampedRows);
  const keypadCells = fromKeyLayoutArray(keyLayout, clampedColumns, clampedRows);
  let nextStorageLayout = nextState.ui.storageLayout;
  for (const removedCell of removedKeyCells) {
    nextStorageLayout = appendKeyToStorage(nextStorageLayout, removedCell);
  }

  return {
    ...nextState,
    ui: {
      ...nextState.ui,
      keyLayout,
      keypadCells,
      keypadColumns: clampedColumns,
      keypadRows: clampedRows,
      storageLayout: nextStorageLayout,
    },
  };
};

export const applyUpgradeKeypadRow = (state: GameState): GameState => {
  const currentColumns = state.ui.keypadColumns || KEYPAD_DEFAULT_COLUMNS;
  const currentRows = state.ui.keypadRows || KEYPAD_DEFAULT_ROWS;
  const upgradedRows = clampDimension(currentRows + 1, currentRows);
  if (upgradedRows === currentRows) {
    return state;
  }
  const resizedCells = resizeAnchored(getCurrentKeypadCells(state), currentColumns, upgradedRows);
  return withKeypadState(state, resizedCells, currentColumns, upgradedRows);
};

export const applyUpgradeKeypadColumn = (state: GameState): GameState => {
  const currentColumns = state.ui.keypadColumns || KEYPAD_DEFAULT_COLUMNS;
  const currentRows = state.ui.keypadRows || KEYPAD_DEFAULT_ROWS;
  const upgradedColumns = clampDimension(currentColumns + 1, currentColumns);
  if (upgradedColumns === currentColumns) {
    return state;
  }
  const resizedCells = resizeAnchored(getCurrentKeypadCells(state), upgradedColumns, currentRows);
  return withKeypadState(state, resizedCells, upgradedColumns, currentRows);
};

