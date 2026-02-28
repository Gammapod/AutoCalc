import {
  KEYPAD_DEFAULT_COLUMNS,
  KEYPAD_DEFAULT_ROWS,
  KEYPAD_DIM_MAX,
  KEYPAD_DIM_MIN,
  STORAGE_COLUMNS,
  STORAGE_INITIAL_SLOTS,
} from "./state.js";
import type { GameState, KeyCell, LayoutCell, LayoutSurface } from "./types.js";

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

const getSurfaceLength = (state: GameState, surface: LayoutSurface): number =>
  surface === "keypad" ? state.ui.keyLayout.length : state.ui.storageLayout.length;

const readSurfaceCell = (state: GameState, surface: LayoutSurface, index: number): LayoutCell | KeyCell | null =>
  surface === "keypad" ? state.ui.keyLayout[index] : state.ui.storageLayout[index];

const writeSurfaceCell = (
  state: GameState,
  surface: LayoutSurface,
  index: number,
  value: LayoutCell | KeyCell | null,
): GameState => {
  if (surface === "keypad") {
    const nextKeyLayout = [...state.ui.keyLayout];
    nextKeyLayout[index] = value as LayoutCell;
    return {
      ...state,
      ui: {
        ...state.ui,
        keyLayout: nextKeyLayout,
      },
    };
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
  surface === "keypad" ? { kind: "placeholder", area: "empty" } : null;

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

export const resizeKeyLayout = (layout: LayoutCell[], columns: number, rows: number): LayoutCell[] => {
  const targetLength = Math.max(1, columns * rows);
  const next = layout.slice(0, targetLength);
  while (next.length < targetLength) {
    next.push({ kind: "placeholder", area: "empty" });
  }
  return next;
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
  const layout = state.ui.keyLayout;
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
  return {
    ...state,
    ui: {
      ...state.ui,
      keyLayout: nextLayout,
    },
  };
};

export const applySwapKeySlots = (state: GameState, firstIndex: number, secondIndex: number): GameState => {
  const layout = state.ui.keyLayout;
  if (
    !isValidLayoutIndex(layout.length, firstIndex) ||
    !isValidLayoutIndex(layout.length, secondIndex) ||
    firstIndex === secondIndex
  ) {
    return state;
  }

  const nextLayout = [...layout];
  [nextLayout[firstIndex], nextLayout[secondIndex]] = [nextLayout[secondIndex], nextLayout[firstIndex]];
  return {
    ...state,
    ui: {
      ...state.ui,
      keyLayout: nextLayout,
    },
  };
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
  const clampedColumns = clampDimension(columns, state.ui.keypadColumns || KEYPAD_DEFAULT_COLUMNS);
  const clampedRows = clampDimension(rows, state.ui.keypadRows || KEYPAD_DEFAULT_ROWS);
  if (state.ui.keypadColumns === clampedColumns && state.ui.keypadRows === clampedRows) {
    return state;
  }
  const keyLayout = resizeKeyLayout(state.ui.keyLayout, clampedColumns, clampedRows);
  return {
    ...state,
    ui: {
      ...state.ui,
      keyLayout,
      keypadColumns: clampedColumns,
      keypadRows: clampedRows,
    },
  };
};
