import type { CalculatorId, GameState } from "../../domain/types.js";
import { VISUALIZER_REGISTRY } from "./visualizers/registry.js";
import type { VisualizerHostPanel } from "./visualizers/types.js";
import { getOrCreateRuntime } from "../runtime/registry.js";
import { projectCalculatorToLegacy } from "../../domain/multiCalculator.js";

type VisualizerTransitionPhase = "idle" | "enter" | "exit" | "swap";

export type VisualizerHostModuleState = {
  previousActivePanel: VisualizerHostPanel;
  graphDormant: boolean;
  transitionUnlockTimer: ReturnType<typeof setTimeout> | null;
  transitionUnlockHost: HTMLElement | null;
  transitionEndHost: HTMLElement | null;
  transitionEndListener: ((event: Event) => void) | null;
};

const TRANSITION_DURATION_MS = 220;
const LOCK_HEIGHT_VAR = "--v2-visualizer-lock-height";
const SCALE_VAR = "--v2-visualizer-scale";
const FIXED_WIDTH_VAR = "--v2-visualizer-fixed-width";
const FIXED_WIDTH_PX = 460;
const VIEWPORT_PADDING_PX = 32;

const createHostRuntime = (): VisualizerHostModuleState => ({
  previousActivePanel: "total",
  graphDormant: true,
  transitionUnlockTimer: null,
  transitionUnlockHost: null,
  transitionEndHost: null,
  transitionEndListener: null,
});

const getHostRuntime = (root: Element): VisualizerHostModuleState => {
  const moduleRuntime = getOrCreateRuntime(root).visualizerHost;
  if (moduleRuntime.moduleState) {
    return moduleRuntime.moduleState;
  }
  const created = createHostRuntime();
  moduleRuntime.moduleState = created;
  moduleRuntime.dispose = () => {
    clearRuntime(created);
    moduleRuntime.moduleState = createHostRuntime();
  };
  moduleRuntime.resetForTests = () => {
    clearRuntime(created);
  };
  return created;
};

const clearTransitionUnlockTimer = (runtime: VisualizerHostModuleState): void => {
  if (runtime.transitionUnlockTimer !== null) {
    globalThis.clearTimeout(runtime.transitionUnlockTimer);
    runtime.transitionUnlockTimer = null;
  }
};

const clearTransitionEndListener = (runtime: VisualizerHostModuleState): void => {
  if (!runtime.transitionEndHost || !runtime.transitionEndListener) {
    return;
  }
  runtime.transitionEndHost.removeEventListener("transitionend", runtime.transitionEndListener);
  runtime.transitionEndHost = null;
  runtime.transitionEndListener = null;
};

const releaseSwapLock = (runtime: VisualizerHostModuleState, host: HTMLElement): void => {
  if (runtime.transitionUnlockHost === host) {
    runtime.transitionUnlockHost = null;
  }
  host.removeAttribute("data-v2-visualizer-height-lock");
  host.style.removeProperty(LOCK_HEIGHT_VAR);
  clearTransitionEndListener(runtime);
  clearTransitionUnlockTimer(runtime);
};

