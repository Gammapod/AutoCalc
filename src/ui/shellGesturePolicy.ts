import type { GameState } from "../domain/types.js";
import type { SnapId } from "./shellModel.js";

export type MenuA11yState = {
  ariaHidden: "true" | "false";
  inert: boolean;
};

export const MENU_CLOSE_SWIPE_DISTANCE_PX = 96;

export const canStartTouchRearrange = (
  _state: GameState,
  pointerType: string,
  menuOpen: boolean,
  inputBlocked: boolean,
  _activeSnapId: SnapId,
): boolean => {
  if (pointerType !== "touch") {
    return false;
  }
  if (menuOpen) {
    return false;
  }
  if (inputBlocked) {
    return false;
  }
  return true;
};

export const getMenuA11yState = (menuOpen: boolean): MenuA11yState => ({
  ariaHidden: menuOpen ? "false" : "true",
  inert: !menuOpen,
});

export const shouldCloseMenuFromSwipe = (deltaX: number, deltaY: number): boolean => {
  if (deltaX < MENU_CLOSE_SWIPE_DISTANCE_PX) {
    return false;
  }
  return Math.abs(deltaX) >= Math.abs(deltaY);
};
