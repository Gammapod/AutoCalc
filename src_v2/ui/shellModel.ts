import { GRAPH_VISIBLE_FLAG } from "../../src/domain/state.js";
import type { GameState } from "../../src/domain/types.js";

export type SnapId = "top" | "middle" | "bottom";
export type MenuModuleId = "allocator" | "checklist";

export type ShellViewModel = {
  availableSnaps: SnapId[];
  defaultSnap: SnapId;
  menuModules: MenuModuleId[];
};

const SNAP_ORDER: SnapId[] = ["top", "middle", "bottom"];

export const snapOrder = (): readonly SnapId[] => SNAP_ORDER;

export const buildShellViewModel = (state: GameState): ShellViewModel => {
  const availableSnaps: SnapId[] = [];
  const graphVisible = Boolean(state.ui.buttonFlags[GRAPH_VISIBLE_FLAG]);
  const storageVisible = state.unlocks.uiUnlocks.storageVisible;
  if (graphVisible) {
    availableSnaps.push("top");
  }
  availableSnaps.push("middle");
  if (storageVisible) {
    availableSnaps.push("bottom");
  }

  return {
    availableSnaps,
    defaultSnap: "middle",
    menuModules: ["allocator", "checklist"],
  };
};

export const isSnapAvailable = (viewModel: ShellViewModel, snapId: SnapId): boolean =>
  viewModel.availableSnaps.includes(snapId);

