import type { DrawerDragTarget, PointerSession } from "./types.js";

export const createViewportPointerSession = (args: {
  pointerId: number;
  clientX: number;
  clientY: number;
  startedInRightEdgeZone: boolean;
  startedInStorage: boolean;
  preferredDrawerTarget: DrawerDragTarget;
}): PointerSession => ({
  pointerId: args.pointerId,
  startX: args.clientX,
  startY: args.clientY,
  lastX: args.clientX,
  lastY: args.clientY,
  lastTimeMs: performance.now(),
  axisLock: "none",
  startedInRightEdgeZone: args.startedInRightEdgeZone,
  startedInStorage: args.startedInStorage,
  preferredDrawerTarget: args.preferredDrawerTarget,
  startedInMenu: false,
});

export const createMenuPointerSession = (args: {
  pointerId: number;
  clientX: number;
  clientY: number;
}): PointerSession => ({
  pointerId: args.pointerId,
  startX: args.clientX,
  startY: args.clientY,
  lastX: args.clientX,
  lastY: args.clientY,
  lastTimeMs: performance.now(),
  axisLock: "none",
  startedInRightEdgeZone: false,
  startedInStorage: false,
  preferredDrawerTarget: "middle",
  startedInMenu: true,
});

export const updatePointerSessionTrail = (
  session: PointerSession,
  args: { clientX: number; clientY: number },
): void => {
  session.lastX = args.clientX;
  session.lastY = args.clientY;
  session.lastTimeMs = performance.now();
};
