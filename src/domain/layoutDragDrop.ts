import { evaluateLayoutDrop } from "./layoutRules.js";
import { isKeyUnlocked } from "./keyUnlocks.js";
import type { GameState, Key, LayoutSurface } from "./types.js";

type DragTarget = {
  surface: LayoutSurface;
  index: number;
};

export type LayoutDragDropAction = "move" | "swap" | "install" | "uninstall";

const isKeypadSurface = (
  surface: LayoutSurface,
): surface is "keypad" | "keypad_f" | "keypad_g" | "keypad_menu" | "keypad_f_prime" | "keypad_g_prime" =>
  surface === "keypad"
  || surface === "keypad_f"
  || surface === "keypad_g"
  || surface === "keypad_menu"
  || surface === "keypad_f_prime"
  || surface === "keypad_g_prime";

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
  if (surface === "keypad_menu") {
    return state.calculators?.menu?.ui.keyLayout ?? null;
  }
  if (surface === "keypad_f_prime") {
    return state.calculators?.f_prime?.ui.keyLayout ?? null;
  }
  if (surface === "keypad_g_prime") {
    return state.calculators?.g_prime?.ui.keyLayout ?? null;
  }
  return null;
};

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

