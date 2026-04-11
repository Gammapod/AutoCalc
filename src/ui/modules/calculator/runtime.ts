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

type InputOutcomeToneSpec = {
  frequencyStartHz: number;
  frequencyEndHz: number;
  durationMs: number;
  peakGain: number;
  buzzPulseHz: number | null;
};

type InputOutcomeTransportConfig = {
  beatDurationSec: number;
  substepsPerBeat: number;
};

type CalculatorFeedbackLed =
  | "rejected"
  | "builder_changed"
  | "settings_changed"
  | "roll_updated"
  | "substep_executed";

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

let inputOutcomeAudioContext: AudioContext | null = null;
let inputOutcomeSchedulerTimer: ReturnType<typeof setInterval> | null = null;
let inputOutcomeQueue: CalculatorFeedbackLed[] = [];
let inputOutcomeNextSlotTimeSec: number | null = null;

const INPUT_OUTCOME_TRANSPORT_DEFAULTS: InputOutcomeTransportConfig = {
  beatDurationSec: 1,
  substepsPerBeat: 16,
};

let inputOutcomeTransportConfig: InputOutcomeTransportConfig = {
  beatDurationSec: INPUT_OUTCOME_TRANSPORT_DEFAULTS.beatDurationSec,
  substepsPerBeat: INPUT_OUTCOME_TRANSPORT_DEFAULTS.substepsPerBeat,
};

const INPUT_OUTCOME_TONES: Record<CalculatorFeedbackLed, InputOutcomeToneSpec> = {
  rejected: {
    frequencyStartHz: 320,
    frequencyEndHz: 240,
    durationMs: 125,
    peakGain: 0.06,
    buzzPulseHz: 90,
  },
  builder_changed: {
    frequencyStartHz: 1040,
    frequencyEndHz: 860,
    durationMs: 125,
    peakGain: 0.042,
    buzzPulseHz: null,
  },
  settings_changed: {
    frequencyStartHz: 720,
    frequencyEndHz: 590,
    durationMs: 125,
    peakGain: 0.042,
    buzzPulseHz: null,
  },
  roll_updated: {
    frequencyStartHz: 2400,
    frequencyEndHz: 1700,
    durationMs: 125,
    peakGain: 0.045,
    buzzPulseHz: null,
  },
  substep_executed: {
    frequencyStartHz: 1800,
    frequencyEndHz: 1260,
    durationMs: 115,
    peakGain: 0.036,
    buzzPulseHz: null,
  },
};

const INPUT_OUTCOME_SCHEDULER_TICK_MS = 25;
const INPUT_OUTCOME_SCHEDULER_LOOKAHEAD_SEC = 0.12;
const INPUT_OUTCOME_SCHEDULER_MIN_LEAD_SEC = 0.01;

const resolveInputOutcomeAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") {
    return null;
  }
  if (inputOutcomeAudioContext && inputOutcomeAudioContext.state !== "closed") {
    return inputOutcomeAudioContext;
  }
  const contextCtor =
    (typeof AudioContext !== "undefined" ? AudioContext : undefined) ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!contextCtor) {
    return null;
  }
  try {
    inputOutcomeAudioContext = new contextCtor();
    return inputOutcomeAudioContext;
  } catch {
    return null;
  }
};

const playInputOutcomeToneWithContext = (
  context: AudioContext,
  outcome: CalculatorFeedbackLed,
  startTimeSec: number,
): void => {
  const spec = INPUT_OUTCOME_TONES[outcome];
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const now = Math.max(context.currentTime, startTimeSec);
  const durationSeconds = Math.max(0.02, spec.durationMs / 1000);
  const attackSeconds = 0.004;
  const endTime = now + durationSeconds;
  const releaseStart = endTime - Math.min(0.03, durationSeconds * 0.45);
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(spec.frequencyStartHz, now);
  oscillator.frequency.exponentialRampToValueAtTime(spec.frequencyEndHz, endTime);
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(0.0001, now);
  if (spec.buzzPulseHz && spec.buzzPulseHz > 0) {
    const pulseHalfPeriod = 1 / (spec.buzzPulseHz * 2);
    const pulseHigh = spec.peakGain;
    const pulseLow = Math.max(0.0001, spec.peakGain * 0.15);
    gainNode.gain.linearRampToValueAtTime(pulseHigh, now + attackSeconds);
    let time = now + attackSeconds;
    while (time < releaseStart) {
      time += pulseHalfPeriod;
      gainNode.gain.setValueAtTime(pulseLow, Math.min(time, releaseStart));
      time += pulseHalfPeriod;
      gainNode.gain.setValueAtTime(pulseHigh, Math.min(time, releaseStart));
    }
  } else {
    gainNode.gain.linearRampToValueAtTime(spec.peakGain, now + attackSeconds);
  }
  gainNode.gain.setValueAtTime(Math.max(0.0001, spec.peakGain * 0.4), releaseStart);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(endTime);
  oscillator.onended = () => {
    oscillator.disconnect();
    gainNode.disconnect();
  };
};

const resolveNextGridTime = (timeSec: number, stepDurationSec: number): number => {
  if (!Number.isFinite(timeSec) || !Number.isFinite(stepDurationSec) || stepDurationSec <= 0) {
    return timeSec;
  }
  const stepIndex = Math.floor(timeSec / stepDurationSec) + 1;
  return stepIndex * stepDurationSec;
};

const getInputOutcomeSubstepDurationSec = (): number =>
  inputOutcomeTransportConfig.beatDurationSec / inputOutcomeTransportConfig.substepsPerBeat;

