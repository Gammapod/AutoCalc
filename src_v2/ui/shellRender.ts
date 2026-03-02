import type { Action, GameState, Key, LayoutSurface } from "../../src/domain/types.js";
import { createShellController } from "./shellController.js";
import type { MenuModuleId, SnapId } from "./shellModel.js";
import { createTouchRearrangeController, type TouchRearrangeSource, type TouchRearrangeTarget } from "./touchRearrangeController.js";
import { renderChecklistV2Module } from "./modules/checklistRenderer.js";
import { clearGrapherV2Module, renderGrapherV2Module } from "./modules/grapherRenderer.js";
import { renderAllocatorV2Module } from "./modules/allocatorRenderer.js";
import { renderCalculatorStorageV2Module } from "./modules/calculatorStorageRenderer.js";

export type ShellRenderer = {
  render: (state: GameState, dispatch: (action: Action) => unknown) => void;
  dispose: () => void;
  resetForTests: () => void;
};

type ShellRefs = {
  shell: HTMLElement;
  main: HTMLElement;
  viewport: HTMLElement;
  track: HTMLElement;
  sectionGrapher: HTMLElement;
  sectionCalc: HTMLElement;
  sectionStorage: HTMLElement;
  controlsUp: HTMLButtonElement;
  controlsDown: HTMLButtonElement;
  controlsMenu: HTMLButtonElement;
  menu: HTMLElement;
  menuNavAllocator: HTMLButtonElement;
  menuNavChecklist: HTMLButtonElement;
  menuPanelAllocator: HTMLElement;
  menuPanelChecklist: HTMLElement;
  grapherDevice: HTMLElement;
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
  startedInMenu: boolean;
};

type MenuA11yState = {
  ariaHidden: "true" | "false";
  inert: boolean;
};

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
  const targetElement = eventTarget instanceof HTMLElement ? eventTarget : null;
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
  if (snapId === "top") {
    return getOffsetInTrack(refs.sectionGrapher, refs.track);
  }
  if (snapId === "middle") {
    return getOffsetInTrack(refs.sectionCalc, refs.track);
  }
  return getOffsetInTrack(refs.keys, refs.track);
};

export const canStartTouchRearrange = (
  _state: GameState,
  pointerType: string,
  menuOpen: boolean,
  activeSnapId: SnapId,
): boolean => {
  if (pointerType !== "touch") {
    return false;
  }
  if (menuOpen) {
    return false;
  }
  return activeSnapId === "bottom";
};