const scheduleSwapUnlock = (runtime: VisualizerHostModuleState, host: HTMLElement): void => {
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

const clearHostUiState = (runtime: VisualizerHostModuleState, root: Element): void => {
  const host = root.querySelector<HTMLElement>("[data-v2-visualizer-host]");
  const displayWindow = root.querySelector<HTMLElement>("[data-display-window]");
  const graphDevice = root.querySelector<HTMLElement>("[data-grapher-device]");
  const feedPanel = root.querySelector<HTMLElement>("[data-v2-feed-panel]");
  const totalPanel = root.querySelector<HTMLElement>("[data-v2-total-panel]");
  const factorizationPanel = root.querySelector<HTMLElement>("[data-v2-factorization-panel]");
  const titlePanel = root.querySelector<HTMLElement>("[data-v2-title-panel]");
  const releaseNotesPanel = root.querySelector<HTMLElement>("[data-v2-release-notes-panel]");
  const helpPanel = root.querySelector<HTMLElement>("[data-v2-help-panel]");
  const circlePanel = root.querySelector<HTMLElement>("[data-v2-circle-panel]");
  const numberLinePanel = root.querySelector<HTMLElement>("[data-v2-number-line-panel]");
  const eigenAllocatorPanel = root.querySelector<HTMLElement>("[data-v2-eigen-allocator-panel]");
  const algebraicPanel = root.querySelector<HTMLElement>("[data-v2-algebraic-panel]");
  const totalFooter = root.querySelector<HTMLElement>("[data-v2-total-footer]");
  if (host) {
    host.dataset.v2VisualizerPanel = "total";
    host.dataset.v2VisualizerTransition = "idle";
    host.dataset.v2VisualizerFrom = "total";
    host.dataset.v2VisualizerTo = "total";
    host.setAttribute("aria-hidden", "true");
    releaseSwapLock(runtime, host);
    host.dataset.v2FitKind = "";
    host.dataset.v2FitOverflow = "";
    host.dataset.v2FitMaxLines = "";
  }
  if (displayWindow) {
    displayWindow.style.removeProperty(SCALE_VAR);
    displayWindow.style.removeProperty(FIXED_WIDTH_VAR);
  }
  if (graphDevice) {
    graphDevice.setAttribute("aria-hidden", "true");
  }
  if (feedPanel) {
    feedPanel.setAttribute("aria-hidden", "true");
  }
  if (totalPanel) {
    totalPanel.setAttribute("aria-hidden", "false");
  }
  if (factorizationPanel) {
    factorizationPanel.setAttribute("aria-hidden", "true");
  }
  if (titlePanel) {
    titlePanel.setAttribute("aria-hidden", "true");
  }
  if (helpPanel) {
    helpPanel.setAttribute("aria-hidden", "true");
  }
  if (releaseNotesPanel) {
    releaseNotesPanel.setAttribute("aria-hidden", "true");
  }
  if (circlePanel) {
    circlePanel.setAttribute("aria-hidden", "true");
  }
  if (numberLinePanel) {
    numberLinePanel.setAttribute("aria-hidden", "true");
  }
  if (eigenAllocatorPanel) {
    eigenAllocatorPanel.setAttribute("aria-hidden", "true");
  }
  if (algebraicPanel) {
    algebraicPanel.setAttribute("aria-hidden", "true");
  }
  if (titlePanel) {
    titlePanel.setAttribute("aria-hidden", "true");
  }
  if (totalFooter) {
    totalFooter.setAttribute("aria-hidden", "false");
  }
};

const resolveHostScale = (): number => {
  if (typeof window === "undefined") {
    return 1;
  }
  const availableWidth = Math.max(1, window.innerWidth - VIEWPORT_PADDING_PX);
  return Math.min(1, availableWidth / FIXED_WIDTH_PX);
};

const applyHostScale = (root: Element): void => {
  const scale = resolveHostScale();
  const displayWindow = root.querySelector<HTMLElement>("[data-display-window]");
  if (!displayWindow) {
    return;
  }
  displayWindow.style.setProperty(SCALE_VAR, scale.toFixed(4));
};

const applyHostWidthToken = (root: Element, state: GameState): void => {
  const displayWindow = root.querySelector<HTMLElement>("[data-display-window]");
  if (!displayWindow) {
    return;
  }
  const widthToken = state.ui.keypadColumns <= 4
    ? "var(--desktop-calc-width)"
    : `${FIXED_WIDTH_PX.toString()}px`;
  displayWindow.style.setProperty(FIXED_WIDTH_VAR, widthToken);
};

const applyFitContractState = (host: HTMLElement | null, panel: VisualizerHostPanel): void => {
  if (!host || panel === "total") {
    if (host) {
      host.dataset.v2FitKind = "";
      host.dataset.v2FitOverflow = "";
      host.dataset.v2FitMaxLines = "";
    }
    return;
  }
  const module = VISUALIZER_REGISTRY.find((entry) => entry.id === panel);
  if (!module) {
    host.dataset.v2FitKind = "";
    host.dataset.v2FitOverflow = "";
    host.dataset.v2FitMaxLines = "";
    return;
  }
  host.dataset.v2FitKind = module.fit.kind;
  host.dataset.v2FitOverflow = module.fit.overflow;
  host.dataset.v2FitMaxLines = module.fit.budget.maxLines?.toString() ?? "";
};

const shouldRunDevFitDiagnostics = (): boolean => {
  if (typeof location === "undefined") {
    return false;
  }
  return location.hostname === "localhost" || location.hostname === "127.0.0.1";
};

const resolvePanelElement = (root: Element, panel: VisualizerHostPanel): HTMLElement | null => {
  if (panel === "total") {
    return root.querySelector<HTMLElement>("[data-v2-total-panel]");
  }
  if (panel === "graph") {
    return root.querySelector<HTMLElement>("[data-grapher-device]");
  }
  if (panel === "feed") {
    return root.querySelector<HTMLElement>("[data-v2-feed-panel]");
  }
  if (panel === "factorization") {
    return root.querySelector<HTMLElement>("[data-v2-factorization-panel]");
  }
  if (panel === "title") {
    return root.querySelector<HTMLElement>("[data-v2-title-panel]");
  }
  if (panel === "help") {
    return root.querySelector<HTMLElement>("[data-v2-help-panel]");
  }
  if (panel === "release_notes") {
    return root.querySelector<HTMLElement>("[data-v2-release-notes-panel]");
  }
  if (panel === "circle") {
    return root.querySelector<HTMLElement>("[data-v2-circle-panel]");
  }
  if (panel === "number_line") {
    return root.querySelector<HTMLElement>("[data-v2-number-line-panel]");
  }
  if (panel === "eigen_allocator") {
    return root.querySelector<HTMLElement>("[data-v2-eigen-allocator-panel]");
  }
  if (panel === "algebraic") {
    return root.querySelector<HTMLElement>("[data-v2-algebraic-panel]");
  }
  return null;
};

const runDevFitDiagnostics = (root: Element, panel: VisualizerHostPanel): void => {
  if (!shouldRunDevFitDiagnostics() || panel === "total") {
    return;
  }
  const module = VISUALIZER_REGISTRY.find((entry) => entry.id === panel);
  if (!module || module.fit.overflow !== "forbid_scroll") {
    return;
  }
  const panelEl = resolvePanelElement(root, panel);
  if (!panelEl) {
    return;
  }
  const hasHorizontalOverflow = panelEl.scrollWidth > panelEl.clientWidth;
  const hasVerticalOverflow = panelEl.scrollHeight > panelEl.clientHeight;
  if (hasHorizontalOverflow || hasVerticalOverflow) {
    console.warn("[visualizer-fit] active panel exceeded fit bounds", {
      panel,
      hasHorizontalOverflow,
      hasVerticalOverflow,
      clientWidth: panelEl.clientWidth,
      scrollWidth: panelEl.scrollWidth,
      clientHeight: panelEl.clientHeight,
      scrollHeight: panelEl.scrollHeight,
    });
  }
};

export const resolveActiveVisualizerPanel = (state: GameState): VisualizerHostPanel => {
  const active = state.settings.visualizer;
  if (active === "total") {
    return "total";
  }
  return VISUALIZER_REGISTRY.some((panel) => panel.id === active) ? active : "total";
};

export const renderVisualizerHost = (root: Element, state: GameState): void => {
  const calcInstances = root.querySelectorAll<HTMLElement>("[data-calc-instance-id]");
  if (calcInstances.length > 0) {
    calcInstances.forEach((instanceEl) => {
      const instanceId = instanceEl.dataset.calcInstanceId;
      if (
        instanceId
        && state.calculators
        && Object.prototype.hasOwnProperty.call(state.calculators, instanceId)
      ) {
        renderVisualizerHost(instanceEl, projectCalculatorToLegacy(state, instanceId as CalculatorId));
        return;
      }
      renderVisualizerHost(instanceEl, state);
    });
    return;
  }

  const runtime = getHostRuntime(root);
  applyHostWidthToken(root, state);
  applyHostScale(root);
  const host = root.querySelector<HTMLElement>("[data-v2-visualizer-host]");
  const graphDevice = root.querySelector<HTMLElement>("[data-grapher-device]");
  const feedPanel = root.querySelector<HTMLElement>("[data-v2-feed-panel]");
  const totalPanel = root.querySelector<HTMLElement>("[data-v2-total-panel]");
  const factorizationPanel = root.querySelector<HTMLElement>("[data-v2-factorization-panel]");
  const titlePanel = root.querySelector<HTMLElement>("[data-v2-title-panel]");
  const releaseNotesPanel = root.querySelector<HTMLElement>("[data-v2-release-notes-panel]");
  const helpPanel = root.querySelector<HTMLElement>("[data-v2-help-panel]");
  const circlePanel = root.querySelector<HTMLElement>("[data-v2-circle-panel]");
  const numberLinePanel = root.querySelector<HTMLElement>("[data-v2-number-line-panel]");
  const eigenAllocatorPanel = root.querySelector<HTMLElement>("[data-v2-eigen-allocator-panel]");
  const algebraicPanel = root.querySelector<HTMLElement>("[data-v2-algebraic-panel]");
  const activePanel = resolveActiveVisualizerPanel(state);
  applyFitContractState(host, activePanel);
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
    totalPanel.setAttribute("aria-hidden", "false");
  }
  if (factorizationPanel) {
    factorizationPanel.setAttribute("aria-hidden", activePanel === "factorization" ? "false" : "true");
  }
  if (titlePanel) {
    titlePanel.setAttribute("aria-hidden", activePanel === "title" ? "false" : "true");
  }
  if (helpPanel) {
    helpPanel.setAttribute("aria-hidden", activePanel === "help" ? "false" : "true");
  }
  if (releaseNotesPanel) {
    releaseNotesPanel.setAttribute("aria-hidden", activePanel === "release_notes" ? "false" : "true");
  }
  if (circlePanel) {
    circlePanel.setAttribute("aria-hidden", activePanel === "circle" ? "false" : "true");
  }
  if (numberLinePanel) {
    numberLinePanel.setAttribute("aria-hidden", activePanel === "number_line" ? "false" : "true");
  }
  if (eigenAllocatorPanel) {
    eigenAllocatorPanel.setAttribute("aria-hidden", activePanel === "eigen_allocator" ? "false" : "true");
  }
  if (algebraicPanel) {
    algebraicPanel.setAttribute("aria-hidden", activePanel === "algebraic" ? "false" : "true");
  }
  if (titlePanel) {
    titlePanel.setAttribute("aria-hidden", activePanel === "title" ? "false" : "true");
  }

  for (const panel of VISUALIZER_REGISTRY) {
    if (panel.id === activePanel) {
      if (panel.id === "graph") {
        runtime.graphDormant = false;
      }
      panel.render(root, state);
      continue;
    }
    if (panel.id === "graph") {
      if (!runtime.graphDormant) {
        runtime.graphDormant = true;
      }
      continue;
    }
    {
      panel.clear(root);
    }
  }
  runDevFitDiagnostics(root, activePanel);

  runtime.previousActivePanel = activePanel;
};

const clearRuntime = (runtime: VisualizerHostModuleState): void => {
  runtime.previousActivePanel = "total";
  runtime.graphDormant = true;
  if (runtime.transitionUnlockHost) {
    releaseSwapLock(runtime, runtime.transitionUnlockHost);
  } else {
    clearTransitionEndListener(runtime);
    clearTransitionUnlockTimer(runtime);
  }
};

export const clearVisualizerHost = (root: Element): void => {
  const calcInstances = root.querySelectorAll<HTMLElement>("[data-calc-instance-id]");
  if (calcInstances.length > 0) {
    calcInstances.forEach((instanceEl) => {
      clearVisualizerHost(instanceEl);
    });
    return;
  }

  const runtime = getHostRuntime(root);
  clearRuntime(runtime);
  for (const panel of VISUALIZER_REGISTRY) {
    panel.clear(root);
  }
  clearHostUiState(runtime, root);
};
