import type { CalculatorId, GameState } from "../../domain/types.js";
import { VISUALIZER_REGISTRY } from "./visualizers/registry.js";
import type { VisualizerCanonicalSize, VisualizerHostPanel, VisualizerModule } from "./visualizers/types.js";
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

const TRANSITION_DURATION_MS = 320;
const LOCK_HEIGHT_VAR = "--v2-visualizer-lock-height";
const SCALE_VAR = "--v2-visualizer-scale";
const FIXED_WIDTH_VAR = "--v2-visualizer-fixed-width";
const PANEL_HEIGHT_VAR = "--v2-visualizer-panel-height";
const FIXED_WIDTH_PX = 460;
const VIEWPORT_PADDING_PX = 32;
const MIN_PANEL_HEIGHT_PX = 96;
const REFERENCE_TEXT_LINE_HEIGHT_PX = 21;
const DEFAULT_TOTAL_PANEL_SIZE: VisualizerCanonicalSize = {
  mode: "text_budget",
  minLines: 7,
  targetLines: 8,
  maxLines: 10,
};

const calculatorVisualizerRenderCache = new WeakMap<Element, string>();
const totalVisualizerHostRenderCache = new WeakMap<Element, string>();
const objectIdentityTokens = new WeakMap<object, number>();
let nextObjectIdentityToken = 1;

const getObjectIdentityToken = (value: object | null | undefined): string => {
  if (!value) {
    return "none";
  }
  const existing = objectIdentityTokens.get(value);
  if (existing !== undefined) {
    return existing.toString();
  }
  const token = nextObjectIdentityToken;
  nextObjectIdentityToken += 1;
  objectIdentityTokens.set(value, token);
  return token.toString();
};

const appendRecordSignature = (
  parts: string[],
  prefix: string,
  record: Record<string, boolean | number | undefined>,
): void => {
  for (const key of Object.keys(record).sort()) {
    parts.push(`${prefix}:${key}=${String(record[key])}`);
  }
};

const buildUnlockRenderSignature = (state: GameState): string => {
  const { unlocks } = state;
  const parts: string[] = [
    `maxSlots=${unlocks.maxSlots.toString()}`,
    `maxTotalDigits=${unlocks.maxTotalDigits.toString()}`,
    `storageVisible=${String(unlocks.uiUnlocks.storageVisible)}`,
  ];
  appendRecordSignature(parts, "valueAtoms", unlocks.valueAtoms);
  appendRecordSignature(parts, "valueCompose", unlocks.valueCompose);
  appendRecordSignature(parts, "valueExpression", unlocks.valueExpression);
  appendRecordSignature(parts, "slotOperators", unlocks.slotOperators);
  appendRecordSignature(parts, "unaryOperators", unlocks.unaryOperators);
  appendRecordSignature(parts, "utilities", unlocks.utilities);
  appendRecordSignature(parts, "memory", unlocks.memory);
  appendRecordSignature(parts, "steps", unlocks.steps);
  appendRecordSignature(parts, "visualizers", unlocks.visualizers);
  appendRecordSignature(parts, "execution", unlocks.execution);
  appendRecordSignature(parts, "installedOnly", unlocks.installedOnly);
  return parts.join(";");
};

const buildUiRenderSignature = (ui: GameState["ui"] | undefined): string => {
  if (!ui) {
    return "none";
  }
  const parts: string[] = [
    `keyLayout=${getObjectIdentityToken(ui.keyLayout)}`,
    `columns=${ui.keypadColumns.toString()}`,
    `rows=${ui.keypadRows.toString()}`,
    `activeVisualizer=${ui.activeVisualizer}`,
  ];
  appendRecordSignature(parts, "flags", ui.buttonFlags);
  return parts.join(";");
};

const buildCalculatorVisualizerRenderSignature = (
  state: GameState,
  calculatorId: CalculatorId,
): string => {
  const instance = state.calculators?.[calculatorId];
  const perCalculatorUnlocks = state.perCalculatorCompletedUnlockIds?.[calculatorId] ?? [];
  return [
    getObjectIdentityToken(instance?.calculator),
    getObjectIdentityToken(instance?.settings),
    getObjectIdentityToken(instance?.lambdaControl),
    buildUiRenderSignature(instance?.ui),
    buildUnlockRenderSignature(state),
    state.completedUnlockIds.join(","),
    perCalculatorUnlocks.join(","),
  ].join("|");
};

