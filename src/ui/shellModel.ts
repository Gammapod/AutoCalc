import type { GameState } from "../domain/types.js";
import type { InteractionMode } from "../app/interactionRuntime.js";

export type SnapId = "middle" | "bottom";
export type MenuModuleId = "checklist";

export type ShellViewModel = {
  availableSnaps: SnapId[];
  defaultSnap: SnapId;
  menuModules: MenuModuleId[];
};

const SNAP_ORDER: SnapId[] = ["middle", "bottom"];

export const snapOrder = (): readonly SnapId[] => SNAP_ORDER;

export const buildShellViewModel = (state: GameState, interactionMode: InteractionMode = "calculator"): ShellViewModel => {
  const availableSnaps: SnapId[] = [];
  availableSnaps.push("middle");
  if (interactionMode === "modify") {
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