const scheduleInputOutcomeQueue = (context: AudioContext): void => {
  if (inputOutcomeQueue.length <= 0) {
    inputOutcomeNextSlotTimeSec = null;
    return;
  }
  const now = context.currentTime;
  const scheduleUntil = now + INPUT_OUTCOME_SCHEDULER_LOOKAHEAD_SEC;
  const substepDurationSec = getInputOutcomeSubstepDurationSec();
  if (!Number.isFinite(substepDurationSec) || substepDurationSec <= 0) {
    return;
  }
  if (inputOutcomeNextSlotTimeSec === null) {
    inputOutcomeNextSlotTimeSec = resolveNextGridTime(
      scheduleUntil + INPUT_OUTCOME_SCHEDULER_MIN_LEAD_SEC,
      substepDurationSec,
    );
  }
  while (inputOutcomeQueue.length > 0 && inputOutcomeNextSlotTimeSec <= scheduleUntil) {
    const nextOutcome = inputOutcomeQueue.shift();
    if (!nextOutcome) {
      break;
    }
    playInputOutcomeToneWithContext(context, nextOutcome, inputOutcomeNextSlotTimeSec);
    inputOutcomeNextSlotTimeSec += substepDurationSec;
  }
};

const runInputOutcomeSchedulerTick = (): void => {
  const context = resolveInputOutcomeAudioContext();
  if (!context) {
    return;
  }
  if (inputOutcomeQueue.length <= 0) {
    inputOutcomeNextSlotTimeSec = null;
    if (inputOutcomeSchedulerTimer !== null) {
      clearInterval(inputOutcomeSchedulerTimer);
      inputOutcomeSchedulerTimer = null;
    }
    return;
  }
  if (context.state === "suspended") {
    void context.resume().then(() => {
      if (context.state === "running") {
        scheduleInputOutcomeQueue(context);
      }
    }).catch(() => undefined);
    return;
  }
  if (context.state !== "running") {
    return;
  }
  scheduleInputOutcomeQueue(context);
};

const ensureInputOutcomeScheduler = (): void => {
  if (!resolveInputOutcomeAudioContext()) {
    return;
  }
  if (inputOutcomeSchedulerTimer !== null) {
    return;
  }
  inputOutcomeSchedulerTimer = setInterval(runInputOutcomeSchedulerTick, INPUT_OUTCOME_SCHEDULER_TICK_MS);
};

const enqueueCalculatorInputOutcomeTone = (outcome: CalculatorFeedbackLed): void => {
  inputOutcomeQueue.push(outcome);
  ensureInputOutcomeScheduler();
  runInputOutcomeSchedulerTick();
};

export const configureCalculatorInputOutcomeAudioTransport = (options: {
  beatDurationMs?: number | null;
  substepsPerBeat?: number | null;
}): void => {
  const beatDurationSec =
    options.beatDurationMs != null
      ? Math.max(0.02, Number(options.beatDurationMs) / 1000)
      : inputOutcomeTransportConfig.beatDurationSec;
  const substepsPerBeat =
    options.substepsPerBeat != null
      ? Math.max(1, Math.trunc(Number(options.substepsPerBeat)))
      : inputOutcomeTransportConfig.substepsPerBeat;
  inputOutcomeTransportConfig = {
    beatDurationSec,
    substepsPerBeat,
  };
  // Hard snap: queued future sounds re-align to the next substep on the new grid.
  inputOutcomeNextSlotTimeSec = null;
  if (inputOutcomeQueue.length > 0) {
    ensureInputOutcomeScheduler();
    runInputOutcomeSchedulerTick();
  }
};

export const resetCalculatorInputOutcomeAudioTransportForTests = (): void => {
  if (inputOutcomeSchedulerTimer !== null) {
    clearInterval(inputOutcomeSchedulerTimer);
    inputOutcomeSchedulerTimer = null;
  }
  inputOutcomeQueue = [];
  inputOutcomeNextSlotTimeSec = null;
  inputOutcomeTransportConfig = {
    beatDurationSec: INPUT_OUTCOME_TRANSPORT_DEFAULTS.beatDurationSec,
    substepsPerBeat: INPUT_OUTCOME_TRANSPORT_DEFAULTS.substepsPerBeat,
  };
};

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

export const triggerExecutionGateRejectBlink = (root: Element, rejectCount: number | null | undefined): void => {
  const normalizedRejectCount = Math.max(0, Math.trunc(rejectCount ?? 0));
  if (normalizedRejectCount <= 0) {
    return;
  }
  const displayWindow = root.querySelector<HTMLElement>("[data-display-window]");
  if (!displayWindow) {
    return;
  }
  displayWindow.classList.remove("display--slot-reject-blink");
  // Force reflow so repeated rejections retrigger animation.
  void displayWindow.offsetWidth;
  displayWindow.classList.add("display--slot-reject-blink");
};

export const triggerCalculatorInputOutcomeLed = (
  root: Element,
  outcome: CalculatorFeedbackLed,
  triggerCount: number | null | undefined,
): void => {
  const normalizedTriggerCount = Math.max(0, Math.trunc(triggerCount ?? 0));
  if (normalizedTriggerCount <= 0) {
    return;
  }
  if (root instanceof HTMLElement && root.hidden) {
    return;
  }
  const target = root.querySelector<HTMLElement>(`[data-calc-led='${outcome}']`);
  if (!target) {
    return;
  }
  enqueueCalculatorInputOutcomeTone(outcome);
  const pulseClass = {
    rejected: "calc-led--pulse-red",
    builder_changed: "calc-led--pulse-blue",
    settings_changed: "calc-led--pulse-orange",
    roll_updated: "calc-led--pulse-green",
    substep_executed: "calc-led--pulse-white",
  }[outcome];
  target.classList.remove(pulseClass);
  // Force reflow so repeated outcomes retrigger the LED pulse.
  void target.offsetWidth;
  target.classList.add(pulseClass);
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
