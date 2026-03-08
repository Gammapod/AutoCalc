import type { Key } from "../../../domain/types.js";
import { resetAllUiRuntimeForTests } from "../../runtime/registry.js";
import { getFallbackInputTestState, getInputModuleState } from "./runtime.js";

const QUICK_TAP_PRESS_MIN_VISIBLE_MS = 55;
const PROGRAMMATIC_PRESS_MIN_VISIBLE_MS = 140;

const programmaticPressReleaseTimers = new WeakMap<HTMLButtonElement, ReturnType<typeof setTimeout>>();

const beginProgrammaticPressVisual = (button: HTMLButtonElement): void => {
  const existingTimer = programmaticPressReleaseTimers.get(button);
  if (existingTimer) {
    clearTimeout(existingTimer);
    programmaticPressReleaseTimers.delete(button);
  }
  button.classList.remove("key--quick-press");
  void button.offsetWidth;
  button.classList.add("key--quick-press");
  const releaseTimer = setTimeout(() => {
    programmaticPressReleaseTimers.delete(button);
    button.classList.remove("key--quick-press");
  }, PROGRAMMATIC_PRESS_MIN_VISIBLE_MS);
  programmaticPressReleaseTimers.set(button, releaseTimer);
};

export const playProgrammaticKeyPressFeedback = (root: ParentNode, key: Key): void => {
  const candidates = Array.from(root.querySelectorAll<HTMLButtonElement>(".key[data-key]"));
  const matching = candidates.filter((button) => button.dataset.key === key && !button.disabled);
  if (matching.length === 0) {
    return;
  }
  const keypadButton = matching.find((button) => button.dataset.layoutSurface === "keypad");
  beginProgrammaticPressVisual(keypadButton ?? matching[0]);
};

const getFallbackTestRuntime = () => getFallbackInputTestState();

export const isInputAnimationLocked = (root?: Element): boolean => {
  const state = root ? getInputModuleState(root) : getFallbackTestRuntime();
  return state.inputAnimationLockCount > 0;
};

export const beginInputAnimationLock = (fallbackMs: number, root?: Element): (() => void) => {
  const state = root ? getInputModuleState(root) : getFallbackTestRuntime();
  state.inputAnimationLockCount += 1;
  let released = false;
  const release = (): void => {
    if (released) {
      return;
    }
    released = true;
    if (timerId !== null) {
      window.clearTimeout(timerId);
    }
    state.inputAnimationLockCount = Math.max(0, state.inputAnimationLockCount - 1);
  };
  const timerId =
    typeof window !== "undefined" && fallbackMs > 0 ? window.setTimeout(release, fallbackMs) : null;
  return release;
};

export const shouldSuppressClick = (root?: Element): boolean => {
  const state = root ? getInputModuleState(root) : getFallbackTestRuntime();
  return Date.now() < state.suppressClicksUntil || isInputAnimationLocked(root);
};

export const shouldSuppressClickForTests = (): boolean => shouldSuppressClick();

export const setSuppressClicksUntilForTests = (timestampMs: number): void => {
  getFallbackTestRuntime().suppressClicksUntil = timestampMs;
};

export const resetInputLockStateForTests = (): void => {
  const state = getFallbackTestRuntime();
  state.suppressClicksUntil = 0;
  state.inputAnimationLockCount = 0;
  resetAllUiRuntimeForTests();
};

export const bindQuickTapPressFeedback = (root: Element, element: HTMLButtonElement): void => {
  const state = getInputModuleState(root);
  if (state.boundQuickTapButtons.has(element)) {
    return;
  }
  state.boundQuickTapButtons.add(element);

  let pressStartedAt = 0;
  let isPressedVisualActive = false;
  let releaseTimer: ReturnType<typeof setTimeout> | null = null;

  const setPressedVisualActive = (active: boolean): void => {
    if (isPressedVisualActive === active) {
      return;
    }
    isPressedVisualActive = active;
    element.classList.toggle("key--quick-press", active);
  };

  const clearReleaseTimer = (): void => {
    if (releaseTimer === null) {
      return;
    }
    clearTimeout(releaseTimer);
    releaseTimer = null;
  };

  const beginPressVisual = (): void => {
    if (element.disabled) {
      return;
    }
    clearReleaseTimer();
    pressStartedAt = performance.now();
    setPressedVisualActive(true);
  };

  const endPressVisual = (): void => {
    if (!isPressedVisualActive) {
      return;
    }
    const elapsedMs = performance.now() - pressStartedAt;
    const remainingMs = Math.max(0, QUICK_TAP_PRESS_MIN_VISIBLE_MS - elapsedMs);
    if (remainingMs <= 0) {
      setPressedVisualActive(false);
      return;
    }
    clearReleaseTimer();
    releaseTimer = setTimeout(() => {
      releaseTimer = null;
      setPressedVisualActive(false);
    }, remainingMs);
  };

  element.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    beginPressVisual();
    const onPointerUp = (): void => {
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerUp, true);
      endPressVisual();
    };
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerUp, true);
  });

  element.addEventListener("keydown", (event) => {
    if (event.repeat) {
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      beginPressVisual();
    }
  });

  element.addEventListener("keyup", (event) => {
    if (event.key === " " || event.key === "Enter") {
      endPressVisual();
    }
  });

  element.addEventListener("blur", () => {
    endPressVisual();
  });
};

