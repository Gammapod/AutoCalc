import { getOrCreateRuntime } from "../../runtime/registry.js";
import type { CalculatorRuntime } from "../../runtime/types.js";
import type { CalculatorLayoutSnapshot } from "../../layout/types.js";

export type CalculatorModuleState = {
  pendingToggleAnimationByFlag: Record<string, "on" | "off">;
  previousUnlockSnapshot: Record<string, boolean> | null;
  keyLabelResizeBound: boolean;
  slotMarquee: {
    intervalId: ReturnType<typeof setInterval> | null;
    offsetChars: number;
    maxOffsetChars: number;
    direction: 1 | -1;
    pauseTicksRemaining: number;
    slotEl: HTMLElement | null;
    viewportEl: HTMLElement | null;
    trackEl: HTMLElement | null;
    resizeObserver: ResizeObserver | null;
    cachedCharWidthPx: number;
    cachedCharWidthFont: string | null;
  };
};

export type CalculatorLayoutRuntimeState = {
  previousSnapshot: CalculatorLayoutSnapshot | null;
};

const createCalculatorModuleState = (): CalculatorModuleState => ({
  pendingToggleAnimationByFlag: {},
  previousUnlockSnapshot: null,
  keyLabelResizeBound: false,
  slotMarquee: {
    intervalId: null,
    offsetChars: 0,
    maxOffsetChars: 0,
    direction: 1,
    pauseTicksRemaining: 0,
    slotEl: null,
    viewportEl: null,
    trackEl: null,
    resizeObserver: null,
    cachedCharWidthPx: 0,
    cachedCharWidthFont: null,
  },
});

const createCalculatorLayoutRuntimeState = (): CalculatorLayoutRuntimeState => ({
  previousSnapshot: null,
});

export const getCalculatorModuleRuntime = (root: Element): CalculatorRuntime =>
  getOrCreateRuntime(root).calculator;

export const getCalculatorModuleState = (root: Element): CalculatorModuleState => {
  const runtime = getCalculatorModuleRuntime(root);
  if (runtime.moduleState) {
    return runtime.moduleState;
  }
  const created = createCalculatorModuleState();
  runtime.moduleState = created;
  runtime.dispose = () => {
    stopSlotMarquee(root);
    disposeSlotMarqueeObservers(root);
    created.pendingToggleAnimationByFlag = {};
    created.previousUnlockSnapshot = null;
    created.keyLabelResizeBound = false;
    created.slotMarquee = {
      intervalId: null,
      offsetChars: 0,
      maxOffsetChars: 0,
      direction: 1,
      pauseTicksRemaining: 0,
      slotEl: null,
      viewportEl: null,
      trackEl: null,
      resizeObserver: null,
      cachedCharWidthPx: 0,
      cachedCharWidthFont: null,
    };
    const layoutRuntime = runtime.layoutState;
    if (layoutRuntime) {
      layoutRuntime.previousSnapshot = null;
    }
    runtime.moduleState = createCalculatorModuleState();
    runtime.layoutState = createCalculatorLayoutRuntimeState();
  };
  runtime.resetForTests = () => {
    stopSlotMarquee(root);
    disposeSlotMarqueeObservers(root);
    created.pendingToggleAnimationByFlag = {};
    created.previousUnlockSnapshot = null;
    created.keyLabelResizeBound = false;
    created.slotMarquee = {
      intervalId: null,
      offsetChars: 0,
      maxOffsetChars: 0,
      direction: 1,
      pauseTicksRemaining: 0,
      slotEl: null,
      viewportEl: null,
      trackEl: null,
      resizeObserver: null,
      cachedCharWidthPx: 0,
      cachedCharWidthFont: null,
    };
    const layoutRuntime = runtime.layoutState;
    if (layoutRuntime) {
      layoutRuntime.previousSnapshot = null;
    }
  };
  return created;
};

export const getCalculatorLayoutRuntimeState = (root: Element): CalculatorLayoutRuntimeState => {
  const runtime = getCalculatorModuleRuntime(root);
  if (runtime.layoutState) {
    return runtime.layoutState;
  }
  const created = createCalculatorLayoutRuntimeState();
  runtime.layoutState = created;
  return created;
};

