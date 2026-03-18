import { isKeyUnlocked } from "./keyUnlocks.js";
import { STORAGE_COLUMNS } from "./state.js";
import type { GameState, LayoutSurface } from "./types.js";

export type LayoutDropAction = "move" | "swap";

export type LayoutRuleReason =
  | "same_source_destination"
  | "invalid_source"
  | "invalid_destination"
  | "storage_geometry_invalid";

export type LayoutRuleDecision =
  | { allowed: true; action: LayoutDropAction }
  | { allowed: false; reason: LayoutRuleReason };

export type LayoutTarget = {
  surface: LayoutSurface;
  index: number;
};

type Occupancy = "key" | "empty" | "invalid";

export const isStorageLayoutValid = (storageLayout: Array<GameState["ui"]["storageLayout"][number]>): boolean =>
  storageLayout.length > 0 && storageLayout.length % STORAGE_COLUMNS === 0;

const getKeyLayoutForSurface = (state: GameState, surface: LayoutSurface): GameState["ui"]["keyLayout"] | null => {
  if (surface === "keypad") {
    const activeCalculatorId = state.activeCalculatorId;
    if (activeCalculatorId && state.calculators?.[activeCalculatorId]?.ui.keyLayout) {
      return state.calculators[activeCalculatorId].ui.keyLayout;
    }
    return state.ui.keyLayout;
  }
  if (surface === "keypad_f") {
    return state.calculators?.f?.ui.keyLayout ?? state.ui.keyLayout;
  }
  if (surface === "keypad_g") {
    return state.calculators?.g?.ui.keyLayout ?? null;
  }
  return null;
};

const getCellOccupancy = (
  state: GameState,
  target: LayoutTarget,
  mode: "source" | "destination",
  enforceUnlockedKeypadDestination: boolean,
): Occupancy => {
  if (!state.unlocks.uiUnlocks.storageVisible && target.surface === "storage") {
    return "invalid";
  }
  if (target.surface === "keypad" || target.surface === "keypad_f" || target.surface === "keypad_g") {
    const keyLayout = getKeyLayoutForSurface(state, target.surface);
    const cell = keyLayout?.[target.index];
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
        const sourceKeypadLayout = getKeyLayoutForSurface(state, source.surface);
        const sourceKeypadCell = sourceKeypadLayout?.[source.index];
        nextStorage[destination.index] = sourceKeypadCell?.kind === "key" ? sourceKeypadCell : null;
      }
    }
  } else {
    if (source.surface === "storage" && destination.surface === "storage") {
      nextStorage[source.index] = destinationStorageCell;
      nextStorage[destination.index] = sourceStorageCell;
    } else if (
      source.surface === "storage"
      && (destination.surface === "keypad" || destination.surface === "keypad_f" || destination.surface === "keypad_g")
    ) {
      const destinationKeypadLayout = getKeyLayoutForSurface(state, destination.surface);
      const destinationKeypadCell = destinationKeypadLayout?.[destination.index];
      nextStorage[source.index] = destinationKeypadCell?.kind === "key" ? destinationKeypadCell : null;
    } else if ((source.surface === "keypad" || source.surface === "keypad_f" || source.surface === "keypad_g") && destination.surface === "storage") {
      const sourceKeypadLayout = getKeyLayoutForSurface(state, source.surface);
      const sourceKeypadCell = sourceKeypadLayout?.[source.index];
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
