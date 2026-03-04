import { isStorageLayoutValid } from "./reducer.layout.js";
import { isKeyUnlocked } from "./keyUnlocks.js";
import type { GameState, Key, LayoutSurface } from "./types.js";

type Occupancy = "key" | "empty" | "invalid";
type DropAction = "move" | "swap";

type DragTarget = {
  surface: LayoutSurface;
  index: number;
};

const isExecutionKey = (key: Key): boolean => key === "=" || key === "++" || key === "--";

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

const countKeypadExecutionKeys = (state: GameState): number =>
  state.ui.keyLayout.reduce(
    (count, cell) => (cell.kind === "key" && isExecutionKey(cell.key) ? count + 1 : count),
    0,
  );

const violatesExecutionCountRule = (
  state: GameState,
  source: DragTarget,
  destination: DragTarget,
  action: DropAction,
): boolean => {
  const sourceKey = getKeyAtTarget(state, source);
  if (!sourceKey) {
    return true;
  }

  let nextExecutionCount = countKeypadExecutionKeys(state);
  const sourceIsExecution = isExecutionKey(sourceKey);

  if (sourceIsExecution && source.surface === "keypad") {
    nextExecutionCount -= 1;
  }
  if (sourceIsExecution && destination.surface === "keypad") {
    nextExecutionCount += 1;
  }

  if (action === "swap") {
    const destinationKey = getKeyAtTarget(state, destination);
    if (!destinationKey) {
      return true;
    }
    const destinationIsExecution = isExecutionKey(destinationKey);
    if (destinationIsExecution && destination.surface === "keypad") {
      nextExecutionCount -= 1;
    }
    if (destinationIsExecution && source.surface === "keypad") {
      nextExecutionCount += 1;
    }
  }

  return nextExecutionCount >= 2;
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
  if (violatesExecutionCountRule(state, source, destination, action)) {
    return null;
  }
  return isStorageDropGeometryValid(state, source, destination, action) ? action : null;
};

export const shouldStartDragFromDelta = (deltaX: number, deltaY: number, thresholdPx: number = 6): boolean =>
  deltaX * deltaX + deltaY * deltaY >= thresholdPx * thresholdPx;