const buildTotalVisualizerHostRenderSignature = (state: GameState): string => [
  state.settings.visualizer,
  state.ui.activeVisualizer,
  state.ui.keypadColumns.toString(),
  state.ui.keypadRows.toString(),
].join("|");

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
  const statePanel = root.querySelector<HTMLElement>("[data-v2-state-panel]");
  const ratiosPanel = root.querySelector<HTMLElement>("[data-v2-ratios-panel]");
  const numberLinePanel = root.querySelector<HTMLElement>("[data-v2-number-line-panel]");
  const circlePanel = root.querySelector<HTMLElement>("[data-v2-circle-panel]");
  const algebraicPanel = root.querySelector<HTMLElement>("[data-v2-algebraic-panel]");
  const totalFooter = root.querySelector<HTMLElement>("[data-v2-total-footer]");
  const setHidden = (el: HTMLElement | null, hidden: boolean): void => {
    if (el) {
      el.setAttribute("aria-hidden", hidden ? "true" : "false");
    }
  };
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
    host.dataset.v2VisualizerDebugRatio = "";
  }
  if (displayWindow) {
    displayWindow.style.removeProperty(SCALE_VAR);
    displayWindow.style.removeProperty(FIXED_WIDTH_VAR);
    displayWindow.style.removeProperty(PANEL_HEIGHT_VAR);
  }
  setHidden(graphDevice, true);
  setHidden(feedPanel, true);
  setHidden(totalPanel, false);
  setHidden(factorizationPanel, true);
  setHidden(titlePanel, true);
  setHidden(helpPanel, true);
  setHidden(statePanel, true);
  setHidden(ratiosPanel, true);
  setHidden(releaseNotesPanel, true);
  setHidden(numberLinePanel, true);
  setHidden(circlePanel, true);
  setHidden(algebraicPanel, true);
  setHidden(totalFooter, false);
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

const resolveVisualizerModule = (panel: VisualizerHostPanel): VisualizerModule | null =>
  VISUALIZER_REGISTRY.find((entry) => entry.id === panel) ?? null;

const clampPanelHeightMin = (value: number): number => Math.max(MIN_PANEL_HEIGHT_PX, value);

const resolveCanonicalPanelSize = (module: VisualizerModule | null, state: GameState): VisualizerCanonicalSize => {
  if (!module) {
    return DEFAULT_TOTAL_PANEL_SIZE;
  }
  return module.resolveSize ? module.resolveSize(state) : module.size;
};

const resolveDisplayWidthPx = (displayWindow: HTMLElement): number => {
  const measured = displayWindow.getBoundingClientRect();
  const measuredWidth = measured && typeof measured.width === "number" ? measured.width : NaN;
  if (Number.isFinite(measuredWidth) && measuredWidth > 0) {
    return measuredWidth;
  }
  const offsetWidth = Number(displayWindow.offsetWidth);
  if (Number.isFinite(offsetWidth) && offsetWidth > 0) {
    return offsetWidth;
  }
  const clientWidth = Number(displayWindow.clientWidth);
  if (Number.isFinite(clientWidth) && clientWidth > 0) {
    return clientWidth;
  }
  if (typeof window !== "undefined") {
    const computedWidth = Number.parseFloat(window.getComputedStyle(displayWindow).width || "");
    if (Number.isFinite(computedWidth) && computedWidth > 0) {
      return computedWidth;
    }
  }
  const scaleToken = typeof displayWindow.style.getPropertyValue === "function"
    ? displayWindow.style.getPropertyValue(SCALE_VAR)
    : "";
  const scaleValue = Number.parseFloat(scaleToken || "1");
  const scale = Number.isFinite(scaleValue) && scaleValue > 0 ? scaleValue : 1;
  return FIXED_WIDTH_PX * Math.min(1, scale);
};

const isDebugVisualizerOverlayEnabled = (): boolean => {
  if (typeof document === "undefined") {
    return false;
  }
  return document.body.getAttribute("data-debug-menu-open") === "true";
};

const resolvePanelHeightPx = (panelSize: VisualizerCanonicalSize, displayWidthPx: number): number => {
  const safeWidth = Math.max(1, displayWidthPx);
  if (panelSize.mode === "ratio") {
    return clampPanelHeightMin(safeWidth * panelSize.ratio);
  }
  const widthScale = safeWidth / FIXED_WIDTH_PX;
  const scaledLineHeightPx = REFERENCE_TEXT_LINE_HEIGHT_PX * widthScale;
  const minHeight = panelSize.minLines * scaledLineHeightPx;
  const maxHeight = panelSize.maxLines * scaledLineHeightPx;
  const targetHeight = panelSize.targetLines * scaledLineHeightPx;
  return clampPanelHeightMin(Math.max(minHeight, Math.min(maxHeight, targetHeight)));
};

