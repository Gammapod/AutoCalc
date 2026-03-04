import type { GameState } from "../../src/domain/types.js";

export type SnapId = "middle" | "bottom";
export type MenuModuleId = "checklist";

export type ShellViewModel = {
  availableSnaps: SnapId[];
  defaultSnap: SnapId;
  menuModules: MenuModuleId[];
};

const SNAP_ORDER: SnapId[] = ["middle", "bottom"];

export const snapOrder = (): readonly SnapId[] => SNAP_ORDER;

export const buildShellViewModel = (state: GameState): ShellViewModel => {
  const availableSnaps: SnapId[] = [];
  const storageVisible = state.unlocks.uiUnlocks.storageVisible;
  availableSnaps.push("middle");
  if (storageVisible) {
    availableSnaps.push("bottom");
  }

  return {
    availableSnaps,
    defaultSnap: "middle",
    menuModules: ["checklist"],
  };
};

export const isSnapAvailable = (viewModel: ShellViewModel, snapId: SnapId): boolean =>
  viewModel.availableSnaps.includes(snapId);

