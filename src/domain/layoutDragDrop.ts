import { evaluateLayoutDrop } from "./layoutRules.js";
import { isKeyUnlocked } from "./keyUnlocks.js";
import type { GameState, Key, LayoutSurface } from "./types.js";
import { getKeyLayoutForSurface, isAnyKeypadSurface as isKeypadSurface } from "./calculatorSurface.js";

type DragTarget = {
  surface: LayoutSurface;
  index: number;
};

export type LayoutDragDropAction = "move" | "swap" | "install" | "uninstall";

const readKeyAtSource = (
  state: GameState,
  source: DragTarget,
  sourceKey: Key | null,
): Key | null => {
  if (source.surface === "storage") {
    if (sourceKey) {
      return sourceKey;
    }
    return state.ui.storageLayout[source.index]?.key ?? null;
  }
  const keyLayout = getKeyLayoutForSurface(state, source.surface);
  const cell = keyLayout?.[source.index];
  if (!cell || cell.kind !== "key") {
    return null;
  }
  return cell.key;
};

const isValidKeypadDestination = (state: GameState, destination: DragTarget): boolean => {
  const keyLayout = getKeyLayoutForSurface(state, destination.surface);
  const destinationCell = keyLayout?.[destination.index];
  if (!destinationCell) {
    return false;
  }
  return destinationCell.kind !== "key" || isKeyUnlocked(state, destinationCell.key);
};

const hasInstalledKeyOnSurface = (state: GameState, surface: LayoutSurface, key: Key): boolean => {
  const keyLayout = getKeyLayoutForSurface(state, surface);
  if (!keyLayout) {
    return false;
  }
  return keyLayout.some((cell) => cell.kind === "key" && cell.key === key);
};

const isValidStorageDestination = (state: GameState, destination: DragTarget): boolean =>
  destination.surface === "storage"
  && destination.index >= 0
  && destination.index < state.ui.storageLayout.length;

export const classifyDropAction = (
  state: GameState,
  source: DragTarget,
  destination: DragTarget | null,
  sourceKey: Key | null = null,
): LayoutDragDropAction | null => {
  const key = readKeyAtSource(state, source, sourceKey);
  if (!key || !isKeyUnlocked(state, key)) {
    return null;
  }

  if (!destination) {
    return isKeypadSurface(source.surface) ? "uninstall" : null;
  }

  if (source.surface === destination.surface && source.index === destination.index) {
    return null;
  }

  if (destination.surface === "storage") {
    if (!isValidStorageDestination(state, destination)) {
      return null;
    }
    return isKeypadSurface(source.surface) ? "uninstall" : null;
  }

  if (!isKeypadSurface(destination.surface)) {
    return null;
  }

  if (!isValidKeypadDestination(state, destination)) {
    return null;
  }

  if (source.surface === "storage") {
    if (hasInstalledKeyOnSurface(state, destination.surface, key)) {
      return null;
    }
    return "install";
  }

  const decision = evaluateLayoutDrop(state, source, destination);
  return decision.allowed ? decision.action : null;
};

export const shouldStartDragFromDelta = (deltaX: number, deltaY: number, thresholdPx: number = 6): boolean =>
  deltaX * deltaX + deltaY * deltaY >= thresholdPx * thresholdPx;

