import { isStorageLayoutValid } from "./reducer.layout.js";
import { isKeyUnlocked } from "./keyUnlocks.js";
import { KEYPAD_DEFAULT_COLUMNS, KEYPAD_DEFAULT_ROWS } from "./state.js";
import type { GameState, Key, LayoutSurface } from "./types.js";

type Occupancy = "key" | "empty" | "invalid";
type DropAction = "move" | "swap";

type DragTarget = {
  surface: LayoutSurface;
  index: number;
};

const isStepKey = (key: Key): boolean => key === "\u23EF";

const getCellOccupancy = (state: GameState, target: DragTarget): Occupancy => {
  if (!state.unlocks.uiUnlocks.storageVisible && target.surface === "storage") {
    return "invalid";
  }
  if (target.surface === "keypad") {
    const cell = state.ui.keyLayout[target.index];
    if (!cell) {
      return "invalid";
    }
    if (cell.kind !== "key") {
      return "empty";
    }
    return isKeyUnlocked(state, cell.key) ? "key" : "invalid";
  }
  const slot = state.ui.storageLayout[target.index];
  if (typeof slot === "undefined") {
    return "invalid";
  }
  if (!slot) {
    return "empty";
  }
  return isKeyUnlocked(state, slot.key) ? "key" : "invalid";
};

const getKeyAtTarget = (state: GameState, target: DragTarget): Key | null => {
  if (!state.unlocks.uiUnlocks.storageVisible && target.surface === "storage") {
    return null;
  }
  if (target.surface === "keypad") {
    const cell = state.ui.keyLayout[target.index];
    if (!cell || cell.kind !== "key") {
      return null;
    }
    return cell.key;
  }
  const slot = state.ui.storageLayout[target.index];
  return slot?.key ?? null;
};

const isBottomRowKeypadIndex = (state: GameState, index: number): boolean => {
  const columns = Math.max(1, state.ui.keypadColumns || KEYPAD_DEFAULT_COLUMNS);
  const rows = Math.max(1, state.ui.keypadRows || KEYPAD_DEFAULT_ROWS);
  const bottomRowStart = (rows - 1) * columns;
  return index >= bottomRowStart && index < bottomRowStart + columns;
};

const violatesStepBottomRowRule = (
  state: GameState,
  source: DragTarget,
  destination: DragTarget,
  action: DropAction,
): boolean => {
  const sourceKey = getKeyAtTarget(state, source);
  if (!sourceKey) {
    return true;
  }
  if (destination.surface === "keypad" && isStepKey(sourceKey) && isBottomRowKeypadIndex(state, destination.index)) {
    return true;
  }
  if (action !== "swap") {
    return false;
  }
  const destinationKey = getKeyAtTarget(state, destination);
  if (!destinationKey) {
    return true;
  }
  return source.surface === "keypad" && isStepKey(destinationKey) && isBottomRowKeypadIndex(state, source.index);
};

const isStorageDropGeometryValid = (
  state: GameState,
  source: DragTarget,
  destination: DragTarget,
  action: DropAction,
): boolean => {
  if (source.surface !== "storage" && destination.surface !== "storage") {
    return true;
  }
  const nextStorage = [...state.ui.storageLayout];
  const sourceStorageCell = source.surface === "storage" ? nextStorage[source.index] : null;
  const destinationStorageCell = destination.surface === "storage" ? nextStorage[destination.index] : null;
  if (action === "move") {
    if (source.surface === "storage") {
      nextStorage[source.index] = null;
    }
    if (destination.surface === "storage") {
      if (source.surface === "storage") {
        nextStorage[destination.index] = sourceStorageCell;
      } else {
        const sourceKeypadCell = state.ui.keyLayout[source.index];
        nextStorage[destination.index] = sourceKeypadCell?.kind === "key" ? sourceKeypadCell : null;
      }
    }
  } else {
    if (source.surface === "storage" && destination.surface === "storage") {
      nextStorage[source.index] = destinationStorageCell;
      nextStorage[destination.index] = sourceStorageCell;
    } else if (source.surface === "storage" && destination.surface === "keypad") {
      const destinationKeypadCell = state.ui.keyLayout[destination.index];
      nextStorage[source.index] = destinationKeypadCell?.kind === "key" ? destinationKeypadCell : null;
    } else if (source.surface === "keypad" && destination.surface === "storage") {
      const sourceKeypadCell = state.ui.keyLayout[source.index];
      nextStorage[destination.index] = sourceKeypadCell?.kind === "key" ? sourceKeypadCell : null;
    }
  }
  return isStorageLayoutValid(nextStorage);
};

export const classifyDropAction = (
  state: GameState,
  source: DragTarget,
  destination: DragTarget,
  options: { interactionMode?: "calculator" | "modify" } = {},
): DropAction | null => {
  const interactionMode = options.interactionMode ?? "calculator";
  if (
    interactionMode === "calculator" &&
    (source.surface === "storage" || destination.surface === "storage")
  ) {
    return null;
  }
  if (source.surface === destination.surface && source.index === destination.index) {
    return null;
  }
  const sourceOccupancy = getCellOccupancy(state, source);
  const destinationOccupancy = getCellOccupancy(state, destination);
  if (sourceOccupancy !== "key" || destinationOccupancy === "invalid") {
    return null;
  }
  const action: DropAction = destinationOccupancy === "key" ? "swap" : "move";
  if (violatesStepBottomRowRule(state, source, destination, action)) {
    return null;
  }
  return isStorageDropGeometryValid(state, source, destination, action) ? action : null;
};

export const shouldStartDragFromDelta = (deltaX: number, deltaY: number, thresholdPx: number = 6): boolean =>
  deltaX * deltaX + deltaY * deltaY >= thresholdPx * thresholdPx;

