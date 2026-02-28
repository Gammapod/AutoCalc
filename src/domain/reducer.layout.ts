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
import type { GameState, KeyCell, KeypadCellRecord, LayoutCell, LayoutSurface } from "./types.js";

// Layout-only reducer logic for key slot move/swap actions.
const isValidLayoutIndex = (layoutLength: number, index: number): boolean =>
  Number.isInteger(index) && index >= 0 && index < layoutLength;

const isKeyCell = (cell: LayoutCell | KeyCell | null): cell is KeyCell =>
  !!cell && cell.kind === "key";

const isKeypadEmptyCell = (cell: LayoutCell): boolean => cell.kind === "placeholder";
const isStorageEmptyCell = (cell: KeyCell | null): boolean => cell === null;

export const isStorageLayoutValid = (storageLayout: Array<KeyCell | null>): boolean => {
  return storageLayout.length > 0 && storageLayout.length % STORAGE_COLUMNS === 0;
};

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

const isStorageOutcomeValid = (
  state: GameState,
  fromSurface: LayoutSurface,
  fromIndex: number,
  fromNextValue: LayoutCell | KeyCell | null,
  toSurface: LayoutSurface,
  toIndex: number,
  toNextValue: LayoutCell | KeyCell | null,
): boolean => {
  const nextStorage = [...state.ui.storageLayout];
  if (fromSurface === "storage") {
    nextStorage[fromIndex] = fromNextValue as KeyCell | null;
  }
  if (toSurface === "storage") {
    nextStorage[toIndex] = toNextValue as KeyCell | null;
  }
  return isStorageLayoutValid(nextStorage);
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
  if (
    !isStorageOutcomeValid(
      state,
      fromSurface,
      fromIndex,
      sourceClearedCell(fromSurface),
      toSurface,
      toIndex,
      sourceCell,
    )
  ) {
    return state;
  }

  const cleared = writeSurfaceCell(state, fromSurface, fromIndex, sourceClearedCell(fromSurface));
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
  if (!isStorageOutcomeValid(state, fromSurface, fromIndex, destinationCell, toSurface, toIndex, sourceCell)) {
    return state;
  }

  const withSwappedFrom = writeSurfaceCell(state, fromSurface, fromIndex, destinationCell);
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
  const keyLayout = resizeKeyLayout(state.ui.keyLayout, currentColumns, currentRows, clampedColumns, clampedRows);
  const keypadCells = fromKeyLayoutArray(keyLayout, clampedColumns, clampedRows);
  return {
    ...state,
    ui: {
      ...state.ui,
      keyLayout,
      keypadCells,
      keypadColumns: clampedColumns,
      keypadRows: clampedRows,
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
