import { buildShellViewModel, isSnapAvailable, snapOrder, type MenuModuleId, type ShellViewModel, type SnapId } from "./shellModel.js";
import type { GameState } from "../../src/domain/types.js";

type AxisLock = "none" | "x" | "y";

export type GestureSession = {
  active: boolean;
  axisLock: AxisLock;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  lastTimestampMs: number;
};

export type ShellRuntimeState = {
  activeSnapId: SnapId;
  menuOpen: boolean;
  menuActiveModule: MenuModuleId;
  gesture: GestureSession;
};

const snapRank = (snapId: SnapId): number => snapOrder().indexOf(snapId);

const nearestAvailableSnap = (target: SnapId, availableSnaps: SnapId[]): SnapId => {
  if (availableSnaps.length === 0) {
    return "middle";
  }
  if (availableSnaps.includes(target)) {
    return target;
  }

  const targetRank = snapRank(target);
  let best = availableSnaps[0];
  let bestDistance = Math.abs(snapRank(best) - targetRank);
  for (let index = 1; index < availableSnaps.length; index += 1) {
    const candidate = availableSnaps[index];
    const distance = Math.abs(snapRank(candidate) - targetRank);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
};

export const clampSnapToAvailable = (snapId: SnapId, viewModel: ShellViewModel): SnapId =>
  nearestAvailableSnap(snapId, viewModel.availableSnaps);

export const getAdjacentSnap = (activeSnapId: SnapId, viewModel: ShellViewModel, direction: "up" | "down"): SnapId | null => {
  const ordered = viewModel.availableSnaps;
  const currentIndex = ordered.indexOf(activeSnapId);
  if (currentIndex < 0) {
    return null;
  }
  const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (nextIndex < 0 || nextIndex >= ordered.length) {
    return null;
  }
  return ordered[nextIndex];
};

export const resolveSnapFromDrag = (
  activeSnapId: SnapId,
  viewModel: ShellViewModel,
  dragDeltaY: number,
  velocityY: number,
): SnapId => {
  const SNAP_DISTANCE_THRESHOLD_PX = 72;
  const SNAP_VELOCITY_THRESHOLD_PX_PER_MS = 0.55;
  const shouldMoveUp =
    dragDeltaY <= -SNAP_DISTANCE_THRESHOLD_PX || velocityY <= -SNAP_VELOCITY_THRESHOLD_PX_PER_MS;
  const shouldMoveDown =
    dragDeltaY >= SNAP_DISTANCE_THRESHOLD_PX || velocityY >= SNAP_VELOCITY_THRESHOLD_PX_PER_MS;

  if (shouldMoveUp) {
    return getAdjacentSnap(activeSnapId, viewModel, "up") ?? activeSnapId;
  }
  if (shouldMoveDown) {
    return getAdjacentSnap(activeSnapId, viewModel, "down") ?? activeSnapId;
  }
  return activeSnapId;
};

export const createInitialShellRuntimeState = (): ShellRuntimeState => ({
  activeSnapId: "middle",
  menuOpen: false,
  menuActiveModule: "allocator",
  gesture: {
    active: false,
    axisLock: "none",
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    lastTimestampMs: 0,
  },
});

export const createShellController = (initial: ShellRuntimeState = createInitialShellRuntimeState()) => {
  const runtime: ShellRuntimeState = initial;

  const sync = (state: GameState): ShellViewModel => {
    const model = buildShellViewModel(state);
    runtime.activeSnapId = clampSnapToAvailable(runtime.activeSnapId, model);
    if (!model.menuModules.includes(runtime.menuActiveModule)) {
      runtime.menuActiveModule = model.menuModules[0] ?? "allocator";
    }
    return model;
  };

  const moveSnap = (model: ShellViewModel, direction: "up" | "down"): SnapId => {
    const next = getAdjacentSnap(runtime.activeSnapId, model, direction);
    if (next) {
      runtime.activeSnapId = next;
    }
    return runtime.activeSnapId;
  };

  const setSnap = (model: ShellViewModel, snapId: SnapId): SnapId => {
    runtime.activeSnapId = clampSnapToAvailable(snapId, model);
    return runtime.activeSnapId;
  };

  const settleFromDrag = (model: ShellViewModel, dragDeltaY: number, velocityY: number): SnapId => {
    runtime.activeSnapId = resolveSnapFromDrag(runtime.activeSnapId, model, dragDeltaY, velocityY);
    return runtime.activeSnapId;
  };

  const setMenuOpen = (open: boolean): void => {
    runtime.menuOpen = open;
  };

  const toggleMenu = (): boolean => {
    runtime.menuOpen = !runtime.menuOpen;
    return runtime.menuOpen;
  };

  const setMenuModule = (moduleId: MenuModuleId): MenuModuleId => {
    runtime.menuActiveModule = moduleId;
    return runtime.menuActiveModule;
  };

  const canSnapUp = (model: ShellViewModel): boolean => getAdjacentSnap(runtime.activeSnapId, model, "up") !== null;

  const canSnapDown = (model: ShellViewModel): boolean => getAdjacentSnap(runtime.activeSnapId, model, "down") !== null;

  const isSnapAvailableForCurrentState = (model: ShellViewModel, snapId: SnapId): boolean => isSnapAvailable(model, snapId);

  return {
    runtime,
    sync,
    moveSnap,
    setSnap,
    settleFromDrag,
    setMenuOpen,
    toggleMenu,
    setMenuModule,
    canSnapUp,
    canSnapDown,
    isSnapAvailableForCurrentState,
  };
};