export const readToggleAnimation = (root: Element, id: string): "on" | "off" | null =>
  getCalculatorModuleState(root).pendingToggleAnimationByFlag[id] ?? null;

export const queueToggleAnimation = (root: Element, id: string, value: "on" | "off"): void => {
  getCalculatorModuleState(root).pendingToggleAnimationByFlag[id] = value;
};

export const clearToggleAnimations = (root: Element): void => {
  getCalculatorModuleState(root).pendingToggleAnimationByFlag = {};
};

const SLOT_MARQUEE_EDGE_PAUSE_TICKS = 5;
const SLOT_MARQUEE_TICK_MS = 200;

const getSlotTrackForRoot = (root: Element): HTMLElement | null =>
  getCalculatorModuleState(root).slotMarquee.trackEl ?? root.querySelector<HTMLElement>("[data-slot] .slot-display__track");

const readCachedMonospaceCharWidth = (root: Element): number => {
  const state = getCalculatorModuleState(root);
  const slotEl = state.slotMarquee.slotEl;
  if (!slotEl || typeof window === "undefined" || typeof document === "undefined") {
    return 0;
  }
  const computed = window.getComputedStyle(slotEl);
  const fontKey = computed.font;
  if (state.slotMarquee.cachedCharWidthPx > 0 && state.slotMarquee.cachedCharWidthFont === fontKey) {
    return state.slotMarquee.cachedCharWidthPx;
  }
  const probe = document.createElement("span");
  probe.textContent = "0";
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.whiteSpace = "pre";
  probe.style.pointerEvents = "none";
  probe.style.font = fontKey;
  slotEl.appendChild(probe);
  const measuredWidth = probe.getBoundingClientRect().width;
  probe.remove();
  const charWidth = Number.isFinite(measuredWidth) && measuredWidth > 0 ? measuredWidth : 0;
  state.slotMarquee.cachedCharWidthPx = charWidth;
  state.slotMarquee.cachedCharWidthFont = fontKey;
  return charWidth;
};

const applySlotMarqueeTrackPosition = (root: Element): void => {
  const state = getCalculatorModuleState(root);
  const track = getSlotTrackForRoot(root);
  if (!track) {
    return;
  }
  track.style.transform = `translateX(-${state.slotMarquee.offsetChars.toString()}ch)`;
};

export const disposeSlotMarqueeObservers = (root: Element): void => {
  const state = getCalculatorModuleState(root);
  if (state.slotMarquee.resizeObserver) {
    state.slotMarquee.resizeObserver.disconnect();
  }
  state.slotMarquee.resizeObserver = null;
  state.slotMarquee.slotEl = null;
  state.slotMarquee.viewportEl = null;
  state.slotMarquee.trackEl = null;
  state.slotMarquee.cachedCharWidthPx = 0;
  state.slotMarquee.cachedCharWidthFont = null;
};

export const reconcileSlotMarqueeGeometry = (root: Element): void => {
  const state = getCalculatorModuleState(root);
  const slotEl = state.slotMarquee.slotEl;
  const viewportEl = state.slotMarquee.viewportEl;
  const trackEl = state.slotMarquee.trackEl;
  if (!slotEl || !viewportEl || !trackEl || !slotEl.isConnected || !viewportEl.isConnected || !trackEl.isConnected) {
    stopSlotMarquee(root);
    if (slotEl) {
      slotEl.classList.remove("slot-display--marquee");
    }
    return;
  }

  const viewportWidth = viewportEl.clientWidth;
  const overflowPx = viewportWidth > 0 ? Math.max(0, trackEl.scrollWidth - viewportWidth) : 0;
  const charWidthPx = Math.max(1, readCachedMonospaceCharWidth(root));
  const overflowChars = Math.ceil(overflowPx / charWidthPx);
  if (overflowChars > 0) {
    slotEl.classList.add("slot-display--marquee");
    startOrUpdateSlotMarquee(root, overflowChars);
    return;
  }

  slotEl.classList.remove("slot-display--marquee");
  stopSlotMarquee(root);
};

