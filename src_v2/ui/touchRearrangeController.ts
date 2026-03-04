import { classifyDropAction } from "../../src/domain/layoutDragDrop.js";
import type { Action, GameState, Key, LayoutSurface } from "../../src/domain/types.js";

export type TouchRearrangeMode = "idle" | "pressing" | "carrying";
export type TouchRearrangeResult = "moved" | "swapped" | "canceled" | "noop";

export type TouchRearrangeSource = {
  surface: LayoutSurface;
  index: number;
  key: Key;
};

export type TouchRearrangeTarget = {
  surface: LayoutSurface;
  index: number;
};

type DropAction = "move" | "swap";

type TimerHandle = ReturnType<typeof setTimeout>;

type Scheduler = (fn: () => void, delayMs: number) => TimerHandle;
type Canceler = (handle: TimerHandle) => void;

type Runtime = {
  mode: TouchRearrangeMode;
  pointerId: number | null;
  pressStartTs: number;
  pressStartX: number;
  pressStartY: number;
  source: TouchRearrangeSource | null;
  sourceElement: HTMLElement | null;
  hoverTarget: TouchRearrangeTarget | null;
  hoverAction: DropAction | null;
  hoverElement: HTMLElement | null;
  ghostEl: HTMLElement | null;
  lastKnownState: GameState | null;
  dispatch: ((action: Action) => unknown) | null;
  interactionMode: "calculator" | "modify";
  pressTimer: TimerHandle | null;
  suppressClicksUntilMs: number;
};

type ResolveTargetResult = {
  target: TouchRearrangeTarget | null;
  targetElement: HTMLElement | null;
};

type TouchRearrangeOptions = {
  longPressMs?: number;
  moveTolerancePx?: number;
  clickSuppressMs?: number;
  now?: () => number;
  schedule?: Scheduler;
  cancelScheduled?: Canceler;
};

const defaultNow = (): number => Date.now();
const defaultSchedule: Scheduler = (fn, delayMs) => setTimeout(fn, delayMs);
const defaultCancelScheduled: Canceler = (handle) => clearTimeout(handle);

const clearHoverDecorations = (runtime: Runtime): void => {
  runtime.hoverElement?.classList.remove("drop-target-valid", "drop-target-invalid");
  runtime.hoverElement = null;
  runtime.hoverTarget = null;
  runtime.hoverAction = null;
};

const clearGhostAndSourceDecorations = (runtime: Runtime): void => {
  runtime.sourceElement?.classList.remove("key--carry-source");
  runtime.sourceElement = null;
  runtime.ghostEl?.remove();
  runtime.ghostEl = null;
};

