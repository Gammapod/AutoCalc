import type { GameState } from "../../../src/domain/types.js";
import { VISUALIZER_REGISTRY } from "./visualizers/registry.js";
import type { VisualizerHostPanel } from "./visualizers/types.js";

type VisualizerTransitionPhase = "idle" | "enter" | "exit" | "swap";

type VisualizerHostRuntime = {
  previousActivePanel: VisualizerHostPanel;
  transitionUnlockTimer: ReturnType<typeof setTimeout> | null;
  transitionUnlockHost: HTMLElement | null;
  transitionEndHost: HTMLElement | null;
  transitionEndListener: ((event: Event) => void) | null;
};

const TRANSITION_DURATION_MS = 220;
const LOCK_HEIGHT_VAR = "--v2-visualizer-lock-height";
const hostRuntimeByRoot = new WeakMap<Element, VisualizerHostRuntime>();
const hostRuntimes = new Set<VisualizerHostRuntime>();

const createHostRuntime = (): VisualizerHostRuntime => ({
  previousActivePanel: "total",
  transitionUnlockTimer: null,
  transitionUnlockHost: null,
  transitionEndHost: null,
  transitionEndListener: null,
});

const getHostRuntime = (root: Element): VisualizerHostRuntime => {
  const existing = hostRuntimeByRoot.get(root);
  if (existing) {
    return existing;
  }
  const created = createHostRuntime();
  hostRuntimeByRoot.set(root, created);
  hostRuntimes.add(created);
  return created;
};

const clearTransitionUnlockTimer = (runtime: VisualizerHostRuntime): void => {
  if (runtime.transitionUnlockTimer !== null) {
    globalThis.clearTimeout(runtime.transitionUnlockTimer);
    runtime.transitionUnlockTimer = null;
  }
};

const clearTransitionEndListener = (runtime: VisualizerHostRuntime): void => {
  if (!runtime.transitionEndHost || !runtime.transitionEndListener) {
    return;
  }
  runtime.transitionEndHost.removeEventListener("transitionend", runtime.transitionEndListener);
  runtime.transitionEndHost = null;
  runtime.transitionEndListener = null;
};

const releaseSwapLock = (runtime: VisualizerHostRuntime, host: HTMLElement): void => {
  if (runtime.transitionUnlockHost === host) {
    runtime.transitionUnlockHost = null;
  }
  host.removeAttribute("data-v2-visualizer-height-lock");
  host.style.removeProperty(LOCK_HEIGHT_VAR);
  clearTransitionEndListener(runtime);
  clearTransitionUnlockTimer(runtime);
};

const scheduleSwapUnlock = (runtime: VisualizerHostRuntime, host: HTMLElement): void => {
  if (runtime.transitionUnlockHost && runtime.transitionUnlockHost !== host) {
    releaseSwapLock(runtime, runtime.transitionUnlockHost);
  }
  runtime.transitionUnlockHost = host;
  clearTransitionEndListener(runtime);
  runtime.transitionEndHost = host;
  runtime.transitionEndListener = (event: Event) => {
    if (
      typeof TransitionEvent !== "undefined" &&
      !(event instanceof TransitionEvent)
    ) {
      return;
    }
    const propertyName = (event as Event & { propertyName?: string }).propertyName;
    if (propertyName !== "height") {
      return;
    }
    releaseSwapLock(runtime, host);
  };
  host.addEventListener("transitionend", runtime.transitionEndListener);
  clearTransitionUnlockTimer(runtime);
  runtime.transitionUnlockTimer = globalThis.setTimeout(() => {
    releaseSwapLock(runtime, host);
  }, TRANSITION_DURATION_MS + 40);
};

const resolveTransitionPhase = (
  previousPanel: VisualizerHostPanel,
  nextPanel: VisualizerHostPanel,
): VisualizerTransitionPhase => {
  const previousIsBaseline = previousPanel === "total";
  const nextIsBaseline = nextPanel === "total";
  if (previousPanel === nextPanel) {
    return "idle";
  }
  if (previousIsBaseline && !nextIsBaseline) {
    return "enter";
  }
  if (!previousIsBaseline && nextIsBaseline) {
    return "exit";
  }
  if (!previousIsBaseline && !nextIsBaseline) {
    return "swap";
  }
  return "idle";
};

