import type { GameState } from "../../../src/domain/types.js";
import { VISUALIZER_REGISTRY } from "./visualizers/registry.js";
import type { VisualizerHostPanel } from "./visualizers/types.js";

type VisualizerTransitionPhase = "idle" | "enter" | "exit" | "swap";

const TRANSITION_DURATION_MS = 220;
const LOCK_HEIGHT_VAR = "--v2-visualizer-lock-height";

let previousActivePanel: VisualizerHostPanel = "total";
let transitionUnlockTimer: ReturnType<typeof setTimeout> | null = null;
let transitionUnlockHost: HTMLElement | null = null;
let transitionEndHost: HTMLElement | null = null;
let transitionEndListener: ((event: Event) => void) | null = null;

const clearTransitionUnlockTimer = (): void => {
  if (transitionUnlockTimer !== null) {
    globalThis.clearTimeout(transitionUnlockTimer);
    transitionUnlockTimer = null;
  }
};

const clearTransitionEndListener = (): void => {
  if (!transitionEndHost || !transitionEndListener) {
    return;
  }
  transitionEndHost.removeEventListener("transitionend", transitionEndListener);
  transitionEndHost = null;
  transitionEndListener = null;
};

const releaseSwapLock = (host: HTMLElement): void => {
  if (transitionUnlockHost === host) {
    transitionUnlockHost = null;
  }
  host.removeAttribute("data-v2-visualizer-height-lock");
  host.style.removeProperty(LOCK_HEIGHT_VAR);
  clearTransitionEndListener();
  clearTransitionUnlockTimer();
};

const scheduleSwapUnlock = (host: HTMLElement): void => {
  if (transitionUnlockHost && transitionUnlockHost !== host) {
    releaseSwapLock(transitionUnlockHost);
  }
  transitionUnlockHost = host;
  clearTransitionEndListener();
  transitionEndHost = host;
  transitionEndListener = (event: Event) => {
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
    releaseSwapLock(host);
  };
  host.addEventListener("transitionend", transitionEndListener);
  clearTransitionUnlockTimer();
  transitionUnlockTimer = globalThis.setTimeout(() => {
    releaseSwapLock(host);
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

const clearHostUiState = (root: Element): void => {
  const host = root.querySelector<HTMLElement>("[data-v2-visualizer-host]");
  const graphDevice = root.querySelector<HTMLElement>("[data-grapher-device]");
  const feedPanel = root.querySelector<HTMLElement>("[data-v2-feed-panel]");
  const totalPanel = root.querySelector<HTMLElement>("[data-v2-total-panel]");
  if (host) {
    host.dataset.v2VisualizerPanel = "total";
    host.dataset.v2VisualizerTransition = "idle";
    host.dataset.v2VisualizerFrom = "total";
    host.dataset.v2VisualizerTo = "total";
    host.setAttribute("aria-hidden", "true");
    releaseSwapLock(host);
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
};

export const resolveActiveVisualizerPanel = (state: GameState): VisualizerHostPanel => {
  const active = state.ui.activeVisualizer;
  if (active === "total") {
    return "total";
  }
  return VISUALIZER_REGISTRY.some((panel) => panel.id === active) ? active : "total";
};

export const renderVisualizerHost = (root: Element, state: GameState): void => {
  const host = root.querySelector<HTMLElement>("[data-v2-visualizer-host]");
  const graphDevice = root.querySelector<HTMLElement>("[data-grapher-device]");
  const feedPanel = root.querySelector<HTMLElement>("[data-v2-feed-panel]");
  const totalPanel = root.querySelector<HTMLElement>("[data-v2-total-panel]");
  const activePanel = resolveActiveVisualizerPanel(state);
  const transitionPhase = resolveTransitionPhase(previousActivePanel, activePanel);
  const previousPanel = previousActivePanel;

  if (host) {
    if (transitionPhase === "swap") {
      const hostHeight = Math.max(1, Math.round(host.getBoundingClientRect().height));
      host.style.setProperty(LOCK_HEIGHT_VAR, `${hostHeight.toString()}px`);
      host.setAttribute("data-v2-visualizer-height-lock", "true");
      scheduleSwapUnlock(host);
    } else {
      releaseSwapLock(host);
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

  for (const panel of VISUALIZER_REGISTRY) {
    if (panel.id === activePanel) {
      panel.render(root, state);
    } else {
      panel.clear(root);
    }
  }

  previousActivePanel = activePanel;
};

export const clearVisualizerHost = (root: Element): void => {
  previousActivePanel = "total";
  if (transitionUnlockHost) {
    releaseSwapLock(transitionUnlockHost);
  } else {
    clearTransitionEndListener();
    clearTransitionUnlockTimer();
  }
  for (const panel of VISUALIZER_REGISTRY) {
    panel.clear(root);
  }
  clearHostUiState(root);
};