export const createTouchRearrangeController = (options: TouchRearrangeOptions = {}) => {
  const longPressMs = options.longPressMs ?? 320;
  const clickSuppressMs = options.clickSuppressMs ?? 220;
  const activationGraceMs = 90;
  const now = options.now ?? defaultNow;
  const schedule = options.schedule ?? defaultSchedule;
  const cancelScheduled = options.cancelScheduled ?? defaultCancelScheduled;

  const runtime: Runtime = {
    mode: "idle",
    pointerId: null,
    pressStartTs: 0,
    pressStartX: 0,
    pressStartY: 0,
    source: null,
    sourceElement: null,
    hoverTarget: null,
    hoverAction: null,
    hoverElement: null,
    ghostEl: null,
    lastKnownState: null,
    dispatch: null,
    interactionMode: "calculator",
    pressTimer: null,
    suppressClicksUntilMs: 0,
  };

  const clearPressTimer = (): void => {
    if (!runtime.pressTimer) {
      return;
    }
    cancelScheduled(runtime.pressTimer);
    runtime.pressTimer = null;
  };

  const updateGhostPosition = (clientX: number, clientY: number): void => {
    if (!runtime.ghostEl) {
      return;
    }
    runtime.ghostEl.style.left = `${(clientX + 12).toString()}px`;
    runtime.ghostEl.style.top = `${(clientY + 12).toString()}px`;
  };

  const activateCarryMode = (clientX: number, clientY: number): boolean => {
    if (runtime.mode !== "pressing" || !runtime.source) {
      return false;
    }
    runtime.mode = "carrying";
    runtime.suppressClicksUntilMs = now() + clickSuppressMs;
    runtime.sourceElement?.classList.add("key--carry-source");
    if (runtime.sourceElement) {
      const ghost = runtime.sourceElement.cloneNode(true) as HTMLElement;
      ghost.classList.remove("drop-target-valid", "drop-target-invalid");
      ghost.classList.add("drag-ghost", "drag-ghost--touch");
      ghost.style.width = `${Math.round(runtime.sourceElement.getBoundingClientRect().width)}px`;
      document.body.appendChild(ghost);
      runtime.ghostEl = ghost;
      updateGhostPosition(clientX, clientY);
    }
    return true;
  };

  const resetToIdle = (): void => {
    clearPressTimer();
    clearHoverDecorations(runtime);
    clearGhostAndSourceDecorations(runtime);
    runtime.mode = "idle";
    runtime.pointerId = null;
    runtime.pressStartTs = 0;
    runtime.pressStartX = 0;
    runtime.pressStartY = 0;
    runtime.source = null;
  };

  const syncContext = (
    state: GameState,
    dispatch: (action: Action) => unknown,
    interactionMode: "calculator" | "modify" = "calculator",
  ): void => {
    runtime.lastKnownState = state;
    runtime.dispatch = dispatch;
    runtime.interactionMode = interactionMode;
  };

  const startPress = (
    pointerId: number,
    clientX: number,
    clientY: number,
    source: TouchRearrangeSource,
    sourceElement: HTMLElement | null,
  ): boolean => {
    if (runtime.mode !== "idle") {
      return false;
    }
    runtime.mode = "pressing";
    runtime.pointerId = pointerId;
    runtime.pressStartTs = now();
    runtime.pressStartX = clientX;
    runtime.pressStartY = clientY;
    runtime.source = source;
    runtime.sourceElement = sourceElement;
    runtime.hoverTarget = null;
    runtime.hoverAction = null;
    runtime.hoverElement = null;
    runtime.pressTimer = schedule(() => {
      activateCarryMode(runtime.pressStartX, runtime.pressStartY);
    }, longPressMs);
    return true;
  };

  const move = (
    pointerId: number,
    clientX: number,
    clientY: number,
    resolveTarget: (clientX: number, clientY: number) => ResolveTargetResult,
  ): void => {
    if (runtime.pointerId !== pointerId) {
      return;
    }
    if (runtime.mode === "pressing") {
      const dx = clientX - runtime.pressStartX;
      const dy = clientY - runtime.pressStartY;
      const distance = Math.hypot(dx, dy);
      if (distance > 0) {
        const elapsedMs = now() - runtime.pressStartTs;
        if (elapsedMs + activationGraceMs >= longPressMs) {
          activateCarryMode(clientX, clientY);
        }
      }
      return;
    }
    if (runtime.mode !== "carrying" || !runtime.source || !runtime.lastKnownState) {
      return;
    }

    updateGhostPosition(clientX, clientY);

    const { target, targetElement } = resolveTarget(clientX, clientY);
    clearHoverDecorations(runtime);
    if (!target || !targetElement) {
      return;
    }

    const action = classifyDropAction(runtime.lastKnownState, runtime.source, target, {
      interactionMode: runtime.interactionMode,
    });
    runtime.hoverTarget = target;
    runtime.hoverAction = action;
    runtime.hoverElement = targetElement;
    targetElement.classList.add(action ? "drop-target-valid" : "drop-target-invalid");
  };

  const end = (pointerId: number): TouchRearrangeResult => {
    if (runtime.pointerId !== pointerId) {
      return "noop";
    }

    clearPressTimer();
    if (runtime.mode === "pressing") {
      resetToIdle();
      return "noop";
    }
    if (runtime.mode !== "carrying" || !runtime.source || !runtime.dispatch) {
      resetToIdle();
      return "noop";
    }

    const target = runtime.hoverTarget;
    const action = runtime.hoverAction;
    if (!target || !action) {
      runtime.suppressClicksUntilMs = now() + clickSuppressMs;
      resetToIdle();
      return "canceled";
    }

    if (action === "move") {
      runtime.dispatch({
        type: "MOVE_LAYOUT_CELL",
        fromSurface: runtime.source.surface,
        fromIndex: runtime.source.index,
        toSurface: target.surface,
        toIndex: target.index,
      });
      runtime.suppressClicksUntilMs = now() + clickSuppressMs;
      resetToIdle();
      return "moved";
    }

    runtime.dispatch({
      type: "SWAP_LAYOUT_CELLS",
      fromSurface: runtime.source.surface,
      fromIndex: runtime.source.index,
      toSurface: target.surface,
      toIndex: target.index,
    });
    runtime.suppressClicksUntilMs = now() + clickSuppressMs;
    resetToIdle();
    return "swapped";
  };

  const cancel = (): void => {
    if (runtime.mode === "carrying") {
      runtime.suppressClicksUntilMs = now() + clickSuppressMs;
    }
    resetToIdle();
  };

  const isPressing = (): boolean => runtime.mode === "pressing";
  const isCarrying = (): boolean => runtime.mode === "carrying";
  const isGestureBlocked = (): boolean => runtime.mode === "carrying";
  const shouldSuppressClick = (): boolean => now() < runtime.suppressClicksUntilMs;

  const forceActivateCarryForTests = (): boolean => activateCarryMode(runtime.pressStartX, runtime.pressStartY);

  return {
    runtime,
    syncContext,
    startPress,
    move,
    end,
    cancel,
    isPressing,
    isCarrying,
    isGestureBlocked,
    shouldSuppressClick,
    forceActivateCarryForTests,
  };
};
