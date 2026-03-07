import type { Action, GameState, Key, LayoutSurface } from "../domain/types.js";
import type { InteractionMode } from "../app/interactionRuntime.js";
import { createShellController } from "./shellController.js";
import type { SnapId } from "./shellModel.js";
import { createTouchRearrangeController, type TouchRearrangeSource, type TouchRearrangeTarget } from "./touchRearrangeController.js";
import { renderChecklistV2Module } from "./modules/checklistRenderer.js";
import { renderCalculatorStorageV2Module } from "./modules/calculatorStorageRenderer.js";
import { clearVisualizerHost, renderVisualizerHost } from "./modules/visualizerHost.js";

export type ShellRenderer = {
  render: (state: GameState, dispatch: (action: Action) => unknown, options?: ShellRenderOptions) => void;
  forceActiveView: (options: {
    snapId?: SnapId;
    middlePanelId?: "calculator";
    bottomPanelId?: "storage" | "checklist";
    includeTransition?: boolean;
  }) => void;
  playTransitionCue: (target: "calculator" | "storage") => Promise<void>;
  dispose: () => void;
  resetForTests: () => void;
};

export type ShellRenderOptions = {
  interactionMode?: InteractionMode;
  inputBlocked?: boolean;
};

type ShellRefs = {
  shell: HTMLElement;
  main: HTMLElement;
  viewport: HTMLElement;
  track: HTMLElement;
  sectionCalc: HTMLElement;
  sectionStorage: HTMLElement;
  middleDrawerViewport: HTMLElement;
  middleDrawerTrack: HTMLElement;
  middleDrawerPanelCalculator: HTMLElement;
  middleDrawerPanelChecklist: HTMLElement;
  bottomDrawerViewport: HTMLElement;
  bottomDrawerTrack: HTMLElement;
  bottomDrawerPanelStorage: HTMLElement;
  bottomDrawerPanelChecklist: HTMLElement;
  controlsUp: HTMLButtonElement;
  controlsDown: HTMLButtonElement;
  controlsMenu: HTMLButtonElement;
  menu: HTMLElement;
  menuNavChecklist: HTMLButtonElement;
  menuPanelChecklist: HTMLElement;
  calcDevice: HTMLElement;
  keys: HTMLElement;
  storageKeys: HTMLElement;
};

type PointerSession = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  lastTimeMs: number;
  axisLock: "none" | "x" | "y";
  startedInRightEdgeZone: boolean;
  startedInStorage: boolean;
  startedInChecklist: boolean;
  preferredDrawerTarget: DrawerDragTarget;
  startedInMenu: boolean;
};

type MenuA11yState = {
  ariaHidden: "true" | "false";
  inert: boolean;
};

const MENU_CLOSE_SWIPE_DISTANCE_PX = 96;
const MENU_OPEN_SWIPE_DISTANCE_PX = 28;
type DrawerDragTarget = "middle" | "bottom";

const rendererCache = new WeakMap<Element, ShellRenderer>();
const rendererRegistry = new Set<ShellRenderer>();

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

const getOffsetInTrack = (target: HTMLElement, track: HTMLElement): number => {
  const targetRect = target.getBoundingClientRect();
  const trackRect = track.getBoundingClientRect();
  return targetRect.top - trackRect.top;
};

const getSnapOffset = (snapId: SnapId, refs: ShellRefs): number => {
  if (snapId === "middle") {
    return getOffsetInTrack(refs.sectionCalc, refs.track);
  }
  return getOffsetInTrack(refs.keys, refs.track);
};

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

const createMenuModuleButton = (label: string): HTMLButtonElement => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "v2-menu-nav-button";
  button.textContent = label;
  return button;
};

