import { canStartTouchRearrange, shouldCloseMenuFromSwipe } from "../shellGesturePolicy.js";
import { createShellController } from "../shellController.js";
import { createTouchRearrangeController, type TouchRearrangeSource, type TouchRearrangeTarget } from "../touchRearrangeController.js";
import type { Action, GameState, Key, LayoutSurface } from "../../domain/types.js";
import type { DrawerDragTarget, PointerSession, ShellRefs } from "./types.js";

type RuntimeState = {
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

const isSurfaceValue = (value: string | undefined): value is LayoutSurface => value === "keypad" || value === "storage";

const parseTargetFromElement = (element: HTMLElement | null): TouchRearrangeTarget | null => {
  if (!element) {
    return null;
  }
  const surfaceRaw = element.dataset.layoutSurface;
  const indexRaw = element.dataset.layoutIndex;
  if (!isSurfaceValue(surfaceRaw)) {
    return null;
  }
  const index = Number(indexRaw);
  if (!Number.isInteger(index) || index < 0) {
    return null;
  }
  return {
    surface: surfaceRaw,
    index,
  };
};

const readKeyAtSurfaceIndex = (state: GameState, surface: LayoutSurface, index: number): Key | null => {
  if (surface === "keypad") {
    const cell = state.ui.keyLayout[index];
    if (!cell || cell.kind !== "key") {
      return null;
    }
    return cell.key;
  }
  const cell = state.ui.storageLayout[index];
  return cell?.key ?? null;
};

const resolveTouchSourceFromEvent = (
  state: GameState,
  eventTarget: EventTarget | null,
): { source: TouchRearrangeSource; element: HTMLElement } | null => {
  const targetElement =
    eventTarget instanceof HTMLElement
      ? eventTarget
      : eventTarget instanceof Node
        ? eventTarget.parentElement
        : null;
  const sourceElement = targetElement?.closest<HTMLElement>("[data-layout-surface][data-layout-index][data-layout-occupied='key']") ?? null;
  if (!sourceElement) {
    return null;
  }
  const parsed = parseTargetFromElement(sourceElement);
  if (!parsed) {
    return null;
  }
  const key = readKeyAtSurfaceIndex(state, parsed.surface, parsed.index);
  if (!key) {
    return null;
  }
  return {
    source: {
      surface: parsed.surface,
      index: parsed.index,
      key,
    },
    element: sourceElement,
  };
};

const isStorageBoundaryDrag = (storageKeys: HTMLElement, deltaY: number): boolean => {
  if (storageKeys.scrollHeight <= storageKeys.clientHeight + 1) {
    return true;
  }
  const atTop = storageKeys.scrollTop <= 0;
  const atBottom = storageKeys.scrollTop + storageKeys.clientHeight >= storageKeys.scrollHeight - 1;
  if (deltaY > 0 && atTop) {
    return true;
  }
  if (deltaY < 0 && atBottom) {
    return true;
  }
  return false;
};

export const bindShellGestures = (args: {
  refs: ShellRefs;
  controller: ReturnType<typeof createShellController>;
  touchRearrange: ReturnType<typeof createTouchRearrangeController>;
  runtime: RuntimeState;
  closeMenu: (focusReturn?: boolean) => void;
  snapUp: () => void;
  snapDown: () => void;
  syncSnapAndUi: (refs: ShellRefs, state: GameState, includeTransition: boolean) => void;
  syncViewportTouchAction: (refs: ShellRefs) => void;
  clearPointerSession: (refs: ShellRefs) => void;
  applyMiddleDrawerTransform: (refs: ShellRefs, includeTransition: boolean) => void;
  applyBottomDrawerTransform: (refs: ShellRefs, includeTransition: boolean) => void;
  applyTrackTransform: (refs: ShellRefs, includeTransition: boolean) => void;
}): { dispose: () => void } => {
  const cleanupListeners: Array<() => void> = [];
  const listen = <T extends EventTarget>(
    target: T,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean,
  ): void => {
    target.addEventListener(type, listener, options);
    cleanupListeners.push(() => {
      target.removeEventListener(type, listener, options);
    });
  };

  const { refs, controller, touchRearrange, runtime } = args;

  const preventNativeTouchScrollWhenRearranging = (event: Event): void => {
    if (!touchRearrange.isPressing() && !touchRearrange.isCarrying()) {
      return;
    }
    event.preventDefault();
  };

  listen(refs.viewport, "touchmove", preventNativeTouchScrollWhenRearranging, { passive: false });
  listen(refs.storageKeys, "touchmove", preventNativeTouchScrollWhenRearranging, { passive: false });

  listen(refs.viewport, "pointerdown", (event) => {
    if (runtime.latestInputBlocked) {
      return;
    }
    const pointerEvent = event as PointerEvent;
    if (pointerEvent.pointerType === "mouse" && pointerEvent.button !== 0) {
      return;
    }
    if (touchRearrange.isCarrying()) {
      return;
    }
    if (controller.runtime.menuOpen) {
      args.closeMenu(false);
      return;
    }
    if (
      runtime.latestState &&
      canStartTouchRearrange(
        runtime.latestState,
        pointerEvent.pointerType,
        controller.runtime.menuOpen,
        runtime.latestInputBlocked,
        controller.runtime.activeSnapId,
      )
    ) {
      const resolved = resolveTouchSourceFromEvent(runtime.latestState, pointerEvent.target);
      if (resolved) {
        touchRearrange.startPress(pointerEvent.pointerId, pointerEvent.clientX, pointerEvent.clientY, resolved.source, resolved.element);
        args.syncViewportTouchAction(refs);
      }
    }
    const rect = refs.viewport.getBoundingClientRect();
    const localX = pointerEvent.clientX - rect.left;
    const localY = pointerEvent.clientY - rect.top;
    const startedInRightEdgeZone = localX >= rect.width - 24;
    const preferredDrawerTarget: DrawerDragTarget = localY <= rect.height / 2 ? "middle" : "bottom";
    const target = pointerEvent.target as HTMLElement | null;
    runtime.pointerSession = {
      pointerId: pointerEvent.pointerId,
      startX: pointerEvent.clientX,
      startY: pointerEvent.clientY,
      lastX: pointerEvent.clientX,
      lastY: pointerEvent.clientY,
      lastTimeMs: performance.now(),
      axisLock: "none",
      startedInRightEdgeZone,
      startedInStorage: !!target?.closest("[data-storage-keys]"),
      startedInChecklist: !!target?.closest("[data-v2-drawer-panel='checklist']"),
      preferredDrawerTarget,
      startedInMenu: false,
    };
    refs.viewport.setPointerCapture(pointerEvent.pointerId);
  });

  listen(refs.viewport, "pointermove", (event) => {
    const pointerEvent = event as PointerEvent;
    if (!runtime.pointerSession || pointerEvent.pointerId !== runtime.pointerSession.pointerId) {
      return;
    }
    if (runtime.latestInputBlocked) {
      args.clearPointerSession(refs);
      return;
    }
    if (runtime.latestState && runtime.latestDispatch) {
      touchRearrange.syncContext(runtime.latestState, runtime.latestDispatch);
    }
    touchRearrange.move(pointerEvent.pointerId, pointerEvent.clientX, pointerEvent.clientY, (x, y) => {
      const hovered = document.elementFromPoint(x, y) as HTMLElement | null;
      const targetElement = hovered?.closest<HTMLElement>("[data-layout-surface][data-layout-index]") ?? null;
      return {
        target: parseTargetFromElement(targetElement),
        targetElement,
      };
    });
    if (touchRearrange.isCarrying()) {
      args.syncViewportTouchAction(refs);
      pointerEvent.preventDefault();
      return;
    }

    const dx = pointerEvent.clientX - runtime.pointerSession.startX;
    const dy = pointerEvent.clientY - runtime.pointerSession.startY;
    if (runtime.pointerSession.axisLock === "none" && (Math.abs(dx) >= 8 || Math.abs(dy) >= 8)) {
      runtime.pointerSession.axisLock = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }

    if (touchRearrange.isPressing()) {
      const canOverrideWithDrawerSwipe = runtime.pointerSession.axisLock === "x" && !runtime.pointerSession.startedInRightEdgeZone;
      if (canOverrideWithDrawerSwipe) {
        touchRearrange.cancel();
        args.syncViewportTouchAction(refs);
      } else {
        args.syncViewportTouchAction(refs);
        pointerEvent.preventDefault();
        return;
      }
    }

    if (controller.runtime.menuOpen && runtime.pointerSession.axisLock === "x" && shouldCloseMenuFromSwipe(dx, dy)) {
      args.closeMenu();
      args.clearPointerSession(refs);
      return;
    }

    if (
      runtime.pointerSession.axisLock === "x" &&
      !runtime.pointerSession.startedInRightEdgeZone
    ) {
      runtime.drawerDragActive = true;
      runtime.drawerDragDeltaX = dx;
      runtime.drawerDragTarget = runtime.pointerSession.preferredDrawerTarget;
      runtime.pointerSession.lastX = pointerEvent.clientX;
      runtime.pointerSession.lastY = pointerEvent.clientY;
      runtime.pointerSession.lastTimeMs = performance.now();
      pointerEvent.preventDefault();
      if (runtime.drawerDragTarget === "middle") {
        args.applyMiddleDrawerTransform(refs, false);
      } else {
        args.applyBottomDrawerTransform(refs, false);
      }
      return;
    }

    if (runtime.pointerSession.axisLock !== "y") {
      runtime.pointerSession.lastX = pointerEvent.clientX;
      runtime.pointerSession.lastY = pointerEvent.clientY;
      runtime.pointerSession.lastTimeMs = performance.now();
      return;
    }

    if (runtime.pointerSession.startedInStorage && !isStorageBoundaryDrag(refs.storageKeys, dy)) {
      runtime.pointerSession.lastX = pointerEvent.clientX;
      runtime.pointerSession.lastY = pointerEvent.clientY;
      runtime.pointerSession.lastTimeMs = performance.now();
      return;
    }

    runtime.dragActive = true;
    runtime.dragDeltaY = dy;
    runtime.pointerSession.lastX = pointerEvent.clientX;
    runtime.pointerSession.lastY = pointerEvent.clientY;
    runtime.pointerSession.lastTimeMs = performance.now();
    pointerEvent.preventDefault();
    args.applyTrackTransform(refs, false);
  });

  listen(refs.viewport, "pointerup", (event) => {
    const pointerEvent = event as PointerEvent;
    if (!runtime.pointerSession || pointerEvent.pointerId !== runtime.pointerSession.pointerId) {
      return;
    }
    const rearrangeResult = touchRearrange.end(pointerEvent.pointerId);
    if (rearrangeResult !== "noop") {
      const stateAfter = runtime.latestState;
      args.clearPointerSession(refs);
      if (stateAfter) {
        args.syncSnapAndUi(refs, stateAfter, true);
      }
      return;
    }
    const state = runtime.latestState;
    if (!state) {
      args.clearPointerSession(refs);
      return;
    }
    const now = performance.now();
    const elapsed = Math.max(1, now - runtime.pointerSession.lastTimeMs);
    const velocityX = (pointerEvent.clientX - runtime.pointerSession.lastX) / elapsed;
    const velocityY = (pointerEvent.clientY - runtime.pointerSession.lastY) / elapsed;
    if (runtime.dragActive) {
      const model = controller.sync(state);
      controller.settleFromDrag(model, runtime.dragDeltaY, velocityY);
    }
    if (runtime.drawerDragActive && runtime.drawerDragTarget === "middle") {
      controller.settleMiddlePanelFromDrag(runtime.drawerDragDeltaX, velocityX);
    }
    if (runtime.drawerDragActive && runtime.drawerDragTarget === "bottom") {
      controller.settleBottomPanelFromDrag(runtime.drawerDragDeltaX, velocityX);
    }
    args.clearPointerSession(refs);
    args.syncSnapAndUi(refs, state, true);
  });

  listen(refs.viewport, "pointercancel", (event) => {
    const pointerEvent = event as PointerEvent;
    if (!runtime.pointerSession || pointerEvent.pointerId !== runtime.pointerSession.pointerId) {
      return;
    }
    touchRearrange.cancel();
    const state = runtime.latestState;
    args.clearPointerSession(refs);
    if (state) {
      args.syncSnapAndUi(refs, state, true);
    }
  });

  listen(
    refs.viewport,
    "click",
    (event) => {
      if (!touchRearrange.shouldSuppressClick()) {
        return;
      }
      const target = (event as MouseEvent).target as HTMLElement | null;
      if (!target?.closest("[data-layout-surface][data-layout-index]")) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );

  listen(refs.viewport, "selectstart", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest(".key")) {
      return;
    }
    event.preventDefault();
  });

  listen(refs.viewport, "contextmenu", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest(".key")) {
      return;
    }
    event.preventDefault();
  });

  listen(refs.menu, "pointerdown", (event) => {
    if (runtime.latestInputBlocked) {
      return;
    }
    const pointerEvent = event as PointerEvent;
    if (pointerEvent.pointerType === "mouse" && pointerEvent.button !== 0) {
      return;
    }
    if (touchRearrange.isCarrying()) {
      return;
    }
    if (!controller.runtime.menuOpen) {
      return;
    }
    runtime.pointerSession = {
      pointerId: pointerEvent.pointerId,
      startX: pointerEvent.clientX,
      startY: pointerEvent.clientY,
      lastX: pointerEvent.clientX,
      lastY: pointerEvent.clientY,
      lastTimeMs: performance.now(),
      axisLock: "none",
      startedInRightEdgeZone: false,
      startedInStorage: false,
      startedInChecklist: false,
      preferredDrawerTarget: "middle",
      startedInMenu: true,
    };
    refs.menu.setPointerCapture(pointerEvent.pointerId);
  });

  listen(refs.menu, "pointermove", (event) => {
    const pointerEvent = event as PointerEvent;
    if (!runtime.pointerSession || pointerEvent.pointerId !== runtime.pointerSession.pointerId || !runtime.pointerSession.startedInMenu) {
      return;
    }
    const dx = pointerEvent.clientX - runtime.pointerSession.startX;
    const dy = pointerEvent.clientY - runtime.pointerSession.startY;
    if (runtime.pointerSession.axisLock === "none" && (Math.abs(dx) >= 8 || Math.abs(dy) >= 8)) {
      runtime.pointerSession.axisLock = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (runtime.pointerSession.axisLock === "x" && shouldCloseMenuFromSwipe(dx, dy)) {
      args.closeMenu();
      args.clearPointerSession(refs);
      return;
    }
    runtime.pointerSession.lastX = pointerEvent.clientX;
    runtime.pointerSession.lastY = pointerEvent.clientY;
    runtime.pointerSession.lastTimeMs = performance.now();
  });

  listen(refs.menu, "pointerup", (event) => {
    const pointerEvent = event as PointerEvent;
    if (!runtime.pointerSession || pointerEvent.pointerId !== runtime.pointerSession.pointerId || !runtime.pointerSession.startedInMenu) {
      return;
    }
    args.clearPointerSession(refs);
  });

  listen(refs.controlsUp, "click", () => {
    args.snapUp();
  });

  listen(refs.controlsDown, "click", () => {
    args.snapDown();
  });

  listen(refs.controlsMenu, "click", () => {
    if (runtime.latestInputBlocked || touchRearrange.isGestureBlocked()) {
      return;
    }
    const state = runtime.latestState;
    if (!state) {
      return;
    }
    if (controller.runtime.activeSnapId === "middle") {
      controller.setMiddlePanel("calculator");
      args.syncSnapAndUi(refs, state, true);
      return;
    }
    const next =
      controller.runtime.activeBottomPanelId === "storage"
        ? "checklist"
        : "storage";
    controller.setBottomPanel(next);
    args.syncSnapAndUi(refs, state, true);
  });

  listen(refs.menuNavChecklist, "click", () => {
    controller.setMenuModule("checklist");
    const state = runtime.latestState;
    if (state) {
      args.syncSnapAndUi(refs, state, false);
    }
  });

  listen(window, "keydown", (event) => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === "Escape") {
      args.closeMenu(true);
    }
  });

  return {
    dispose: () => {
      for (const cleanup of cleanupListeners.splice(0)) {
        cleanup();
      }
    },
  };
};