export const bindOrUpdateSlotMarquee = (
  root: Element,
  binding: {
    slotEl: HTMLElement;
    viewportEl: HTMLElement;
    trackEl: HTMLElement;
  },
): void => {
  const state = getCalculatorModuleState(root);
  state.slotMarquee.slotEl = binding.slotEl;
  state.slotMarquee.viewportEl = binding.viewportEl;
  state.slotMarquee.trackEl = binding.trackEl;
  state.slotMarquee.cachedCharWidthPx = 0;
  state.slotMarquee.cachedCharWidthFont = null;

  if (typeof ResizeObserver !== "undefined") {
    if (!state.slotMarquee.resizeObserver) {
      state.slotMarquee.resizeObserver = new ResizeObserver(() => {
        reconcileSlotMarqueeGeometry(root);
      });
    }
    state.slotMarquee.resizeObserver.disconnect();
    state.slotMarquee.resizeObserver.observe(binding.viewportEl);
    state.slotMarquee.resizeObserver.observe(binding.trackEl);
  }

  reconcileSlotMarqueeGeometry(root);
};

export const advanceSlotMarqueeTickForTests = (root: Element, ticks: number = 1): void => {
  const state = getCalculatorModuleState(root);
  for (let index = 0; index < Math.max(0, Math.trunc(ticks)); index += 1) {
    if (state.slotMarquee.maxOffsetChars <= 0) {
      state.slotMarquee.offsetChars = 0;
      state.slotMarquee.pauseTicksRemaining = 0;
      break;
    }
    if (state.slotMarquee.pauseTicksRemaining > 0) {
      state.slotMarquee.pauseTicksRemaining -= 1;
      continue;
    }
    const nextOffset = state.slotMarquee.offsetChars + state.slotMarquee.direction;
    if (nextOffset <= 0) {
      state.slotMarquee.offsetChars = 0;
      state.slotMarquee.direction = 1;
      state.slotMarquee.pauseTicksRemaining = SLOT_MARQUEE_EDGE_PAUSE_TICKS;
      continue;
    }
    if (nextOffset >= state.slotMarquee.maxOffsetChars) {
      state.slotMarquee.offsetChars = state.slotMarquee.maxOffsetChars;
      state.slotMarquee.direction = -1;
      state.slotMarquee.pauseTicksRemaining = SLOT_MARQUEE_EDGE_PAUSE_TICKS;
      continue;
    }
    state.slotMarquee.offsetChars = nextOffset;
  }
  applySlotMarqueeTrackPosition(root);
};

export const stopSlotMarquee = (root: Element): void => {
  const state = getCalculatorModuleState(root);
  if (state.slotMarquee.intervalId !== null) {
    clearInterval(state.slotMarquee.intervalId);
    state.slotMarquee.intervalId = null;
  }
  state.slotMarquee.offsetChars = 0;
  state.slotMarquee.maxOffsetChars = 0;
  state.slotMarquee.direction = 1;
  state.slotMarquee.pauseTicksRemaining = 0;
  applySlotMarqueeTrackPosition(root);
};

export const startOrUpdateSlotMarquee = (root: Element, maxOffsetChars: number): void => {
  const state = getCalculatorModuleState(root);
  const safeMaxOffset = Math.max(0, Math.trunc(maxOffsetChars));
  state.slotMarquee.maxOffsetChars = safeMaxOffset;
  if (safeMaxOffset <= 0) {
    stopSlotMarquee(root);
    return;
  }
  if (state.slotMarquee.offsetChars > safeMaxOffset) {
    state.slotMarquee.offsetChars = safeMaxOffset;
  }
  if (state.slotMarquee.intervalId === null) {
    state.slotMarquee.intervalId = setInterval(() => {
      advanceSlotMarqueeTickForTests(root, 1);
    }, SLOT_MARQUEE_TICK_MS);
  }
  applySlotMarqueeTrackPosition(root);
};

export const disposeCalculatorV2Module = (root: Element): void => {
  const runtime = getCalculatorModuleRuntime(root);
  runtime.dispose();
  runtime.moduleState = null;
  runtime.layoutState = null;
};