export const getMenuA11yState = (menuOpen: boolean): MenuA11yState => ({
  ariaHidden: menuOpen ? "false" : "true",
  inert: !menuOpen,
});

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
  let latestState: GameState | null = null;
  let latestDispatch: ((action: Action) => unknown) | null = null;
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
  };

  const applyTrackTransform = (refs: ShellRefs, includeTransition: boolean): void => {
    const baseOffset = getSnapOffset(controller.runtime.activeSnapId, refs);
    const translateY = -baseOffset + dragDeltaY;
    refs.track.style.transition = includeTransition ? "transform 220ms cubic-bezier(0.2, 0.7, 0.1, 1)" : "none";
    refs.track.style.transform = `translate3d(0, ${translateY.toString()}px, 0)`;
  };

  const setMenuModuleClass = (refs: ShellRefs): void => {
    const active = controller.runtime.menuActiveModule;
    refs.menuNavAllocator.setAttribute("aria-pressed", active === "allocator" ? "true" : "false");
    refs.menuNavChecklist.setAttribute("aria-pressed", active === "checklist" ? "true" : "false");
    refs.menuPanelAllocator.hidden = active !== "allocator";
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
    const model = controller.sync(state);
    const gesturesBlocked = touchRearrange.isGestureBlocked();
    refs.controlsUp.disabled = gesturesBlocked || !controller.canSnapUp(model);
    refs.controlsDown.disabled = gesturesBlocked || !controller.canSnapDown(model);
    refs.controlsMenu.disabled = gesturesBlocked;
  };

  const syncViewportTouchAction = (refs: ShellRefs): void => {
    const lock = touchRearrange.isCarrying() || touchRearrange.isPressing();
    refs.viewport.style.touchAction = lock ? "none" : "pan-y";
    refs.keys.style.touchAction = lock ? "none" : "manipulation";
    refs.storageKeys.style.touchAction = lock ? "none" : "pan-y";
  };

  const syncSnapAndUi = (refs: ShellRefs, state: GameState, includeTransition: boolean): void => {
    syncControlDisabledState(refs, state);
    setMenuModuleClass(refs);
    applyMenuA11yState(refs);
    syncViewportTouchAction(refs);
    applyTrackTransform(refs, includeTransition);
  };

  const focusMenuTarget = (refs: ShellRefs): void => {
    const activeModule = controller.runtime.menuActiveModule;
    const target = activeModule === "checklist" ? refs.menuNavChecklist : refs.menuNavAllocator;
    target.focus();
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
    if (touchRearrange.isGestureBlocked()) {
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
    if (touchRearrange.isGestureBlocked()) {
      return;
    }
    const refs = refsCache;
    const state = latestState;
    if (!refs || !state) {
      return;
    }
    const model = controller.sync(state);
    controller.moveSnap(model, "up");
    syncSnapAndUi(refs, state, true);
  };

  const snapDown = (): void => {
    if (touchRearrange.isGestureBlocked()) {
      return;
    }
    const refs = refsCache;
    const state = latestState;
    if (!refs || !state) {
      return;
    }
    const model = controller.sync(state);
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
      const pointerEvent = event as PointerEvent;
      if (pointerEvent.pointerType === "mouse" && pointerEvent.button !== 0) {
        return;
      }
      if (touchRearrange.isCarrying()) {
        return;
      }
      if (controller.runtime.menuOpen) {
        return;
      }
      if (
        latestState &&
        canStartTouchRearrange(latestState, pointerEvent.pointerType, controller.runtime.menuOpen, controller.runtime.activeSnapId)
      ) {
        const resolved = resolveTouchSourceFromEvent(latestState, pointerEvent.target);
        if (resolved) {
          touchRearrange.startPress(pointerEvent.pointerId, pointerEvent.clientX, pointerEvent.clientY, resolved.source, resolved.element);
          syncViewportTouchAction(refs);
        }
      }
      const rect = refs.viewport.getBoundingClientRect();
      const localX = pointerEvent.clientX - rect.left;
      const startedInRightEdgeZone = localX >= rect.width - 24;
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
        startedInMenu: false,
      };
      refs.viewport.setPointerCapture(pointerEvent.pointerId);
    });

    listen(refs.viewport, "pointermove", (event) => {
      const pointerEvent = event as PointerEvent;
      if (!pointerSession || pointerEvent.pointerId !== pointerSession.pointerId) {
        return;
      }
      if (latestState && latestDispatch) {
        touchRearrange.syncContext(latestState, latestDispatch);
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
      if (touchRearrange.isPressing()) {
        syncViewportTouchAction(refs);
        pointerEvent.preventDefault();
        return;
      }

      const dx = pointerEvent.clientX - pointerSession.startX;
      const dy = pointerEvent.clientY - pointerSession.startY;
      if (pointerSession.axisLock === "none" && (Math.abs(dx) >= 8 || Math.abs(dy) >= 8)) {
        pointerSession.axisLock = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }

      if (pointerSession.axisLock === "x" && pointerSession.startedInRightEdgeZone && dx <= -28) {
        openMenu();
        clearPointerSession(refs);
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
      const velocityY = (pointerEvent.clientY - pointerSession.lastY) / elapsed;
      if (dragActive) {
        const model = controller.sync(state);
        controller.settleFromDrag(model, dragDeltaY, velocityY);
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

    listen(refs.menu, "pointerdown", (event) => {
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
      if (pointerSession.axisLock === "x" && dx >= 28) {
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
      if (touchRearrange.isGestureBlocked()) {
        return;
      }
      if (controller.runtime.menuOpen) {
        closeMenu();
        return;
      }
      openMenu(refs.controlsMenu);
    });

    listen(refs.menuNavAllocator, "click", () => {
      controller.setMenuModule("allocator");
      const state = latestState;
      if (state) {
        syncSnapAndUi(refs, state, false);
      }
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
    const sectionGrapher = shell.querySelector<HTMLElement>("[data-v2-section='grapher']");
    const sectionCalc = shell.querySelector<HTMLElement>("[data-v2-section='calc']");
    const sectionStorage = shell.querySelector<HTMLElement>("[data-v2-section='storage']");
    const controlsUp = shell.querySelector<HTMLButtonElement>("[data-v2-control='up']");
    const controlsDown = shell.querySelector<HTMLButtonElement>("[data-v2-control='down']");
    const controlsMenu = shell.querySelector<HTMLButtonElement>("[data-v2-control='menu']");
    const menu = shell.querySelector<HTMLElement>("[data-v2-menu='true']");
    const menuNavAllocator = shell.querySelector<HTMLButtonElement>("[data-v2-menu-button='allocator']");
    const menuNavChecklist = shell.querySelector<HTMLButtonElement>("[data-v2-menu-button='checklist']");
    const menuPanelAllocator = shell.querySelector<HTMLElement>("[data-v2-menu-panel='allocator']");
    const menuPanelChecklist = shell.querySelector<HTMLElement>("[data-v2-menu-panel='checklist']");
    const grapherDevice = root.querySelector<HTMLElement>("[data-grapher-device]");
    const calcDevice = root.querySelector<HTMLElement>("[data-calc-device]");
    const keys = root.querySelector<HTMLElement>("[data-keys]");
    const storageKeys = root.querySelector<HTMLElement>("[data-storage-keys]");
    if (
      !main ||
      !viewport ||
      !track ||
      !sectionGrapher ||
      !sectionCalc ||
      !sectionStorage ||
      !controlsUp ||
      !controlsDown ||
      !controlsMenu ||
      !menu ||
      !menuNavAllocator ||
      !menuNavChecklist ||
      !menuPanelAllocator ||
      !menuPanelChecklist ||
      !grapherDevice ||
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
      sectionGrapher,
      sectionCalc,
      sectionStorage,
      controlsUp,
      controlsDown,
      controlsMenu,
      menu,
      menuNavAllocator,
      menuNavChecklist,
      menuPanelAllocator,
      menuPanelChecklist,
      grapherDevice,
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

    const grapherDevice = root.querySelector<HTMLElement>("[data-grapher-device]");
    const allocatorDevice = root.querySelector<HTMLElement>("[data-allocator-device]");
    const calcDevice = root.querySelector<HTMLElement>("[data-calc-device]");
    const storageSection = root.querySelector<HTMLElement>(".storage");
    const checklistShell = root.querySelector<HTMLElement>(".checklist-shell");
    const keys = root.querySelector<HTMLElement>("[data-keys]");
    const storageKeys = root.querySelector<HTMLElement>("[data-storage-keys]");
    if (!grapherDevice || !allocatorDevice || !calcDevice || !storageSection || !checklistShell || !keys || !storageKeys) {
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

    const sectionGrapher = document.createElement("section");
    sectionGrapher.className = "v2-stack-section v2-stack-section--grapher";
    sectionGrapher.dataset.v2Section = "grapher";

    const sectionCalc = document.createElement("section");
    sectionCalc.className = "v2-stack-section v2-stack-section--calc";
    sectionCalc.dataset.v2Section = "calc";

    const sectionStorage = document.createElement("section");
    sectionStorage.className = "v2-stack-section v2-stack-section--storage";
    sectionStorage.dataset.v2Section = "storage";

    sectionGrapher.appendChild(grapherDevice);
    sectionCalc.appendChild(calcDevice);
    sectionStorage.appendChild(storageSection);

    track.append(sectionGrapher, sectionCalc, sectionStorage);
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
    controlsMenu.textContent = "Menu";

    controls.append(controlsUp, controlsDown, controlsMenu);
    main.append(viewport, controls);

    const menu = document.createElement("aside");
    menu.className = "v2-menu";
    menu.dataset.v2Menu = "true";
    menu.setAttribute("aria-label", "Module menu");

    const menuNav = document.createElement("div");
    menuNav.className = "v2-menu-nav";

    const menuNavAllocator = createMenuModuleButton("Allocator");
    menuNavAllocator.dataset.v2MenuButton = "allocator";

    const menuNavChecklist = createMenuModuleButton("Checklist");
    menuNavChecklist.dataset.v2MenuButton = "checklist";

    menuNav.append(menuNavAllocator, menuNavChecklist);

    const menuPanels = document.createElement("div");
    menuPanels.className = "v2-menu-panels";

    const menuPanelAllocator = document.createElement("section");
    menuPanelAllocator.className = "v2-menu-panel";
    menuPanelAllocator.dataset.v2MenuPanel = "allocator";

    const menuPanelChecklist = document.createElement("section");
    menuPanelChecklist.className = "v2-menu-panel";
    menuPanelChecklist.dataset.v2MenuPanel = "checklist";

    menuPanelAllocator.appendChild(allocatorDevice);
    menuPanelChecklist.appendChild(checklistShell);
    menuPanels.append(menuPanelAllocator, menuPanelChecklist);
    menu.append(menuNav, menuPanels);

    shell.append(main, menu);
    root.appendChild(shell);

    refsCache = {
      shell,
      main,
      viewport,
      track,
      sectionGrapher,
      sectionCalc,
      sectionStorage,
      controlsUp,
      controlsDown,
      controlsMenu,
      menu,
      menuNavAllocator,
      menuNavChecklist,
      menuPanelAllocator,
      menuPanelChecklist,
      grapherDevice,
      calcDevice,
      keys,
      storageKeys,
    };

    bindGestures(refsCache);
    return refsCache;
  };

  const renderShell = (state: GameState, dispatch: (action: Action) => unknown): void => {
    latestState = state;
    latestDispatch = dispatch;
    touchRearrange.syncContext(state, dispatch);
    const refs = ensureShellRefs();
    renderCalculatorStorageV2Module(root, state, dispatch);
    renderGrapherV2Module(root, state);
    renderChecklistV2Module(root, state);
    renderAllocatorV2Module(root, state, dispatch);
    syncSnapAndUi(refs, state, false);
  };

  const dispose = (): void => {
    touchRearrange.cancel();
    clearGrapherV2Module();
    for (const cleanup of cleanupListeners.splice(0)) {
      cleanup();
    }
    if (refsCache) {
      clearPointerSession(refsCache);
    }
    refsCache = null;
    latestState = null;
    latestDispatch = null;
    returnFocusEl = null;
  };

  const resetForTests = (): void => {
    controller.runtime.activeSnapId = "middle";
    controller.runtime.menuOpen = false;
    controller.runtime.menuActiveModule = "allocator";
    touchRearrange.cancel();
    clearGrapherV2Module();
    dragActive = false;
    dragDeltaY = 0;
    pointerSession = null;
    returnFocusEl = null;
  };

  return {
    render: renderShell,
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
  clearGrapherV2Module();
};
