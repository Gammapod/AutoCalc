import { isKeyUnlocked } from "./keyUnlocks.js";
import { STORAGE_COLUMNS } from "./state.js";
import type { CalculatorId, GameState, LayoutSurface } from "./types.js";
import { isMultiCalculatorSession } from "./multiCalculator.js";
import {
  getKeyLayoutForSurface,
  isAnyKeypadSurface as isKeypadSurface,
  resolveSurfaceCalculatorId,
} from "./calculatorSurface.js";

export type LayoutDropAction = "move" | "swap";

export type LayoutRuleReason =
  | "same_source_destination"
  | "invalid_source"
  | "invalid_destination"
  | "locked_key_immobile"
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


const getCellOccupancy = (
  state: GameState,
  target: LayoutTarget,
  _mode: "source" | "destination",
  _enforceUnlockedKeypadDestination: boolean,
): Occupancy => {
  if (!state.unlocks.uiUnlocks.storageVisible && target.surface === "storage") {
    return "invalid";
  }
  if (
    target.surface === "keypad"
    || target.surface === "keypad_f"
    || target.surface === "keypad_g"
    || target.surface === "keypad_menu"
    || target.surface === "keypad_f_prime"
    || target.surface === "keypad_g_prime"
  ) {
    const keyLayout = getKeyLayoutForSurface(state, target.surface);
    const cell = keyLayout?.[target.index];
    if (!cell) {
      return "invalid";
    }
    if (cell.kind !== "key") {
      return "empty";
    }
    return "key";
  }
  const slot = state.ui.storageLayout[target.index];
  if (typeof slot === "undefined") {
    return "invalid";
  }
  if (!slot) {
    return "empty";
  }
  if (!isKeyUnlocked(state, slot.key)) {
    return "invalid";
  }
  return "key";
};

const resolveLayoutSurfaceCalculatorId = (state: GameState, surface: LayoutSurface): CalculatorId | null => {
  if (surface === "keypad" && !isMultiCalculatorSession(state)) {
    return "f";
  }
  return resolveSurfaceCalculatorId(state, surface);
};

const isLockedInstalledKeypadCell = (state: GameState, target: LayoutTarget): boolean => {
  if (!isKeypadSurface(target.surface)) {
    return false;
  }
  const keyLayout = getKeyLayoutForSurface(state, target.surface);
  const cell = keyLayout?.[target.index];
  return Boolean(cell?.kind === "key" && !isKeyUnlocked(state, cell.key));
};

const wouldMoveOffCalculator = (
  state: GameState,
  fromSurface: LayoutSurface,
  toSurface: LayoutSurface,
): boolean => {
  if (!isKeypadSurface(fromSurface)) {
    return false;
  }
  if (!isKeypadSurface(toSurface)) {
    return true;
  }
  const resolvedFromCalculatorId = resolveLayoutSurfaceCalculatorId(state, fromSurface);
  const resolvedToCalculatorId = resolveLayoutSurfaceCalculatorId(state, toSurface);
  return resolvedFromCalculatorId !== null && resolvedToCalculatorId !== null && resolvedFromCalculatorId !== resolvedToCalculatorId;
};

const violatesLockedKeyImmobility = (
  state: GameState,
  source: LayoutTarget,
  destination: LayoutTarget,
  action: LayoutDropAction,
): boolean => {
  const sourceLocked = isLockedInstalledKeypadCell(state, source);
  if (action === "move") {
    return sourceLocked && wouldMoveOffCalculator(state, source.surface, destination.surface);
  }
  const destinationLocked = isLockedInstalledKeypadCell(state, destination);
  return (sourceLocked && wouldMoveOffCalculator(state, source.surface, destination.surface))
    || (destinationLocked && wouldMoveOffCalculator(state, destination.surface, source.surface));
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
      && (
        destination.surface === "keypad"
        || destination.surface === "keypad_f"
        || destination.surface === "keypad_g"
        || destination.surface === "keypad_menu"
        || destination.surface === "keypad_f_prime"
        || destination.surface === "keypad_g_prime"
      )
    ) {
      const destinationKeypadLayout = getKeyLayoutForSurface(state, destination.surface);
      const destinationKeypadCell = destinationKeypadLayout?.[destination.index];
      nextStorage[source.index] = destinationKeypadCell?.kind === "key" ? destinationKeypadCell : null;
    } else if (
      (
        source.surface === "keypad"
        || source.surface === "keypad_f"
        || source.surface === "keypad_g"
        || source.surface === "keypad_menu"
        || source.surface === "keypad_f_prime"
        || source.surface === "keypad_g_prime"
      )
      && destination.surface === "storage"
    ) {
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
  if (violatesLockedKeyImmobility(state, source, destination, action)) {
    return { allowed: false, reason: "locked_key_immobile" };
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
