import type { GameState } from "../domain/types.js";

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
  const isMainMenuMode = Boolean(state.ui.buttonFlags["mode.main_menu"]);
  const storageContentVisible = state.ui.buttonFlags["mode.storage_content_visible"] ?? !isMainMenuMode;
  const availableSnaps: SnapId[] = [];
  availableSnaps.push("middle");
  if (state.unlocks.uiUnlocks.storageVisible || !storageContentVisible) {
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

