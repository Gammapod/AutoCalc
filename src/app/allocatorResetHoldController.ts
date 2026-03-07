const ALLOCATOR_RESET_HOLD_MS = 1500;
const ALLOCATOR_RESET_INDICATOR_DELAY_MS = 80;
const ALLOCATOR_RESET_PROGRESS_EXPONENT = 8;

type AllocatorResetHoldControllerDeps = {
  button: HTMLButtonElement;
  isInputBlocked: () => boolean;
  onActivated: () => Promise<void>;
};

export const createAllocatorResetHoldController = ({
  button,
  isInputBlocked,
  onActivated,
}: AllocatorResetHoldControllerDeps) => {
  let allocatorResetHoldTimer: number | null = null;
  let allocatorResetIndicatorTimer: number | null = null;
  let allocatorResetHoldRaf: number | null = null;
  let allocatorResetHolding = false;
  let allocatorResetTriggered = false;
  let allocatorResetHoldStartedAt = 0;
  let allocatorResetKeyboardHold = false;
  const cleanupCallbacks: Array<() => void> = [];

  const clearAllocatorResetHoldVisuals = (): void => {
    button.classList.remove("allocator-mode-action--holding", "allocator-mode-action--hold-visible");
    button.style.setProperty("--hold-progress", "0");
  };

  const clearAllocatorResetHoldTimers = (): void => {
    if (allocatorResetHoldTimer !== null) {
      window.clearTimeout(allocatorResetHoldTimer);
      allocatorResetHoldTimer = null;
    }
    if (allocatorResetIndicatorTimer !== null) {
      window.clearTimeout(allocatorResetIndicatorTimer);
      allocatorResetIndicatorTimer = null;
    }
    if (allocatorResetHoldRaf !== null) {
      window.cancelAnimationFrame(allocatorResetHoldRaf);
      allocatorResetHoldRaf = null;
    }
  };

  const stopAllocatorResetHold = (): void => {
    clearAllocatorResetHoldTimers();
    allocatorResetHolding = false;
    allocatorResetKeyboardHold = false;
    clearAllocatorResetHoldVisuals();
  };

  const updateAllocatorResetHoldProgress = (): void => {
    if (!allocatorResetHolding) {
      return;
    }
    const elapsed = performance.now() - allocatorResetHoldStartedAt;
    const progressWindowMs = ALLOCATOR_RESET_HOLD_MS - ALLOCATOR_RESET_INDICATOR_DELAY_MS;
    const progressElapsed = Math.max(0, elapsed - ALLOCATOR_RESET_INDICATOR_DELAY_MS);
    const linearProgress = Math.max(0, Math.min(1, progressElapsed / progressWindowMs));
    const easedProgress =
      linearProgress <= 0
        ? 0
        : linearProgress >= 1
          ? 1
          : Math.pow(2, ALLOCATOR_RESET_PROGRESS_EXPONENT * (linearProgress - 1));
    button.style.setProperty("--hold-progress", easedProgress.toFixed(4));
    allocatorResetHoldRaf = window.requestAnimationFrame(updateAllocatorResetHoldProgress);
  };

  const triggerAllocatorResetHold = async (): Promise<void> => {
    if (!allocatorResetHolding || allocatorResetTriggered) {
      return;
    }
    allocatorResetTriggered = true;
    button.classList.add("allocator-mode-action--hold-visible");
    button.style.setProperty("--hold-progress", "1");
    stopAllocatorResetHold();
    await onActivated();
  };

  const startAllocatorResetHold = (): void => {
    if (allocatorResetHolding || button.disabled || isInputBlocked()) {
      return;
    }
    allocatorResetHolding = true;
    allocatorResetTriggered = false;
    allocatorResetHoldStartedAt = performance.now();
    button.classList.add("allocator-mode-action--holding");
    button.classList.remove("allocator-mode-action--hold-visible");
    button.style.setProperty("--hold-progress", "0");

    allocatorResetIndicatorTimer = window.setTimeout(() => {
      if (!allocatorResetHolding || allocatorResetTriggered) {
        return;
      }
      button.classList.add("allocator-mode-action--hold-visible");
    }, ALLOCATOR_RESET_INDICATOR_DELAY_MS);

    allocatorResetHoldTimer = window.setTimeout(() => {
      void triggerAllocatorResetHold();
    }, ALLOCATOR_RESET_HOLD_MS);

    updateAllocatorResetHoldProgress();
  };

  const cancelAllocatorResetHold = (): void => {
    if (!allocatorResetHolding || allocatorResetTriggered) {
      return;
    }
    stopAllocatorResetHold();
  };

  const listen = <T extends EventTarget>(
    target: T,
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean,
  ): void => {
    target.addEventListener(type, handler, options);
    cleanupCallbacks.push(() => {
      target.removeEventListener(type, handler, options);
    });
  };

  listen(button, "pointerdown", (event) => {
    const pointerEvent = event as PointerEvent;
    if (pointerEvent.button !== 0) {
      return;
    }
    startAllocatorResetHold();
  });

  listen(button, "pointerup", () => {
    cancelAllocatorResetHold();
  });

  listen(button, "pointercancel", () => {
    cancelAllocatorResetHold();
  });

  listen(window, "pointerup", cancelAllocatorResetHold);
  listen(window, "pointercancel", cancelAllocatorResetHold);
  listen(window, "mouseup", cancelAllocatorResetHold);
  listen(window, "touchend", cancelAllocatorResetHold);
  listen(window, "touchcancel", cancelAllocatorResetHold);

  listen(button, "keydown", (event) => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.repeat) {
      return;
    }
    if (keyboardEvent.key !== " " && keyboardEvent.key !== "Enter") {
      return;
    }
    keyboardEvent.preventDefault();
    allocatorResetKeyboardHold = true;
    startAllocatorResetHold();
  });

  listen(button, "keyup", (event) => {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key !== " " && keyboardEvent.key !== "Enter") {
      return;
    }
    keyboardEvent.preventDefault();
    if (!allocatorResetKeyboardHold) {
      return;
    }
    cancelAllocatorResetHold();
  });

  listen(button, "blur", () => {
    cancelAllocatorResetHold();
  });

  listen(
    button,
    "click",
    (event) => {
      // Activation is handled by press-and-hold timing, not click.
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    { capture: true },
  );

  listen(document, "visibilitychange", () => {
    if (document.visibilityState !== "visible") {
      cancelAllocatorResetHold();
    }
  });

  return {
    dispose: () => {
      stopAllocatorResetHold();
      for (const cleanup of cleanupCallbacks.splice(0)) {
        cleanup();
      }
    },
  };
};