const clearHostUiState = (runtime: VisualizerHostRuntime, root: Element): void => {
  const host = root.querySelector<HTMLElement>("[data-v2-visualizer-host]");
  const graphDevice = root.querySelector<HTMLElement>("[data-grapher-device]");
  const feedPanel = root.querySelector<HTMLElement>("[data-v2-feed-panel]");
  const totalPanel = root.querySelector<HTMLElement>("[data-v2-total-panel]");
  const circlePanel = root.querySelector<HTMLElement>("[data-v2-circle-panel]");
  if (host) {
    host.dataset.v2VisualizerPanel = "total";
    host.dataset.v2VisualizerTransition = "idle";
    host.dataset.v2VisualizerFrom = "total";
    host.dataset.v2VisualizerTo = "total";
    host.setAttribute("aria-hidden", "true");
    releaseSwapLock(runtime, host);
  }
  if (graphDevice) {
    graphDevice.setAttribute("aria-hidden", "true");
  }
  if (feedPanel) {
    feedPanel.setAttribute("aria-hidden", "true");
  }
  if (totalPanel) {
    totalPanel.setAttribute("aria-hidden", "true");
  }
  if (circlePanel) {
    circlePanel.setAttribute("aria-hidden", "true");
  }
};

export const resolveActiveVisualizerPanel = (state: GameState): VisualizerHostPanel => {
  const active = state.ui.activeVisualizer;
  if (active === "total") {
    return "total";
  }
  return VISUALIZER_REGISTRY.some((panel) => panel.id === active) ? active : "total";
};

export const renderVisualizerHost = (root: Element, state: GameState): void => {
  const runtime = getHostRuntime(root);
  const host = root.querySelector<HTMLElement>("[data-v2-visualizer-host]");
  const graphDevice = root.querySelector<HTMLElement>("[data-grapher-device]");
  const feedPanel = root.querySelector<HTMLElement>("[data-v2-feed-panel]");
  const totalPanel = root.querySelector<HTMLElement>("[data-v2-total-panel]");
  const circlePanel = root.querySelector<HTMLElement>("[data-v2-circle-panel]");
  const activePanel = resolveActiveVisualizerPanel(state);
  const transitionPhase = resolveTransitionPhase(runtime.previousActivePanel, activePanel);
  const previousPanel = runtime.previousActivePanel;

  if (host) {
    if (transitionPhase === "swap") {
      const hostHeight = Math.max(1, Math.round(host.getBoundingClientRect().height));
      host.style.setProperty(LOCK_HEIGHT_VAR, `${hostHeight.toString()}px`);
      host.setAttribute("data-v2-visualizer-height-lock", "true");
      scheduleSwapUnlock(runtime, host);
    } else {
      releaseSwapLock(runtime, host);
    }
    host.dataset.v2VisualizerPanel = activePanel;
    host.dataset.v2VisualizerTransition = transitionPhase;
    host.dataset.v2VisualizerFrom = previousPanel;
    host.dataset.v2VisualizerTo = activePanel;
    host.setAttribute("aria-hidden", "false");
  }

  if (graphDevice) {
    graphDevice.setAttribute("aria-hidden", activePanel === "graph" ? "false" : "true");
  }
  if (feedPanel) {
    feedPanel.setAttribute("aria-hidden", activePanel === "feed" ? "false" : "true");
  }
  if (totalPanel) {
    totalPanel.setAttribute("aria-hidden", activePanel === "total" ? "false" : "true");
  }
  if (circlePanel) {
    circlePanel.setAttribute("aria-hidden", activePanel === "circle" ? "false" : "true");
  }

  for (const panel of VISUALIZER_REGISTRY) {
    if (panel.id === activePanel) {
      panel.render(root, state);
    } else {
      panel.clear(root);
    }
  }

  runtime.previousActivePanel = activePanel;
};

const clearRuntime = (runtime: VisualizerHostRuntime): void => {
  runtime.previousActivePanel = "total";
  if (runtime.transitionUnlockHost) {
    releaseSwapLock(runtime, runtime.transitionUnlockHost);
  } else {
    clearTransitionEndListener(runtime);
    clearTransitionUnlockTimer(runtime);
  }
};

export const clearVisualizerHost = (root: Element): void => {
  const runtime = hostRuntimeByRoot.get(root) ?? getHostRuntime(root);
  clearRuntime(runtime);
  for (const panel of VISUALIZER_REGISTRY) {
    panel.clear(root);
  }
  clearHostUiState(runtime, root);
};

const clearAllVisualizerHostRuntimesForTests = (): void => {
  for (const runtime of hostRuntimes) {
    clearRuntime(runtime);
  }
};
