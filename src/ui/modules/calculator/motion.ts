import { beginInputAnimationLock } from "../input/pressFeedback.js";

const INPUT_LOCK_FALLBACK_BUFFER_MS = 80;

export const shouldReduceMotion = (): boolean => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const bindAnimationLock = (
  element: HTMLElement,
  matchesAnimationName: (animationName: string) => boolean,
  fallbackMs: number,
): void => {
  let releaseLock: (() => void) | null = null;
  const controller = new AbortController();
  const releaseAndCleanup = (): void => {
    if (!releaseLock) {
      return;
    }
    const release = releaseLock;
    releaseLock = null;
    release();
    controller.abort();
  };

  element.addEventListener(
    "animationstart",
    (event: Event) => {
      const animationEvent = event as AnimationEvent;
      if (!matchesAnimationName(animationEvent.animationName) || releaseLock) {
        return;
      }
      const runtimeRoot = element.closest("#app") ?? undefined;
      releaseLock = beginInputAnimationLock(fallbackMs + INPUT_LOCK_FALLBACK_BUFFER_MS, runtimeRoot ?? undefined);
    },
    { signal: controller.signal },
  );
  element.addEventListener(
    "animationend",
    (event: Event) => {
      const animationEvent = event as AnimationEvent;
      if (!matchesAnimationName(animationEvent.animationName)) {
        return;
      }
      releaseAndCleanup();
    },
    { signal: controller.signal },
  );
  element.addEventListener(
    "animationcancel",
    (event: Event) => {
      const animationEvent = event as AnimationEvent;
      if (!matchesAnimationName(animationEvent.animationName)) {
        return;
      }
      releaseAndCleanup();
    },
    { signal: controller.signal },
  );
};

export const bindExactAnimationLock = (element: HTMLElement, animationName: string, fallbackMs: number): void => {
  bindAnimationLock(element, (activeAnimationName) => activeAnimationName === animationName, fallbackMs);
};

export const bindPrefixedAnimationLock = (element: HTMLElement, animationPrefix: string, fallbackMs: number): void => {
  bindAnimationLock(
    element,
    (activeAnimationName) => activeAnimationName.startsWith(animationPrefix),
    fallbackMs,
  );
};

export const bindPrefixedAnimationCompletion = (
  element: HTMLElement,
  animationPrefix: string,
  onComplete: () => void,
): void => {
  let completed = false;
  const finish = (): void => {
    if (completed) {
      return;
    }
    completed = true;
    onComplete();
  };

  element.addEventListener("animationend", (event: Event) => {
    const animationEvent = event as AnimationEvent;
    if (!animationEvent.animationName.startsWith(animationPrefix)) {
      return;
    }
    finish();
  });
  element.addEventListener("animationcancel", (event: Event) => {
    const animationEvent = event as AnimationEvent;
    if (!animationEvent.animationName.startsWith(animationPrefix)) {
      return;
    }
    finish();
  });
};

export const collectKeypadCellRects = (container: Element): Map<string, DOMRect> => {
  const rects = new Map<string, DOMRect>();
  for (const element of Array.from(container.children)) {
    if (!(element instanceof HTMLElement)) {
      continue;
    }
    const cellId = element.dataset.keypadCellId;
    if (!cellId) {
      continue;
    }
    rects.set(cellId, element.getBoundingClientRect());
  }
  return rects;
};

export const playKeypadFlip = (
  container: Element,
  beforeRects: Map<string, DOMRect>,
  options: {
    keypadSlotEnterAnimationName: string;
    keypadSlotEnterDurationMs: number;
  },
): void => {
  if (shouldReduceMotion() || beforeRects.size === 0) {
    return;
  }

  const animatedElements: HTMLElement[] = [];
  for (const element of Array.from(container.children)) {
    if (!(element instanceof HTMLElement)) {
      continue;
    }
    const cellId = element.dataset.keypadCellId;
    if (!cellId) {
      continue;
    }
    if (!beforeRects.has(cellId)) {
      bindExactAnimationLock(element, options.keypadSlotEnterAnimationName, options.keypadSlotEnterDurationMs);
      element.classList.add("keypad-slot-enter");
      animatedElements.push(element);
    }
  }

  if (animatedElements.length === 0) {
    return;
  }

  for (const element of animatedElements) {
    window.setTimeout(() => {
      element.classList.remove("keypad-slot-enter");
    }, options.keypadSlotEnterDurationMs + 20);
  }
};
