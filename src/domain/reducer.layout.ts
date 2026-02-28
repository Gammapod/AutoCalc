import { STORAGE_COLUMNS, STORAGE_INITIAL_SLOTS } from "./state.js";
import type { GameState, KeyCell, LayoutCell, LayoutSurface } from "./types.js";

// Layout-only reducer logic for key slot move/swap actions.
const isValidLayoutIndex = (layoutLength: number, index: number): boolean =>
  Number.isInteger(index) && index >= 0 && index < layoutLength;

const isKeyCell = (cell: LayoutCell | KeyCell | null): cell is KeyCell =>
  !!cell && cell.kind === "key";

const isKeypadEmptyCell = (cell: LayoutCell): boolean => cell.kind === "placeholder";
const isStorageEmptyCell = (cell: KeyCell | null): boolean => cell === null;
const KEYPAD_COLUMNS = 4;

const getSpans = (cell: KeyCell): { colSpan: number; rowSpan: number } => ({
  colSpan: cell.wide ? 2 : 1,
  rowSpan: cell.tall ? 2 : 1,
});

export const isStorageLayoutValid = (storageLayout: Array<KeyCell | null>): boolean => {
  if (storageLayout.length === 0 || storageLayout.length % STORAGE_COLUMNS !== 0) {
    return false;
  }
  const rows = storageLayout.length / STORAGE_COLUMNS;
  const occupied = new Set<number>();
  for (let index = 0; index < storageLayout.length; index += 1) {
    const cell = storageLayout[index];
    if (!cell) {
      continue;
    }
    const row = Math.floor(index / STORAGE_COLUMNS);
    const column = index % STORAGE_COLUMNS;
    const { colSpan, rowSpan } = getSpans(cell);
    if (column + colSpan > STORAGE_COLUMNS || row + rowSpan > rows) {
      return false;
    }
    for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
      for (let colOffset = 0; colOffset < colSpan; colOffset += 1) {
        const footprintIndex = (row + rowOffset) * STORAGE_COLUMNS + (column + colOffset);
        if (occupied.has(footprintIndex)) {
          return false;
        }
        occupied.add(footprintIndex);
      }
    }
  }
  return true;
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
  return `${cell.key}|${cell.wide ? "w" : "_"}|${cell.tall ? "t" : "_"}`;
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

const countKeypadEmptySlots = (layout: LayoutCell[]): number => layout.filter((cell) => cell.kind === "placeholder").length;
const isLargeKey = (cell: KeyCell): boolean => Boolean(cell.wide || cell.tall);

const toGridKey = (row: number, column: number): string => `${row}:${column}`;
const canPlaceKeypadCell = (
  occupied: Set<string>,
  row: number,
  column: number,
  colSpan: number,
  rowSpan: number,
): boolean => {
  if (column + colSpan - 1 > KEYPAD_COLUMNS) {
    return false;
  }
  for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
    for (let colOffset = 0; colOffset < colSpan; colOffset += 1) {
      if (occupied.has(toGridKey(row + rowOffset, column + colOffset))) {
        return false;
      }
    }
  }
  return true;
};
const claimKeypadCells = (occupied: Set<string>, row: number, column: number, colSpan: number, rowSpan: number): void => {
  for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
    for (let colOffset = 0; colOffset < colSpan; colOffset += 1) {
      occupied.add(toGridKey(row + rowOffset, column + colOffset));
    }
  }
};
const buildKeypadAnchors = (layout: LayoutCell[]): string[] => {
  const anchors: string[] = [];
  const occupied = new Set<string>();
  let searchIndex = 0;
  for (let index = 0; index < layout.length; index += 1) {
    const cell = layout[index];
    const colSpan = cell.kind === "key" && cell.wide ? 2 : 1;
    const rowSpan = cell.kind === "key" && cell.tall ? 2 : 1;
    while (true) {
      const row = Math.floor(searchIndex / KEYPAD_COLUMNS) + 1;
      const column = (searchIndex % KEYPAD_COLUMNS) + 1;
      if (canPlaceKeypadCell(occupied, row, column, colSpan, rowSpan)) {
        claimKeypadCells(occupied, row, column, colSpan, rowSpan);
        anchors.push(`${row}:${column}`);
        searchIndex += 1;
        break;
      }
      searchIndex += 1;
    }
  }
  return anchors;
};

const hasOnlyExpectedKeypadAnchorChanges = (
  previous: GameState,
  next: GameState,
  allowedChanges: SurfaceIndex[],
): boolean => {
  const allowedKeypad = new Set(
    allowedChanges.filter((entry) => entry.surface === "keypad").map((entry) => entry.index.toString()),
  );
  const previousAnchors = buildKeypadAnchors(previous.ui.keyLayout);
  const nextAnchors = buildKeypadAnchors(next.ui.keyLayout);

  for (let index = 0; index < previous.ui.keyLayout.length; index += 1) {
    if (allowedKeypad.has(index.toString())) {
      continue;
    }
    const previousCell = previous.ui.keyLayout[index];
    const nextCell = next.ui.keyLayout[index];
    if (!isKeyCell(previousCell) || !isKeyCell(nextCell)) {
      continue;
    }
    if (keySignature(previousCell) !== keySignature(nextCell)) {
      continue;
    }
    if (previousAnchors[index] !== nextAnchors[index]) {
      return false;
    }
  }
  return true;
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
  const sourceIsLargeKey = isLargeKey(sourceCell);
  const touchesKeypad = fromSurface === "keypad" || toSurface === "keypad";
  if (sourceIsLargeKey && touchesKeypad && countKeypadEmptySlots(state.ui.keyLayout) < 2) {
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
  if (
    (sourceIsLargeKey && touchesKeypad && countKeypadEmptySlots(nextState.ui.keyLayout) < 2) ||
    !hasOnlyExpectedKeyChanges(state, nextState, allowed) ||
    !hasOnlyExpectedKeypadAnchorChanges(state, nextState, allowed)
  ) {
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
  const sourceIsLargeKey = isLargeKey(sourceCell);
  const destinationIsLargeKey = isLargeKey(destinationCell);
  const touchesKeypad = fromSurface === "keypad" || toSurface === "keypad";
  if ((sourceIsLargeKey || destinationIsLargeKey) && touchesKeypad && countKeypadEmptySlots(state.ui.keyLayout) < 2) {
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
  if (
    ((sourceIsLargeKey || destinationIsLargeKey) && touchesKeypad && countKeypadEmptySlots(nextState.ui.keyLayout) < 2) ||
    !hasOnlyExpectedKeyChanges(state, nextState, allowed) ||
    !hasOnlyExpectedKeypadAnchorChanges(state, nextState, allowed)
  ) {
    return state;
  }
  return nextState;
};
