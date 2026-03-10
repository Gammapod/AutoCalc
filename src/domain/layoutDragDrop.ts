import { evaluateLayoutDrop, type LayoutDropAction } from "./layoutRules.js";
import type { GameState, LayoutSurface } from "./types.js";

type DragTarget = {
  surface: LayoutSurface;
  index: number;
};

export const classifyDropAction = (
  state: GameState,
  source: DragTarget,
  destination: DragTarget,
): LayoutDropAction | null => {
  const decision = evaluateLayoutDrop(state, source, destination);
  return decision.allowed ? decision.action : null;
};

export const shouldStartDragFromDelta = (deltaX: number, deltaY: number, thresholdPx: number = 6): boolean =>
  deltaX * deltaX + deltaY * deltaY >= thresholdPx * thresholdPx;

