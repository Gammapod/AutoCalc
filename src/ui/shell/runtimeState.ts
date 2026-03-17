import type { Action, GameState } from "../../domain/types.js";
import type { DrawerDragTarget, PointerSession } from "./types.js";

export type ShellRuntimeState = {
  dragDeltaY: number;
  dragActive: boolean;
  drawerDragDeltaX: number;
  drawerDragActive: boolean;
  drawerDragTarget: DrawerDragTarget | null;
  latestState: GameState | null;
  latestDispatch: ((action: Action) => unknown) | null;
  latestInputBlocked: boolean;
  pointerSession: PointerSession | null;
};