const readElementPixelDimension = (element: Element, key: "scrollHeight" | "clientHeight" | "offsetHeight"): number | null => {
  const record = element as unknown as Record<string, unknown>;
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
};

const resolveMeasuredElementHeightPx = (element: Element): number | null => {
  const scrollHeight = readElementPixelDimension(element, "scrollHeight");
  const clientHeight = readElementPixelDimension(element, "clientHeight");
  const offsetHeight = readElementPixelDimension(element, "offsetHeight");
  const measured = Math.max(scrollHeight ?? 0, clientHeight ?? 0, offsetHeight ?? 0);
  return measured > 0 ? measured : null;
};

const resolveElementVerticalPaddingPx = (element: HTMLElement): number => {
  if (typeof window === "undefined") {
    return 0;
  }
  const computed = window.getComputedStyle(element);
  const top = Number.parseFloat(computed.paddingTop || "");
  const bottom = Number.parseFloat(computed.paddingBottom || "");
  const topPx = Number.isFinite(top) ? top : 0;
  const bottomPx = Number.isFinite(bottom) ? bottom : 0;
  return Math.max(0, topPx + bottomPx);
};

const resolveTextPanelMeasurementTarget = (panelElement: HTMLElement, panel: VisualizerHostPanel): HTMLElement | null => {
  if (typeof panelElement.querySelector !== "function") {
    return null;
  }
  if (panel === "feed") {
    return panelElement.querySelector<HTMLElement>(".v2-feed-table");
  }
  if (panel === "factorization") {
    return panelElement.querySelector<HTMLElement>(".v2-factorization-table");
  }
  if (panel === "help") {
    return panelElement.querySelector<HTMLElement>(".v2-help-table");
  }
  if (panel === "release_notes") {
    return panelElement.querySelector<HTMLElement>(".v2-release-notes-body");
  }
  if (panel === "state") {
    return panelElement.querySelector<HTMLElement>(".v2-state-table");
  }
  if (panel === "ratios") {
    return panelElement.querySelector<HTMLElement>(".v2-ratios-table");
  }
  return null;
};

const applyRenderedTextPanelHeight = (
  root: Element,
  state: GameState,
  panel: VisualizerHostPanel,
  fallbackMetrics: { displayWidthPx: number; panelHeightPx: number } | null,
): { displayWidthPx: number; panelHeightPx: number } | null => {
  const module = resolveVisualizerModule(panel);
  if (!module) {
    return fallbackMetrics;
  }
  const panelSize = resolveCanonicalPanelSize(module, state);
  if (panelSize.mode !== "text_budget") {
    return fallbackMetrics;
  }
  const panelElement = resolvePanelElement(root, panel);
  if (!panelElement) {
    return fallbackMetrics;
  }
  const displayWindow = root.querySelector<HTMLElement>("[data-display-window]");
  if (!displayWindow) {
    return fallbackMetrics;
  }
  const targetElement = resolveTextPanelMeasurementTarget(panelElement, panel);
  const panelContentHeight = resolveMeasuredElementHeightPx(panelElement);
  const targetContentHeight = targetElement ? resolveMeasuredElementHeightPx(targetElement) : null;
  const measuredContentHeight = Math.max(panelContentHeight ?? 0, targetContentHeight ?? 0);
  if (measuredContentHeight <= 0) {
    return fallbackMetrics;
  }
  const panelPadding = targetElement ? resolveElementVerticalPaddingPx(panelElement) : 0;
  const measuredPanelHeight = measuredContentHeight + panelPadding;

  const displayWidthPx = fallbackMetrics?.displayWidthPx ?? resolveDisplayWidthPx(displayWindow);
  const widthScale = Math.max(0.01, displayWidthPx / FIXED_WIDTH_PX);
  const scaledLineHeightPx = REFERENCE_TEXT_LINE_HEIGHT_PX * widthScale;
  const minHeight = clampPanelHeightMin(panelSize.minLines * scaledLineHeightPx);
  // When rendered text exceeds the canonical budget, expand host height so text never clips.
  const panelHeightPx = Math.max(minHeight, clampPanelHeightMin(measuredPanelHeight));

  displayWindow.style.setProperty(PANEL_HEIGHT_VAR, `${panelHeightPx.toFixed(2)}px`);
  return { displayWidthPx, panelHeightPx };
};