export const createShellRenderer = (root: Element): ShellRenderer => {
  const controller = createShellController();
  const touchRearrange = createTouchRearrangeController();

  let refsCache: ShellRefs | null = null;
  let dragDeltaY = 0;
  let dragActive = false;
  let drawerDragDeltaX = 0;
  let drawerDragActive = false;
  let drawerDragTarget: DrawerDragTarget | null = null;
  let latestState: GameState | null = null;
  let latestDispatch: ((action: Action) => unknown) | null = null;
  let latestInteractionMode: InteractionMode = "calculator";
  let latestInputBlocked = false;
  let pointerSession: PointerSession | null = null;
  let returnFocusEl: HTMLElement | null = null;
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

  const clearPointerSession = (refs: ShellRefs): void => {
    if (pointerSession) {
      try {
        refs.viewport.releasePointerCapture(pointerSession.pointerId);
      } catch {
        // Ignore release errors when capture was never acquired on viewport.
      }
      try {
        refs.menu.releasePointerCapture(pointerSession.pointerId);
      } catch {
        // Ignore release errors when capture was never acquired on menu.
      }
    }
    pointerSession = null;
    dragActive = false;
    dragDeltaY = 0;
    drawerDragActive = false;
    drawerDragDeltaX = 0;
    drawerDragTarget = null;
    applyMiddleDrawerTransform(refs, true);
    applyBottomDrawerTransform(refs, true);
  };

  const applyTrackTransform = (refs: ShellRefs, includeTransition: boolean): void => {
    const baseOffset = getSnapOffset(controller.runtime.activeSnapId, refs);
    const translateY = -baseOffset + dragDeltaY;
    refs.track.style.transition = includeTransition ? "transform 220ms cubic-bezier(0.2, 0.7, 0.1, 1)" : "none";
    refs.track.style.transform = `translate3d(0, ${translateY.toString()}px, 0)`;
  };

  const getDrawerStride = (firstPanel: HTMLElement, secondPanel: HTMLElement): number => {
    const firstRect = firstPanel.getBoundingClientRect();
    const secondRect = secondPanel.getBoundingClientRect();
    const measured = Math.abs(secondRect.left - firstRect.left);
    if (measured > 0) {
      return measured;
    }
    return Math.max(1, firstPanel.clientWidth);
  };

  const getDrawerLeadInset = (viewport: HTMLElement, panel: HTMLElement): number =>
    Math.max(0, (viewport.clientWidth - panel.clientWidth) / 2);

  const getMiddleDrawerOffset = (refs: ShellRefs): number =>
    (() => {
      const inset = getDrawerLeadInset(refs.middleDrawerViewport, refs.middleDrawerPanelCalculator);
      return -inset;
    })();

  const applyMiddleDrawerTransform = (refs: ShellRefs, includeTransition: boolean): void => {
    const activeDeltaX = drawerDragActive && drawerDragTarget === "middle" ? drawerDragDeltaX : 0;
    const baseOffset = getMiddleDrawerOffset(refs);
    const translateX = -baseOffset + activeDeltaX;
    refs.middleDrawerTrack.style.transition = includeTransition ? "transform 220ms cubic-bezier(0.2, 0.7, 0.1, 1)" : "none";
    refs.middleDrawerTrack.style.transform = `translate3d(${translateX.toString()}px, 0, 0)`;
    refs.middleDrawerPanelCalculator.setAttribute(
      "aria-hidden",
      controller.runtime.activeMiddlePanelId === "calculator" ? "false" : "true",
    );
    refs.middleDrawerPanelChecklist.setAttribute("aria-hidden", "true");
  };

  const getBottomDrawerOffset = (refs: ShellRefs): number =>
    (() => {
      const activePanel =
        controller.runtime.activeBottomPanelId === "checklist"
          ? refs.bottomDrawerPanelChecklist
          : refs.bottomDrawerPanelStorage;
      const activeRect = activePanel.getBoundingClientRect();
      const baseRect = refs.bottomDrawerPanelStorage.getBoundingClientRect();
      const inset = getDrawerLeadInset(refs.bottomDrawerViewport, refs.bottomDrawerPanelStorage);
      const offset = Math.max(0, activeRect.left - baseRect.left);
      return offset - inset;
    })();

  const applyBottomDrawerTransform = (refs: ShellRefs, includeTransition: boolean): void => {
    const activeDeltaX = drawerDragActive && drawerDragTarget === "bottom" ? drawerDragDeltaX : 0;
    const baseOffset = getBottomDrawerOffset(refs);
    const translateX = -baseOffset + activeDeltaX;
    refs.bottomDrawerTrack.style.transition = includeTransition ? "transform 220ms cubic-bezier(0.2, 0.7, 0.1, 1)" : "none";
    refs.bottomDrawerTrack.style.transform = `translate3d(${translateX.toString()}px, 0, 0)`;
    refs.bottomDrawerPanelStorage.setAttribute(
      "aria-hidden",
      controller.runtime.activeBottomPanelId === "storage" ? "false" : "true",
    );
    refs.bottomDrawerPanelChecklist.setAttribute(
      "aria-hidden",
      controller.runtime.activeBottomPanelId === "checklist" ? "false" : "true",
    );
  };

  const setMenuModuleClass = (refs: ShellRefs): void => {
    const active = controller.runtime.menuActiveModule;
    refs.menuNavChecklist.setAttribute("aria-pressed", active === "checklist" ? "true" : "false");
    refs.menuPanelChecklist.hidden = active !== "checklist";
  };

  const applyMenuA11yState = (refs: ShellRefs): void => {
    const menuOpen = controller.runtime.menuOpen;
    refs.menu.setAttribute("data-v2-menu-open", menuOpen ? "true" : "false");
    const a11y = getMenuA11yState(menuOpen);
    refs.menu.setAttribute("aria-hidden", a11y.ariaHidden);
    if (a11y.inert) {
      refs.menu.setAttribute("inert", "");
    } else {
      refs.menu.removeAttribute("inert");
    }
    refs.controlsMenu.setAttribute("aria-expanded", menuOpen ? "true" : "false");
  };

  const syncControlDisabledState = (refs: ShellRefs, state: GameState): void => {
    const model = controller.sync(state, latestInteractionMode);
    const gesturesBlocked = touchRearrange.isGestureBlocked() || latestInputBlocked;
    refs.controlsUp.disabled = gesturesBlocked || !controller.canSnapUp(model);
    refs.controlsDown.disabled = gesturesBlocked || !controller.canSnapDown(model);
    refs.controlsMenu.disabled = gesturesBlocked;
  };

  const syncViewportTouchAction = (refs: ShellRefs): void => {
    const lock = latestInputBlocked || touchRearrange.isCarrying() || touchRearrange.isPressing();
    refs.viewport.style.touchAction = lock ? "none" : "pan-y";
    refs.keys.style.touchAction = lock ? "none" : "manipulation";
    refs.storageKeys.style.touchAction = lock ? "none" : "pan-y";
  };

  const syncSnapAndUi = (refs: ShellRefs, state: GameState, includeTransition: boolean): void => {
    refs.shell.dataset.v2InteractionMode = latestInteractionMode;
    refs.shell.dataset.v2InputBlocked = latestInputBlocked ? "true" : "false";
    syncControlDisabledState(refs, state);
    setMenuModuleClass(refs);
    applyMenuA11yState(refs);
    syncViewportTouchAction(refs);
    applyTrackTransform(refs, includeTransition);
    applyMiddleDrawerTransform(refs, includeTransition);
    applyBottomDrawerTransform(refs, includeTransition);
  };

  const focusMenuTarget = (refs: ShellRefs): void => {
    refs.menuNavChecklist.focus();
  };

  const restoreFocus = (refs: ShellRefs): void => {
    const target = returnFocusEl ?? refs.controlsMenu;
    returnFocusEl = null;
    target.focus();
  };

  const closeMenu = (focusReturn: boolean = true): void => {
    const refs = refsCache;
    const state = latestState;
    if (!refs || !state) {
      return;
    }
    controller.setMenuOpen(false);
    syncSnapAndUi(refs, state, true);
    if (focusReturn) {
      restoreFocus(refs);
    }
  };

  const openMenu = (triggerEl?: HTMLElement | null): void => {
    if (latestInputBlocked || touchRearrange.isGestureBlocked()) {
      return;
    }
    const refs = refsCache;
    const state = latestState;
    if (!refs || !state) {
      return;
    }
    returnFocusEl = triggerEl ?? (document.activeElement instanceof HTMLElement ? document.activeElement : refs.controlsMenu);
    controller.setMenuOpen(true);
    syncSnapAndUi(refs, state, true);
    focusMenuTarget(refs);
  };

  const snapUp = (): void => {
    if (latestInputBlocked || touchRearrange.isGestureBlocked()) {
      return;
    }
    const refs = refsCache;
    const state = latestState;
    if (!refs || !state) {
      return;
    }
    const model = controller.sync(state, latestInteractionMode);
    controller.moveSnap(model, "up");
    syncSnapAndUi(refs, state, true);
  };

  const snapDown = (): void => {
    if (latestInputBlocked || touchRearrange.isGestureBlocked()) {
      return;
    }
    const refs = refsCache;
    const state = latestState;
    if (!refs || !state) {
      return;
    }
    const model = controller.sync(state, latestInteractionMode);
    controller.moveSnap(model, "down");
    syncSnapAndUi(refs, state, true);
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

  const bindGestures = (refs: ShellRefs): void => {
    const preventNativeTouchScrollWhenRearranging = (event: Event): void => {
      if (!touchRearrange.isPressing() && !touchRearrange.isCarrying()) {
        return;
      }
      event.preventDefault();
    };

    listen(refs.viewport, "touchmove", preventNativeTouchScrollWhenRearranging, { passive: false });
    listen(refs.storageKeys, "touchmove", preventNativeTouchScrollWhenRearranging, { passive: false });

    listen(refs.viewport, "pointerdown", (event) => {
      if (latestInputBlocked) {
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
        closeMenu(false);
        return;
      }
      if (
        latestState &&
        canStartTouchRearrange(
          latestState,
          pointerEvent.pointerType,
          controller.runtime.menuOpen,
          latestInputBlocked,
          controller.runtime.activeSnapId,
        )
      ) {
        const resolved = resolveTouchSourceFromEvent(latestState, pointerEvent.target);
        if (resolved) {
          if (latestInteractionMode === "calculator" && resolved.source.surface === "storage") {
            return;
          }
          touchRearrange.startPress(pointerEvent.pointerId, pointerEvent.clientX, pointerEvent.clientY, resolved.source, resolved.element);
          syncViewportTouchAction(refs);
        }
      }
      const rect = refs.viewport.getBoundingClientRect();
      const localX = pointerEvent.clientX - rect.left;
      const localY = pointerEvent.clientY - rect.top;
      const startedInRightEdgeZone = localX >= rect.width - 24;
      const preferredDrawerTarget: DrawerDragTarget = localY <= rect.height / 2 ? "middle" : "bottom";
      const target = pointerEvent.target as HTMLElement | null;
      pointerSession = {
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
      if (!pointerSession || pointerEvent.pointerId !== pointerSession.pointerId) {
        return;
      }
      if (latestInputBlocked) {
        clearPointerSession(refs);
        return;
      }
      if (latestState && latestDispatch) {
        touchRearrange.syncContext(latestState, latestDispatch, latestInteractionMode);
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
        syncViewportTouchAction(refs);
        pointerEvent.preventDefault();
        return;
      }

      const dx = pointerEvent.clientX - pointerSession.startX;
      const dy = pointerEvent.clientY - pointerSession.startY;
      if (pointerSession.axisLock === "none" && (Math.abs(dx) >= 8 || Math.abs(dy) >= 8)) {
        pointerSession.axisLock = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }

      if (touchRearrange.isPressing()) {
        const canOverrideWithDrawerSwipe = pointerSession.axisLock === "x" && !pointerSession.startedInRightEdgeZone;
        if (canOverrideWithDrawerSwipe) {
          touchRearrange.cancel();
          syncViewportTouchAction(refs);
        } else {
          syncViewportTouchAction(refs);
          pointerEvent.preventDefault();
          return;
        }
      }

      if (controller.runtime.menuOpen && pointerSession.axisLock === "x" && shouldCloseMenuFromSwipe(dx, dy)) {
        closeMenu();
        clearPointerSession(refs);
        return;
      }

      if (
        pointerSession.axisLock === "x" &&
        !pointerSession.startedInRightEdgeZone
      ) {
        drawerDragActive = true;
        drawerDragDeltaX = dx;
        drawerDragTarget = pointerSession.preferredDrawerTarget;
        pointerSession.lastX = pointerEvent.clientX;
        pointerSession.lastY = pointerEvent.clientY;
        pointerSession.lastTimeMs = performance.now();
        pointerEvent.preventDefault();
        if (drawerDragTarget === "middle") {
          applyMiddleDrawerTransform(refs, false);
        } else {
          applyBottomDrawerTransform(refs, false);
        }
        return;
      }

      if (pointerSession.axisLock !== "y") {
        pointerSession.lastX = pointerEvent.clientX;
        pointerSession.lastY = pointerEvent.clientY;
        pointerSession.lastTimeMs = performance.now();
        return;
      }

      if (pointerSession.startedInStorage && !isStorageBoundaryDrag(refs.storageKeys, dy)) {
        pointerSession.lastX = pointerEvent.clientX;
        pointerSession.lastY = pointerEvent.clientY;
        pointerSession.lastTimeMs = performance.now();
        return;
      }

      dragActive = true;
      dragDeltaY = dy;
      pointerSession.lastX = pointerEvent.clientX;
      pointerSession.lastY = pointerEvent.clientY;
      pointerSession.lastTimeMs = performance.now();
      pointerEvent.preventDefault();
      applyTrackTransform(refs, false);
    });

    listen(refs.viewport, "pointerup", (event) => {
      const pointerEvent = event as PointerEvent;
      if (!pointerSession || pointerEvent.pointerId !== pointerSession.pointerId) {
        return;
      }
      const rearrangeResult = touchRearrange.end(pointerEvent.pointerId);
      if (rearrangeResult !== "noop") {
        const stateAfter = latestState;
        clearPointerSession(refs);
        if (stateAfter) {
          syncSnapAndUi(refs, stateAfter, true);
        }
        return;
      }
      const state = latestState;
      if (!state) {
        clearPointerSession(refs);
        return;
      }
      const now = performance.now();
      const elapsed = Math.max(1, now - pointerSession.lastTimeMs);
      const velocityX = (pointerEvent.clientX - pointerSession.lastX) / elapsed;
      const velocityY = (pointerEvent.clientY - pointerSession.lastY) / elapsed;
      if (dragActive) {
        const model = controller.sync(state, latestInteractionMode);
        controller.settleFromDrag(model, dragDeltaY, velocityY);
      }
      if (drawerDragActive && drawerDragTarget === "middle") {
        controller.settleMiddlePanelFromDrag(drawerDragDeltaX, velocityX);
      }
      if (drawerDragActive && drawerDragTarget === "bottom") {
        controller.settleBottomPanelFromDrag(drawerDragDeltaX, velocityX);
      }
      clearPointerSession(refs);
      syncSnapAndUi(refs, state, true);
    });

    listen(refs.viewport, "pointercancel", (event) => {
      const pointerEvent = event as PointerEvent;
      if (!pointerSession || pointerEvent.pointerId !== pointerSession.pointerId) {
        return;
      }
      touchRearrange.cancel();
      const state = latestState;
      clearPointerSession(refs);
      if (state) {
        syncSnapAndUi(refs, state, true);
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
      if (latestInputBlocked) {
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
      pointerSession = {
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
      if (!pointerSession || pointerEvent.pointerId !== pointerSession.pointerId || !pointerSession.startedInMenu) {
        return;
      }
      const dx = pointerEvent.clientX - pointerSession.startX;
      const dy = pointerEvent.clientY - pointerSession.startY;
      if (pointerSession.axisLock === "none" && (Math.abs(dx) >= 8 || Math.abs(dy) >= 8)) {
        pointerSession.axisLock = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      if (pointerSession.axisLock === "x" && shouldCloseMenuFromSwipe(dx, dy)) {
        closeMenu();
        clearPointerSession(refs);
        return;
      }
      pointerSession.lastX = pointerEvent.clientX;
      pointerSession.lastY = pointerEvent.clientY;
      pointerSession.lastTimeMs = performance.now();
    });

    listen(refs.menu, "pointerup", (event) => {
      const pointerEvent = event as PointerEvent;
      if (!pointerSession || pointerEvent.pointerId !== pointerSession.pointerId || !pointerSession.startedInMenu) {
        return;
      }
      clearPointerSession(refs);
    });

    listen(refs.controlsUp, "click", () => {
      snapUp();
    });

    listen(refs.controlsDown, "click", () => {
      snapDown();
    });

    listen(refs.controlsMenu, "click", () => {
      if (latestInputBlocked || touchRearrange.isGestureBlocked()) {
        return;
      }
      const state = latestState;
      if (!state) {
        return;
      }
      if (controller.runtime.activeSnapId === "middle") {
        controller.setMiddlePanel("calculator");
        syncSnapAndUi(refs, state, true);
        return;
      }
      const next =
        controller.runtime.activeBottomPanelId === "storage"
          ? "checklist"
          : "storage";
      controller.setBottomPanel(next);
      syncSnapAndUi(refs, state, true);
    });

    listen(refs.menuNavChecklist, "click", () => {
      controller.setMenuModule("checklist");
      const state = latestState;
      if (state) {
        syncSnapAndUi(refs, state, false);
      }
    });

    listen(window, "keydown", (event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === "Escape") {
        closeMenu(true);
      }
    });
  };

  const buildRefsFromExistingShell = (): ShellRefs | null => {
    const shell = root.querySelector<HTMLElement>("[data-v2-shell-root='true']");
    if (!shell) {
      return null;
    }
    const main = shell.querySelector<HTMLElement>("[data-v2-main='true']");
    const viewport = shell.querySelector<HTMLElement>("[data-v2-viewport='true']");
    const track = shell.querySelector<HTMLElement>("[data-v2-track='true']");
    const sectionCalc = shell.querySelector<HTMLElement>("[data-v2-section='calc']");
    const sectionStorage = shell.querySelector<HTMLElement>("[data-v2-section='storage']");
    const middleDrawerViewport = shell.querySelector<HTMLElement>("[data-v2-middle-drawer-viewport='true']");
    const middleDrawerTrack = shell.querySelector<HTMLElement>("[data-v2-middle-drawer-track='true']");
    const middleDrawerPanelCalculator = shell.querySelector<HTMLElement>("[data-v2-middle-panel='calculator']");
    const middleDrawerPanelChecklist = shell.querySelector<HTMLElement>("[data-v2-middle-panel='checklist']");
    const bottomDrawerViewport = shell.querySelector<HTMLElement>("[data-v2-bottom-drawer-viewport='true']");
    const bottomDrawerTrack = shell.querySelector<HTMLElement>("[data-v2-bottom-drawer-track='true']");
    const bottomDrawerPanelStorage = shell.querySelector<HTMLElement>("[data-v2-drawer-panel='storage']");
    const bottomDrawerPanelChecklist = shell.querySelector<HTMLElement>("[data-v2-drawer-panel='checklist']");
    const controlsUp = shell.querySelector<HTMLButtonElement>("[data-v2-control='up']");
    const controlsDown = shell.querySelector<HTMLButtonElement>("[data-v2-control='down']");
    const controlsMenu = shell.querySelector<HTMLButtonElement>("[data-v2-control='menu']");
    const menu = shell.querySelector<HTMLElement>("[data-v2-menu='true']");
    const menuNavChecklist = shell.querySelector<HTMLButtonElement>("[data-v2-menu-button='checklist']");
    const menuPanelChecklist = shell.querySelector<HTMLElement>("[data-v2-menu-panel='checklist']");
    const calcDevice = root.querySelector<HTMLElement>("[data-calc-device]");
    const keys = root.querySelector<HTMLElement>("[data-keys]");
    const storageKeys = root.querySelector<HTMLElement>("[data-storage-keys]");
    if (
      !main ||
      !viewport ||
      !track ||
      !sectionCalc ||
      !sectionStorage ||
      !middleDrawerViewport ||
      !middleDrawerTrack ||
      !middleDrawerPanelCalculator ||
      !middleDrawerPanelChecklist ||
      !bottomDrawerViewport ||
      !bottomDrawerTrack ||
      !bottomDrawerPanelStorage ||
      !bottomDrawerPanelChecklist ||
      !controlsUp ||
      !controlsDown ||
      !controlsMenu ||
      !menu ||
      !menuNavChecklist ||
      !menuPanelChecklist ||
      !calcDevice ||
      !keys ||
      !storageKeys
    ) {
      return null;
    }
    return {
      shell,
      main,
      viewport,
      track,
      sectionCalc,
      sectionStorage,
      middleDrawerViewport,
      middleDrawerTrack,
      middleDrawerPanelCalculator,
      middleDrawerPanelChecklist,
      bottomDrawerViewport,
      bottomDrawerTrack,
      bottomDrawerPanelStorage,
      bottomDrawerPanelChecklist,
      controlsUp,
      controlsDown,
      controlsMenu,
      menu,
      menuNavChecklist,
      menuPanelChecklist,
      calcDevice,
      keys,
      storageKeys,
    };
  };

  const ensureShellRefs = (): ShellRefs => {
    if (refsCache) {
      return refsCache;
    }

    const existing = buildRefsFromExistingShell();
    if (existing) {
      refsCache = existing;
      bindGestures(existing);
      return existing;
    }

    const calcDevice = root.querySelector<HTMLElement>("[data-calc-device]");
    const storageSection = root.querySelector<HTMLElement>(".storage");
    const checklistShell = root.querySelector<HTMLElement>(".checklist-shell");
    const keys = root.querySelector<HTMLElement>("[data-keys]");
    const storageKeys = root.querySelector<HTMLElement>("[data-storage-keys]");
    if (!calcDevice || !storageSection || !checklistShell || !keys || !storageKeys) {
      throw new Error("V2 shell could not find required modules.");
    }

    const shell = document.createElement("div");
    shell.className = "v2-shell";
    shell.dataset.v2ShellRoot = "true";

    const main = document.createElement("section");
    main.className = "v2-main";
    main.dataset.v2Main = "true";

    const viewport = document.createElement("div");
    viewport.className = "v2-stack-viewport";
    viewport.dataset.v2Viewport = "true";

    const track = document.createElement("div");
    track.className = "v2-stack-track";
    track.dataset.v2Track = "true";

    const sectionCalc = document.createElement("section");
    sectionCalc.className = "v2-stack-section v2-stack-section--calc";
    sectionCalc.dataset.v2Section = "calc";
    const middleDrawerViewport = document.createElement("div");
    middleDrawerViewport.className = "v2-middle-drawer-viewport";
    middleDrawerViewport.dataset.v2MiddleDrawerViewport = "true";
    const middleDrawerTrack = document.createElement("div");
    middleDrawerTrack.className = "v2-middle-drawer-track";
    middleDrawerTrack.dataset.v2MiddleDrawerTrack = "true";
    const middleDrawerPanelCalculator = document.createElement("section");
    middleDrawerPanelCalculator.className = "v2-middle-drawer-panel";
    middleDrawerPanelCalculator.dataset.v2MiddlePanel = "calculator";
    const middleDrawerPanelChecklist = document.createElement("section");
    middleDrawerPanelChecklist.className = "v2-middle-drawer-panel";
    middleDrawerPanelChecklist.dataset.v2MiddlePanel = "checklist";

    const sectionStorage = document.createElement("section");
    sectionStorage.className = "v2-stack-section v2-stack-section--storage";
    sectionStorage.dataset.v2Section = "storage";
    const bottomDrawerViewport = document.createElement("div");
    bottomDrawerViewport.className = "v2-bottom-drawer-viewport";
    bottomDrawerViewport.dataset.v2BottomDrawerViewport = "true";
    const bottomDrawerTrack = document.createElement("div");
    bottomDrawerTrack.className = "v2-bottom-drawer-track";
    bottomDrawerTrack.dataset.v2BottomDrawerTrack = "true";
    const bottomDrawerPanelStorage = document.createElement("section");
    bottomDrawerPanelStorage.className = "v2-bottom-drawer-panel";
    bottomDrawerPanelStorage.dataset.v2DrawerPanel = "storage";
    const bottomDrawerPanelChecklist = document.createElement("section");
    bottomDrawerPanelChecklist.className = "v2-bottom-drawer-panel";
    bottomDrawerPanelChecklist.dataset.v2DrawerPanel = "checklist";

    middleDrawerPanelCalculator.appendChild(calcDevice);
    middleDrawerTrack.append(middleDrawerPanelCalculator, middleDrawerPanelChecklist);
    middleDrawerViewport.appendChild(middleDrawerTrack);
    sectionCalc.appendChild(middleDrawerViewport);
    bottomDrawerPanelStorage.appendChild(storageSection);
    bottomDrawerPanelChecklist.appendChild(checklistShell);
    bottomDrawerTrack.append(bottomDrawerPanelStorage, bottomDrawerPanelChecklist);
    bottomDrawerViewport.appendChild(bottomDrawerTrack);
    sectionStorage.appendChild(bottomDrawerViewport);

    track.append(sectionCalc, sectionStorage);
    viewport.appendChild(track);

    const controls = document.createElement("div");
    controls.className = "v2-shell-controls";

    const controlsUp = document.createElement("button");
    controlsUp.type = "button";
    controlsUp.className = "v2-shell-control";
    controlsUp.dataset.v2Control = "up";
    controlsUp.textContent = "Up";

    const controlsDown = document.createElement("button");
    controlsDown.type = "button";
    controlsDown.className = "v2-shell-control";
    controlsDown.dataset.v2Control = "down";
    controlsDown.textContent = "Down";

    const controlsMenu = document.createElement("button");
    controlsMenu.type = "button";
    controlsMenu.className = "v2-shell-control";
    controlsMenu.dataset.v2Control = "menu";
    controlsMenu.textContent = "Swap";

    controls.append(controlsUp, controlsDown, controlsMenu);
    main.append(viewport, controls);

    const menu = document.createElement("aside");
    menu.className = "v2-menu";
    menu.dataset.v2Menu = "true";
    menu.setAttribute("aria-label", "Module menu");

    const menuNav = document.createElement("div");
    menuNav.className = "v2-menu-nav";

    const menuNavChecklist = createMenuModuleButton("Checklist");
    menuNavChecklist.dataset.v2MenuButton = "checklist";

    menuNav.append(menuNavChecklist);

    const menuPanels = document.createElement("div");
    menuPanels.className = "v2-menu-panels";

    const menuPanelChecklist = document.createElement("section");
    menuPanelChecklist.className = "v2-menu-panel";
    menuPanelChecklist.dataset.v2MenuPanel = "checklist";

    menuPanels.append(menuPanelChecklist);
    menu.append(menuNav, menuPanels);

    shell.append(main, menu);
    root.appendChild(shell);

    refsCache = {
      shell,
      main,
      viewport,
      track,
      sectionCalc,
      sectionStorage,
      middleDrawerViewport,
      middleDrawerTrack,
      middleDrawerPanelCalculator,
      middleDrawerPanelChecklist,
      bottomDrawerViewport,
      bottomDrawerTrack,
      bottomDrawerPanelStorage,
      bottomDrawerPanelChecklist,
      controlsUp,
      controlsDown,
      controlsMenu,
      menu,
      menuNavChecklist,
      menuPanelChecklist,
      calcDevice,
      keys,
      storageKeys,
    };

    bindGestures(refsCache);
    return refsCache;
  };

  const renderShellWithOptions = (
    state: GameState,
    dispatch: (action: Action) => unknown,
    options: ShellRenderOptions = {},
  ): void => {
    latestInteractionMode = options.interactionMode ?? "calculator";
    latestInputBlocked = options.inputBlocked ?? false;
    latestState = state;
    latestDispatch = dispatch;
    touchRearrange.syncContext(state, dispatch, latestInteractionMode);
    const refs = ensureShellRefs();
    renderCalculatorStorageV2Module(root, state, dispatch, {
      interactionMode: latestInteractionMode,
      inputBlocked: latestInputBlocked,
    });
    renderVisualizerHost(root, state);
    renderChecklistV2Module(root, state);
    syncSnapAndUi(refs, state, false);
  };

  const forceActiveView: ShellRenderer["forceActiveView"] = (options) => {
    const refs = refsCache;
    const state = latestState;
    if (!refs || !state) {
      return;
    }
    if (options.middlePanelId) {
      controller.setMiddlePanel(options.middlePanelId);
    }
    if (options.bottomPanelId) {
      controller.setBottomPanel(options.bottomPanelId);
    }
    const model = controller.sync(state, latestInteractionMode);
    if (options.snapId) {
      controller.setSnap(model, options.snapId);
    }
    syncSnapAndUi(refs, state, options.includeTransition ?? true);
  };

  const playTransitionCue: ShellRenderer["playTransitionCue"] = async (target) => {
    const refs = ensureShellRefs();
    const element =
      target === "storage"
          ? refs.bottomDrawerPanelStorage
          : refs.middleDrawerPanelCalculator;
    element.classList.remove("v2-transition-cue");
    void element.offsetWidth;
    element.classList.add("v2-transition-cue");
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 520);
    });
    element.classList.remove("v2-transition-cue");
  };

  const dispose = (): void => {
    touchRearrange.cancel();
    clearVisualizerHost(root);
    for (const cleanup of cleanupListeners.splice(0)) {
      cleanup();
    }
    if (refsCache) {
      clearPointerSession(refsCache);
    }
    refsCache = null;
    latestState = null;
    latestDispatch = null;
    latestInteractionMode = "calculator";
    latestInputBlocked = false;
    returnFocusEl = null;
  };

  const resetForTests = (): void => {
    controller.runtime.activeSnapId = "middle";
    controller.runtime.menuOpen = false;
    controller.runtime.menuActiveModule = "checklist";
    controller.runtime.activeMiddlePanelId = "calculator";
    controller.runtime.activeBottomPanelId = "storage";
    touchRearrange.cancel();
    clearVisualizerHost(root);
    dragActive = false;
    dragDeltaY = 0;
    drawerDragActive = false;
    drawerDragDeltaX = 0;
    latestInteractionMode = "calculator";
    latestInputBlocked = false;
    pointerSession = null;
    returnFocusEl = null;
  };

  return {
    render: renderShellWithOptions,
    forceActiveView,
    playTransitionCue,
    dispose,
    resetForTests,
  };
};

export const renderWithShell = (root: Element, state: GameState, dispatch: (action: Action) => unknown): void => {
  let renderer = rendererCache.get(root);
  if (!renderer) {
    renderer = createShellRenderer(root);
    rendererCache.set(root, renderer);
    rendererRegistry.add(renderer);
  }
  renderer.render(state, dispatch);
};

export const disposeShellRenderer = (root: Element): void => {
  const renderer = rendererCache.get(root);
  if (!renderer) {
    return;
  }
  renderer.dispose();
  rendererRegistry.delete(renderer);
  rendererCache.delete(root);
};

export const resetShellRuntimeForTests = (): void => {
  for (const renderer of rendererRegistry) {
    renderer.resetForTests();
  }
};
