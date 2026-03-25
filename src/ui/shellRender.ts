import type { Action, GameState } from "../domain/types.js";
import type { UiEffect } from "../domain/types.js";
import { createShellController } from "./shellController.js";
import type { ShellViewModel, SnapId } from "./shellModel.js";
import { createTouchRearrangeController } from "./touchRearrangeController.js";
import { getMenuA11yState } from "./shellGesturePolicy.js";
import { renderChecklistV2Module } from "./modules/checklistRenderer.js";
import { renderCalculatorStorageV2Module } from "./modules/calculatorStorageRenderer.js";
import { clearVisualizerHost, renderVisualizerHost } from "./modules/visualizerHost.js";
import { awaitMotionSettled, beginMotionCycle, completeMotionCycle } from "./layout/motionLifecycleBridge.js";
import { forEachUiRootRuntime, getOrCreateRuntime, getRuntimeIfExists } from "./runtime/registry.js";
import type { DrawerDragTarget, PointerSession, ShellRefs } from "./shell/types.js";
import type { ShellRuntimeState } from "./shell/runtimeState.js";
import { buildRefsFromExistingShell, createShellDom } from "./shell/refs.js";
import { bindShellGestures } from "./shell/gestureBinder.js";
import { getSnapOffset } from "./shell/transforms.js";
import type { AppServices } from "../contracts/appServices.js";

export { canStartTouchRearrange, getMenuA11yState, shouldCloseMenuFromSwipe } from "./shellGesturePolicy.js";

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
  inputBlocked?: boolean;
  uiEffects?: UiEffect[];
};

const playElementCueAnimation = async (
  element: HTMLElement | null,
  channel: string,
  fallbackMs: number,
): Promise<void> => {
  const token = beginMotionCycle(channel, fallbackMs);
  if (!element) {
    await awaitMotionSettled(token);
    return;
  }

  let completed = false;
  const complete = (): void => {
    if (completed) {
      return;
    }
    completed = true;
    completeMotionCycle(token);
  };
  const controller = new AbortController();
  const finish = (): void => {
    controller.abort();
    complete();
  };

  element.classList.remove("v2-transition-cue");
  void element.offsetWidth;
  element.classList.add("v2-transition-cue");
  element.addEventListener("animationend", finish, { signal: controller.signal });
  element.addEventListener("animationcancel", finish, { signal: controller.signal });

  await awaitMotionSettled(token);
  controller.abort();
  element.classList.remove("v2-transition-cue");
};

