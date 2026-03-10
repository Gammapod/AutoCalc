import { isKeyUnlocked } from "./keyUnlocks.js";
import { KEYPAD_DEFAULT_COLUMNS, KEYPAD_DEFAULT_ROWS, STORAGE_COLUMNS } from "./state.js";
import type { GameState, Key, LayoutSurface } from "./types.js";

export type LayoutDropAction = "move" | "swap";

export type LayoutRuleReason =
  | "same_source_destination"
  | "invalid_source"
  | "invalid_destination"
  | "step_bottom_row_forbidden"
  | "storage_geometry_invalid";

export type LayoutRuleDecision =
  | { allowed: true; action: LayoutDropAction }
  | { allowed: false; reason: LayoutRuleReason };

export type LayoutTarget = {
  surface: LayoutSurface;
  index: number;
};

type Occupancy = "key" | "empty" | "invalid";

const isStepKey = (key: Key): boolean => key === "\u23EF";

export const isStorageLayoutValid = (storageLayout: Array<GameState["ui"]["storageLayout"][number]>): boolean =>
  storageLayout.length > 0 && storageLayout.length % STORAGE_COLUMNS === 0;

const getCellOccupancy = (
  state: GameState,
  target: LayoutTarget,
  mode: "source" | "destination",
  enforceUnlockedKeypadDestination: boolean,
): Occupancy => {
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
    if (mode === "source" || !enforceUnlockedKeypadDestination) {
      return "key";
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
  return "key";
};

const getKeyAtTarget = (state: GameState, target: LayoutTarget): Key | null => {
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
  source: LayoutTarget,
  destination: LayoutTarget,
  action: LayoutDropAction,
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
  source: LayoutTarget,
  destination: LayoutTarget,
  action: LayoutDropAction,
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

export const evaluateLayoutDrop = (
  state: GameState,
  source: LayoutTarget,
  destination: LayoutTarget,
  options: {
    enforceUnlockedKeypadDestination?: boolean;
  } = {},
): LayoutRuleDecision => {
  const enforceUnlockedKeypadDestination = options.enforceUnlockedKeypadDestination ?? true;
  if (source.surface === destination.surface && source.index === destination.index) {
    return { allowed: false, reason: "same_source_destination" };
  }
  const sourceOccupancy = getCellOccupancy(state, source, "source", enforceUnlockedKeypadDestination);
  if (sourceOccupancy !== "key") {
    return { allowed: false, reason: "invalid_source" };
  }
  const destinationOccupancy = getCellOccupancy(state, destination, "destination", enforceUnlockedKeypadDestination);
  if (destinationOccupancy === "invalid") {
    return { allowed: false, reason: "invalid_destination" };
  }
  const action: LayoutDropAction = destinationOccupancy === "key" ? "swap" : "move";
  if (violatesStepBottomRowRule(state, source, destination, action)) {
    return { allowed: false, reason: "step_bottom_row_forbidden" };
  }
  if (!isStorageDropGeometryValid(state, source, destination, action)) {
    return { allowed: false, reason: "storage_geometry_invalid" };
  }
  return { allowed: true, action };
};

export const canApplyMoveLayoutCell = (
  state: GameState,
  source: LayoutTarget,
  destination: LayoutTarget,
): boolean => {
  const decision = evaluateLayoutDrop(state, source, destination);
  return decision.allowed && decision.action === "move";
};

export const canApplySwapLayoutCells = (
  state: GameState,
  source: LayoutTarget,
  destination: LayoutTarget,
): boolean => {
  const decision = evaluateLayoutDrop(state, source, destination);
  return decision.allowed && decision.action === "swap";
};