const applyHostPanelHeight = (
  root: Element,
  state: GameState,
  panel: VisualizerHostPanel,
): { displayWidthPx: number; panelHeightPx: number } | null => {
  const displayWindow = root.querySelector<HTMLElement>("[data-display-window]");
  if (!displayWindow) {
    return null;
  }
  const module = resolveVisualizerModule(panel);
  const panelSize = resolveCanonicalPanelSize(module, state);
  const displayWidthPx = resolveDisplayWidthPx(displayWindow);
  const panelHeight = resolvePanelHeightPx(panelSize, displayWidthPx);
  displayWindow.style.setProperty(PANEL_HEIGHT_VAR, `${panelHeight.toFixed(2)}px`);
  return { displayWidthPx, panelHeightPx: panelHeight };
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
  const module = resolveVisualizerModule(panel);
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
  if (panel === "circle") {
    return root.querySelector<HTMLElement>("[data-v2-circle-panel]");
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
  if (panel === "state") {
    return root.querySelector<HTMLElement>("[data-v2-state-panel]");
  }
  if (panel === "ratios") {
    return root.querySelector<HTMLElement>("[data-v2-ratios-panel]");
  }
  if (panel === "release_notes") {
    return root.querySelector<HTMLElement>("[data-v2-release-notes-panel]");
  }
  if (panel === "number_line") {
    return root.querySelector<HTMLElement>("[data-v2-number-line-panel]");
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
  const module = resolveVisualizerModule(panel);
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
        const calculatorId = instanceId as CalculatorId;
        const signature = buildCalculatorVisualizerRenderSignature(state, calculatorId);
        const isActive = instanceEl.dataset.calcActive === "true";
        if (!isActive && calculatorVisualizerRenderCache.get(instanceEl) === signature) {
          return;
        }
        renderVisualizerHost(instanceEl, projectCalculatorToLegacy(state, calculatorId));
        calculatorVisualizerRenderCache.set(instanceEl, signature);
        return;
      }
    });
    return;
  }

  const runtime = getHostRuntime(root);
  const activePanel = resolveActiveVisualizerPanel(state);
  const totalHostSignature = buildTotalVisualizerHostRenderSignature(state);
  if (
    activePanel === "total"
    && runtime.previousActivePanel === "total"
    && totalVisualizerHostRenderCache.get(root) === totalHostSignature
  ) {
    return;
  }
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
  const statePanel = root.querySelector<HTMLElement>("[data-v2-state-panel]");
  const ratiosPanel = root.querySelector<HTMLElement>("[data-v2-ratios-panel]");
  const numberLinePanel = root.querySelector<HTMLElement>("[data-v2-number-line-panel]");
  const circlePanel = root.querySelector<HTMLElement>("[data-v2-circle-panel]");
  const algebraicPanel = root.querySelector<HTMLElement>("[data-v2-algebraic-panel]");
  const setPanelVisible = (panelEl: HTMLElement | null, visible: boolean): void => {
    if (panelEl) {
      panelEl.setAttribute("aria-hidden", visible ? "false" : "true");
    }
  };
  applyFitContractState(host, activePanel);
  const transitionPhase = resolveTransitionPhase(runtime.previousActivePanel, activePanel);
  const previousPanel = runtime.previousActivePanel;
  const panelMetrics = applyHostPanelHeight(root, state, activePanel);

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

  setPanelVisible(graphDevice, activePanel === "graph");
  setPanelVisible(feedPanel, activePanel === "feed");
  setPanelVisible(totalPanel, true);
  setPanelVisible(factorizationPanel, activePanel === "factorization");
  setPanelVisible(titlePanel, activePanel === "title");
  setPanelVisible(helpPanel, activePanel === "help");
  setPanelVisible(statePanel, activePanel === "state");
  setPanelVisible(ratiosPanel, activePanel === "ratios");
  setPanelVisible(releaseNotesPanel, activePanel === "release_notes");
  setPanelVisible(numberLinePanel, activePanel === "number_line");
  setPanelVisible(circlePanel, activePanel === "circle");
  setPanelVisible(algebraicPanel, activePanel === "algebraic");

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
  const finalPanelMetrics = applyRenderedTextPanelHeight(root, state, activePanel, panelMetrics);
  if (host) {
    if (isDebugVisualizerOverlayEnabled() && finalPanelMetrics && finalPanelMetrics.displayWidthPx > 0) {
      host.dataset.v2VisualizerDebugRatio = `${(finalPanelMetrics.panelHeightPx / finalPanelMetrics.displayWidthPx).toFixed(3)}`;
    } else {
      host.dataset.v2VisualizerDebugRatio = "";
    }
  }
  runDevFitDiagnostics(root, activePanel);

  runtime.previousActivePanel = activePanel;
  if (activePanel === "total") {
    totalVisualizerHostRenderCache.set(root, totalHostSignature);
  } else {
    totalVisualizerHostRenderCache.delete(root);
  }
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