export const createShellRenderer = (root: Element, rendererOptions: { services?: AppServices } = {}): ShellRenderer => {
  const controller = createShellController();
  const touchRearrange = createTouchRearrangeController();

  let refsCache: ShellRefs | null = null;
  let gestureBinding: { dispose: () => void } | null = null;
  const runtimeState: ShellRuntimeState = {
    dragDeltaY: 0,
    dragActive: false,
    drawerDragDeltaX: 0,
    drawerDragActive: false,
    drawerDragTarget: null,
    latestState: null,
    latestDispatch: null,
    latestInputBlocked: false,
    pointerSession: null,
  };
  let returnFocusEl: HTMLElement | null = null;

  const clearPointerSession = (refs: ShellRefs): void => {
    if (runtimeState.pointerSession) {
      try {
        refs.viewport.releasePointerCapture(runtimeState.pointerSession.pointerId);
      } catch {
        // Ignore release errors when capture was never acquired on viewport.
      }
      try {
        refs.menu.releasePointerCapture(runtimeState.pointerSession.pointerId);
      } catch {
        // Ignore release errors when capture was never acquired on menu.
      }
    }
    runtimeState.pointerSession = null;
    runtimeState.dragActive = false;
    runtimeState.dragDeltaY = 0;
    runtimeState.drawerDragActive = false;
    runtimeState.drawerDragDeltaX = 0;
    runtimeState.drawerDragTarget = null;
    applyMiddleDrawerTransform(refs, true);
    applyBottomDrawerTransform(refs, true);
  };

  const applyTrackTransform = (refs: ShellRefs, includeTransition: boolean): void => {
    const baseOffset = getSnapOffset(controller.runtime.activeSnapId, refs);
    const translateY = -baseOffset + runtimeState.dragDeltaY;
    refs.track.style.transition = includeTransition ? "transform 220ms cubic-bezier(0.2, 0.7, 0.1, 1)" : "none";
    refs.track.style.transform = `translate3d(0, ${translateY.toString()}px, 0)`;
  };

  const getDrawerLeadInset = (viewport: HTMLElement, panel: HTMLElement): number =>
    Math.max(0, (viewport.clientWidth - panel.clientWidth) / 2);

  const getMiddleDrawerOffset = (refs: ShellRefs): number =>
    (() => {
      const inset = getDrawerLeadInset(refs.middleDrawerViewport, refs.middleDrawerPanelCalculator);
      return -inset;
    })();

  const applyMiddleDrawerTransform = (refs: ShellRefs, includeTransition: boolean): void => {
    const activeDeltaX = runtimeState.drawerDragActive && runtimeState.drawerDragTarget === "middle" ? runtimeState.drawerDragDeltaX : 0;
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
    const activeDeltaX = runtimeState.drawerDragActive && runtimeState.drawerDragTarget === "bottom" ? runtimeState.drawerDragDeltaX : 0;
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

  const setMenuModuleClass = (refs: ShellRefs, model: ShellViewModel): void => {
    const checklistVisible = model.menuModules.includes("checklist");
    const active = controller.runtime.menuActiveModule;
    refs.menuNavChecklist.hidden = !checklistVisible;
    refs.menuNavChecklist.setAttribute("aria-pressed", checklistVisible && active === "checklist" ? "true" : "false");
    refs.menuPanelChecklist.hidden = !checklistVisible || active !== "checklist";
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

  const syncControlDisabledState = (refs: ShellRefs, state: GameState): ShellViewModel => {
    const model = controller.sync(state);
    const hasMenuModules = model.menuModules.length > 0;
    if (!hasMenuModules) {
      controller.setMenuOpen(false);
    }
    refs.controlsMenu.hidden = !hasMenuModules;
    refs.menu.hidden = !hasMenuModules;
    const gesturesBlocked = touchRearrange.isGestureBlocked() || runtimeState.latestInputBlocked;
    refs.controlsUp.disabled = gesturesBlocked || !controller.canSnapUp(model);
    refs.controlsDown.disabled = gesturesBlocked || !controller.canSnapDown(model);
    refs.controlsMenu.disabled = !hasMenuModules || gesturesBlocked;
    return model;
  };

  const syncViewportTouchAction = (refs: ShellRefs): void => {
    const lock = runtimeState.latestInputBlocked || touchRearrange.isCarrying() || touchRearrange.isPressing();
    refs.viewport.style.touchAction = lock ? "none" : "pan-y";
    refs.keys.style.touchAction = lock ? "none" : "manipulation";
    refs.storageKeys.style.touchAction = lock ? "none" : "pan-y";
  };

  const syncSnapAndUi = (refs: ShellRefs, state: GameState, includeTransition: boolean): void => {
    refs.shell.dataset.v2InputBlocked = runtimeState.latestInputBlocked ? "true" : "false";
    const model = syncControlDisabledState(refs, state);
    setMenuModuleClass(refs, model);
    applyMenuA11yState(refs);
    syncViewportTouchAction(refs);
    applyTrackTransform(refs, includeTransition);
    applyMiddleDrawerTransform(refs, includeTransition);
    applyBottomDrawerTransform(refs, includeTransition);
  };

  const restoreFocus = (refs: ShellRefs): void => {
    const target = returnFocusEl ?? refs.controlsMenu;
    returnFocusEl = null;
    target.focus();
  };

  const closeMenu = (focusReturn: boolean = true): void => {
    const refs = refsCache;
    const state = runtimeState.latestState;
    if (!refs || !state) {
      return;
    }
    controller.setMenuOpen(false);
    syncSnapAndUi(refs, state, true);
    if (focusReturn) {
      restoreFocus(refs);
    }
  };

  const snapUp = (): void => {
    if (runtimeState.latestInputBlocked || touchRearrange.isGestureBlocked()) {
      return;
    }
    const refs = refsCache;
    const state = runtimeState.latestState;
    if (!refs || !state) {
      return;
    }
    const model = controller.sync(state);
    controller.moveSnap(model, "up");
    syncSnapAndUi(refs, state, true);
  };

  const snapDown = (): void => {
    if (runtimeState.latestInputBlocked || touchRearrange.isGestureBlocked()) {
      return;
    }
    const refs = refsCache;
    const state = runtimeState.latestState;
    if (!refs || !state) {
      return;
    }
    const model = controller.sync(state);
    controller.moveSnap(model, "down");
    syncSnapAndUi(refs, state, true);
  };

  const ensureShellRefs = (): ShellRefs => {
    if (refsCache) {
      return refsCache;
    }
    refsCache = buildRefsFromExistingShell(root) ?? createShellDom(root);
    gestureBinding = bindShellGestures({
      refs: refsCache,
      controller,
      touchRearrange,
      runtime: runtimeState,
      closeMenu,
      snapUp,
      snapDown,
      syncSnapAndUi,
      syncViewportTouchAction,
      clearPointerSession,
      applyMiddleDrawerTransform,
      applyBottomDrawerTransform,
      applyTrackTransform,
    });
    return refsCache;
  };
  const renderShellWithOptions = (
    state: GameState,
    dispatch: (action: Action) => unknown,
    options: ShellRenderOptions = {},
  ): void => {
    runtimeState.latestInputBlocked = options.inputBlocked ?? false;
    runtimeState.latestState = state;
    runtimeState.latestDispatch = dispatch;
    touchRearrange.syncContext(state, dispatch);
    const refs = ensureShellRefs();
    renderCalculatorStorageV2Module(root, state, dispatch, {
      inputBlocked: runtimeState.latestInputBlocked,
      uiEffects: options.uiEffects ?? [],
    });
    renderVisualizerHost(root, state);
    renderChecklistV2Module(root, state, { services: rendererOptions.services });
    syncSnapAndUi(refs, state, false);
  };

  const forceActiveView: ShellRenderer["forceActiveView"] = (options) => {
    const refs = refsCache;
    const state = runtimeState.latestState;
    if (!refs || !state) {
      return;
    }
    if (options.middlePanelId) {
      controller.setMiddlePanel(options.middlePanelId);
    }
    if (options.bottomPanelId) {
      controller.setBottomPanel(options.bottomPanelId);
    }
    const model = controller.sync(state);
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
    await playElementCueAnimation(element, `shell-cue:${target}`, 580);
  };

  const dispose = (): void => {
    touchRearrange.cancel();
    clearVisualizerHost(root);
    gestureBinding?.dispose();
    gestureBinding = null;
    if (refsCache) {
      clearPointerSession(refsCache);
    }
    refsCache = null;
    runtimeState.latestState = null;
    runtimeState.latestDispatch = null;
    runtimeState.latestInputBlocked = false;
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
    runtimeState.dragActive = false;
    runtimeState.dragDeltaY = 0;
    runtimeState.drawerDragActive = false;
    runtimeState.drawerDragDeltaX = 0;
    runtimeState.latestInputBlocked = false;
    runtimeState.pointerSession = null;
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
  const shellRuntime = getOrCreateRuntime(root).shell;
  let renderer = shellRuntime.renderer ?? undefined;
  if (!renderer) {
    renderer = createShellRenderer(root);
    shellRuntime.renderer = renderer;
    shellRuntime.dispose = () => {
      renderer?.dispose();
      shellRuntime.renderer = null;
    };
    shellRuntime.resetForTests = () => {
      renderer?.resetForTests();
    };
  }
  renderer.render(state, dispatch);
};

export const disposeShellRenderer = (root: Element): void => {
  const rootRuntime = getRuntimeIfExists(root);
  if (!rootRuntime) {
    return;
  }
  const shellRuntime = rootRuntime.shell;
  const renderer = shellRuntime.renderer ?? undefined;
  if (!renderer) {
    return;
  }
  renderer.dispose();
  shellRuntime.renderer = null;
};

export const resetShellRuntimeForTests = (): void => {
  forEachUiRootRuntime((runtime) => {
    const renderer = runtime.shell.renderer ?? undefined;
    renderer?.resetForTests();
  });
};

