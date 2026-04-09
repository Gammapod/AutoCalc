import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { clearVisualizerHost, renderVisualizerHost, resolveActiveVisualizerPanel } from "../src/ui/renderAdapter.js";
import { VISUALIZER_REGISTRY } from "../src/ui/modules/visualizers/registry.js";
import type { GameState, RollEntry } from "../src/domain/types.js";
import { toExplicitComplexCalculatorValue, toRationalScalarValue } from "../src/domain/calculatorValue.js";

type RootLike = {
  querySelector: (selector: string) => Element | null;
  querySelectorAll: (selector: string) => Element[];
};

type FakeElement = {
  innerHTML: string;
  dataset: Record<string, string>;
  attributes: Record<string, string>;
  scrollHeight?: number;
  clientHeight?: number;
  offsetHeight?: number;
  style: {
    setProperty: (name: string, value: string) => void;
    removeProperty: (name: string) => void;
  };
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
  querySelector: (selector: string) => Element | null;
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  getBoundingClientRect: () => { height: number };
};

type FakeVisualizerInstance = FakeElement & RootLike;

const createFakeElement = (): FakeElement => {
  const element: FakeElement = {
    innerHTML: "",
    dataset: {},
    attributes: {},
    scrollHeight: 0,
    clientHeight: 0,
    offsetHeight: 0,
    style: {
      setProperty(name: string, value: string): void {
        element.attributes[`style:${name}`] = value;
      },
      removeProperty(name: string): void {
        delete element.attributes[`style:${name}`];
      },
    },
    setAttribute(name: string, value: string): void {
      element.attributes[name] = value;
    },
    removeAttribute(name: string): void {
      delete element.attributes[name];
    },
    querySelector(): Element | null {
      return null;
    },
    addEventListener(): void {
      // no-op in fake element
    },
    removeEventListener(): void {
      // no-op in fake element
    },
    getBoundingClientRect(): { height: number } {
      return { height: 168 };
    },
  };
  return element;
};

const createFakeVisualizerInstance = (
  calculatorId: string,
): {
  instance: FakeVisualizerInstance;
  host: FakeElement;
  graph: FakeElement;
  feed: FakeElement;
  total: FakeElement;
} => {
  const host = createFakeElement();
  const graph = createFakeElement();
  const feed = createFakeElement();
  const total = createFakeElement();
  const instance: FakeVisualizerInstance = {
    ...createFakeElement(),
    dataset: { calcInstanceId: calculatorId },
    querySelector: (selector: string): Element | null => {
      if (selector === "[data-v2-visualizer-host]") {
        return host as unknown as Element;
      }
      if (selector === "[data-grapher-device]") {
        return graph as unknown as Element;
      }
      if (selector === "[data-v2-feed-panel]") {
        return feed as unknown as Element;
      }
      if (selector === "[data-v2-total-panel]") {
        return total as unknown as Element;
      }
      return null;
    },
    querySelectorAll: (): Element[] => [],
  };
  return {
    instance,
    host,
    graph,
    feed,
    total,
  };
};

const r = (num: bigint): { kind: "rational"; value: { num: bigint; den: bigint } } => ({
  kind: "rational",
  value: { num, den: 1n },
});
const re = (...values: RollEntry["y"][]): RollEntry[] => values.map((y) => ({ y }));

export const runUiModuleVisualizerHostV2Tests = (): void => {
  const base = initialState();
  assert.equal(resolveActiveVisualizerPanel(base), "total", "default active visualizer resolves to total");
  assert.deepEqual(
    VISUALIZER_REGISTRY.map((module) => module.id),
    ["graph", "feed", "title", "release_notes", "help", "factorization", "number_line", "circle", "eigen_allocator", "algebraic"],
    "visualizer registry preserves graph/feed/title/release-notes/help/factorization/number-line/circle order with eigen allocator and algebraic support",
  );
  for (const module of VISUALIZER_REGISTRY) {
    assert.equal(module.fit.overflow, "forbid_scroll", `${module.id} visualizer forbids scroll fallback`);
    assert.equal(module.fit.budget.topPx > 0, true, `${module.id} fit budget top is positive`);
    assert.equal(module.fit.budget.bodyPx > 0, true, `${module.id} fit budget body is positive`);
    assert.equal(module.fit.budget.bottomPx > 0, true, `${module.id} fit budget bottom is positive`);
    assert.equal(["ratio", "text_budget"].includes(module.size.mode), true, `${module.id} visualizer declares canonical size mode`);
    if (module.size.mode === "ratio") {
      assert.equal(module.size.ratio > 0, true, `${module.id} visualizer ratio is positive`);
    } else {
      assert.equal(module.size.minLines > 0, true, `${module.id} text budget min lines is positive`);
      assert.equal(module.size.targetLines >= module.size.minLines, true, `${module.id} text target respects min lines`);
      assert.equal(module.size.maxLines >= module.size.targetLines, true, `${module.id} text max respects target lines`);
    }
    if (module.id === "number_line") {
      assert.equal(typeof module.resolveSize === "function", true, "number-line module exposes state-aware size resolver");
    }
  }

  const withGraphOn: GameState = {
    ...base,
    settings: {
      ...base.settings,
      visualizer: "graph",
    },
  };
  assert.equal(resolveActiveVisualizerPanel(withGraphOn), "graph", "graph flag activates graph panel");

  const withFeedOnEmptyRoll: GameState = {
    ...base,
    settings: {
      ...base.settings,
      visualizer: "feed",
    },
  };
  assert.equal(resolveActiveVisualizerPanel(withFeedOnEmptyRoll), "feed", "feed stays visible while FEED is toggled");

  const withFeedOnRoll: GameState = {
    ...withFeedOnEmptyRoll,
    calculator: {
    ...withFeedOnEmptyRoll.calculator,
      rollEntries: re(r(7n)),
    },
  };
  assert.equal(resolveActiveVisualizerPanel(withFeedOnRoll), "feed", "feed shows with non-empty roll");

  const withGraphAndFeed: GameState = {
    ...withFeedOnRoll,
    settings: {
      ...withFeedOnRoll.settings,
      visualizer: "graph",
    },
  };
  assert.equal(resolveActiveVisualizerPanel(withGraphAndFeed), "graph", "graph panel is active when selected");

  const withTitleSelected: GameState = {
    ...base,
    settings: {
      ...base.settings,
      visualizer: "title",
    },
  };
  assert.equal(resolveActiveVisualizerPanel(withTitleSelected), "title", "title visualizer resolves to title panel");
  const withNumberLineSelected: GameState = {
    ...base,
    settings: {
      ...base.settings,
      visualizer: "number_line",
    },
  };
  assert.equal(resolveActiveVisualizerPanel(withNumberLineSelected), "number_line", "number-line visualizer resolves to number-line panel");
  const withReleaseNotesSelected: GameState = {
    ...base,
    settings: {
      ...base.settings,
      visualizer: "release_notes",
    },
  };
  assert.equal(resolveActiveVisualizerPanel(withReleaseNotesSelected), "release_notes", "release notes visualizer resolves to release notes panel");
  const withCircleSelected: GameState = {
    ...base,
    settings: {
      ...base.settings,
      visualizer: "circle",
    },
  };
  assert.equal(resolveActiveVisualizerPanel(withCircleSelected), "circle", "circle visualizer resolves to circle panel");

  const withEigenSelected: GameState = {
    ...base,
    settings: {
      ...base.settings,
      visualizer: "eigen_allocator",
    },
  };
  assert.equal(resolveActiveVisualizerPanel(withEigenSelected), "eigen_allocator", "lambda visualizer resolves to eigen allocator panel");

  const missingRoot: RootLike = {
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  assert.doesNotThrow(
    () => renderVisualizerHost(missingRoot as unknown as Element, withFeedOnRoll),
    "visualizer host renderer safely handles missing mount points",
  );
  clearVisualizerHost(missingRoot as unknown as Element);

  const renderHost = createFakeElement();
  const renderDisplayWindow = createFakeElement();
  const renderGraphDevice = createFakeElement();
  const renderFeedPanel = createFakeElement();
  const renderTitlePanel = createFakeElement();
  const renderReleaseNotesPanel = createFakeElement();
  const renderHelpPanel = createFakeElement();
  const renderFactorizationPanel = createFakeElement();
  const renderNumberLinePanel = createFakeElement();
  const renderCirclePanel = createFakeElement();
  const renderEigenAllocatorPanel = createFakeElement();
  const renderAlgebraicPanel = createFakeElement();
  const renderTotalPanel = createFakeElement();
  renderFeedPanel.innerHTML = "stale";
  renderFeedPanel.attributes["aria-hidden"] = "false";
  renderTotalPanel.attributes["aria-hidden"] = "false";
  const renderRoot: RootLike = {
    querySelector: (selector: string) => {
      if (selector === "[data-v2-visualizer-host]") {
        return renderHost as unknown as Element;
      }
      if (selector === "[data-display-window]") {
        return renderDisplayWindow as unknown as Element;
      }
      if (selector === "[data-grapher-device]") {
        return renderGraphDevice as unknown as Element;
      }
      if (selector === "[data-v2-feed-panel]") {
        return renderFeedPanel as unknown as Element;
      }
      if (selector === "[data-v2-title-panel]") {
        return renderTitlePanel as unknown as Element;
      }
      if (selector === "[data-v2-release-notes-panel]") {
        return renderReleaseNotesPanel as unknown as Element;
      }
      if (selector === "[data-v2-help-panel]") {
        return renderHelpPanel as unknown as Element;
      }
      if (selector === "[data-v2-factorization-panel]") {
        return renderFactorizationPanel as unknown as Element;
      }
      if (selector === "[data-v2-total-panel]") {
        return renderTotalPanel as unknown as Element;
      }
      if (selector === "[data-v2-number-line-panel]") {
        return renderNumberLinePanel as unknown as Element;
      }
      if (selector === "[data-v2-circle-panel]") {
        return renderCirclePanel as unknown as Element;
      }
      if (selector === "[data-v2-eigen-allocator-panel]") {
        return renderEigenAllocatorPanel as unknown as Element;
      }
      if (selector === "[data-v2-algebraic-panel]") {
        return renderAlgebraicPanel as unknown as Element;
      }
      return null;
    },
    querySelectorAll: () => [],
  };
  const graphModule = VISUALIZER_REGISTRY.find((module) => module.id === "graph");
  if (!graphModule) {
    throw new Error("graph visualizer module missing");
  }
  const originalGraphClear = graphModule.clear;
  let graphClearCalls = 0;
  graphModule.clear = (root) => {
    graphClearCalls += 1;
    originalGraphClear(root);
  };
  try {
    renderVisualizerHost(renderRoot as unknown as Element, withGraphOn);
  assert.equal(
    renderDisplayWindow.attributes["style:--v2-visualizer-fixed-width"],
    "var(--desktop-calc-width)",
    "host uses calc-width token when keypad columns are <= 4",
  );
  assert.equal(renderDisplayWindow.attributes["style:--v2-visualizer-scale"], "1.0000", "host applies default scale token");
  assert.equal(renderHost.dataset.v2VisualizerPanel, "graph", "host data state tracks active graph panel");
  assert.equal(renderHost.dataset.v2FitKind, "plot_scale_clip", "host exposes active fit kind");
  assert.equal(renderHost.dataset.v2FitOverflow, "forbid_scroll", "host exposes active overflow contract");
  assert.equal(
    renderDisplayWindow.attributes["style:--v2-visualizer-panel-height"],
    "276.00px",
    "graph visualizer resolves canonical ratio height token",
  );
  assert.equal(renderHost.dataset.v2VisualizerFrom, "total", "host tracks previous panel");
  assert.equal(renderHost.dataset.v2VisualizerTo, "graph", "host tracks next panel");
  assert.equal(renderHost.dataset.v2VisualizerTransition, "enter", "total to graph is enter transition");
  assert.equal(renderHost.attributes["aria-hidden"], "false", "active panel keeps visualizer host visible");
  assert.equal(renderGraphDevice.attributes["aria-hidden"], "false", "graph panel is shown when graph is active");
  assert.equal(renderFeedPanel.innerHTML, "", "inactive feed panel is cleared during graph render");
  assert.equal(renderFeedPanel.attributes["aria-hidden"], "true", "inactive feed panel is hidden during graph render");
  assert.equal(renderTitlePanel.innerHTML, "", "inactive title panel is cleared during graph render");
  assert.equal(renderTitlePanel.attributes["aria-hidden"], "true", "inactive title panel is hidden during graph render");
  assert.equal(renderReleaseNotesPanel.innerHTML, "", "inactive release notes panel is cleared during graph render");
  assert.equal(renderReleaseNotesPanel.attributes["aria-hidden"], "true", "inactive release notes panel is hidden during graph render");
  assert.equal(renderHelpPanel.innerHTML, "", "inactive help panel is cleared during graph render");
  assert.equal(renderHelpPanel.attributes["aria-hidden"], "true", "inactive help panel is hidden during graph render");
  assert.equal(renderFactorizationPanel.innerHTML, "", "inactive factorization panel is cleared during graph render");
  assert.equal(renderFactorizationPanel.attributes["aria-hidden"], "true", "inactive factorization panel is hidden during graph render");
  assert.equal(renderNumberLinePanel.innerHTML, "", "inactive number-line panel is cleared during graph render");
  assert.equal(renderNumberLinePanel.attributes["aria-hidden"], "true", "inactive number-line panel is hidden during graph render");
  assert.equal(renderEigenAllocatorPanel.innerHTML, "", "inactive eigen allocator panel is cleared during graph render");
  assert.equal(renderEigenAllocatorPanel.attributes["aria-hidden"], "true", "inactive eigen allocator panel is hidden during graph render");
  assert.equal(renderAlgebraicPanel.innerHTML, "", "inactive algebraic panel is cleared during graph render");
  assert.equal(renderAlgebraicPanel.attributes["aria-hidden"], "true", "inactive algebraic panel is hidden during graph render");
  assert.equal(
    renderTotalPanel.attributes["aria-hidden"],
    "false",
    "total panel remains mounted for always-visible memory/lambda row while graph is active",
  );
  const withFeedOn: GameState = {
    ...withGraphOn,
    settings: {
      ...withGraphOn.settings,
      visualizer: "feed",
    },
  };
  renderVisualizerHost(renderRoot as unknown as Element, withFeedOn);
  assert.equal(renderHost.dataset.v2FitKind, "text_wrap_clamp", "feed activates text-wrap fit strategy");
  assert.equal(
    renderDisplayWindow.attributes["style:--v2-visualizer-panel-height"],
    "147.00px",
    "feed visualizer resolves canonical text-budget height token",
  );
  assert.equal(renderHost.dataset.v2VisualizerTransition, "swap", "graph to feed is swap transition");
  assert.equal(renderHost.attributes["data-v2-visualizer-height-lock"], "true", "swap applies temporary height lock");
  assert.equal(graphClearCalls, 0, "graph panel is retained (not cleared) when inactive during graph-first lifecycle mode");

  renderVisualizerHost(renderRoot as unknown as Element, withNumberLineSelected);
  assert.equal(
    renderDisplayWindow.attributes["style:--v2-visualizer-panel-height"],
    "133.40px",
    "number-line real mode keeps canonical real ratio height",
  );

  const withNumberLineComplexSelected: GameState = {
    ...withNumberLineSelected,
    calculator: {
      ...withNumberLineSelected.calculator,
      total: toExplicitComplexCalculatorValue(
        toRationalScalarValue({ num: 3n, den: 1n }),
        toRationalScalarValue({ num: 2n, den: 1n }),
      ),
    },
  };
  renderVisualizerHost(renderRoot as unknown as Element, withNumberLineComplexSelected);
  assert.equal(
    renderDisplayWindow.attributes["style:--v2-visualizer-panel-height"],
    "460.00px",
    "number-line complex mode resolves square ratio and is not capped by prior global max clamp",
  );

  renderVisualizerHost(renderRoot as unknown as Element, withCircleSelected);
  assert.equal(
    renderDisplayWindow.attributes["style:--v2-visualizer-panel-height"],
    "460.00px",
    "circle visualizer resolves square ratio height",
  );
  assert.equal(renderGraphDevice.attributes["aria-hidden"], "true", "graph device stays hidden for circle visualizer");
  assert.equal(renderCirclePanel.attributes["aria-hidden"], "false", "circle panel is shown for circle visualizer");

  renderVisualizerHost(renderRoot as unknown as Element, base);
  assert.equal(renderHost.dataset.v2VisualizerTransition, "exit", "visualizer to total is exit transition");

  const host = createFakeElement();
  const graphDevice = createFakeElement();
  const feedPanel = createFakeElement();
  const titlePanel = createFakeElement();
  const releaseNotesPanel = createFakeElement();
  const helpPanel = createFakeElement();
  const factorizationPanel = createFakeElement();
  const numberLinePanel = createFakeElement();
  const circlePanel = createFakeElement();
  const eigenAllocatorPanel = createFakeElement();
  const algebraicPanel = createFakeElement();
  const totalPanel = createFakeElement();
  feedPanel.innerHTML = "stale";
  feedPanel.attributes["aria-hidden"] = "false";
  totalPanel.attributes["aria-hidden"] = "false";
  host.dataset.v2VisualizerPanel = "feed";
  const cleanupRoot: RootLike = {
    querySelector: (selector: string) => {
      if (selector === "[data-v2-visualizer-host]") {
        return host as unknown as Element;
      }
      if (selector === "[data-grapher-device]") {
        return graphDevice as unknown as Element;
      }
      if (selector === "[data-v2-feed-panel]") {
        return feedPanel as unknown as Element;
      }
      if (selector === "[data-v2-title-panel]") {
        return titlePanel as unknown as Element;
      }
      if (selector === "[data-v2-release-notes-panel]") {
        return releaseNotesPanel as unknown as Element;
      }
      if (selector === "[data-v2-help-panel]") {
        return helpPanel as unknown as Element;
      }
      if (selector === "[data-v2-factorization-panel]") {
        return factorizationPanel as unknown as Element;
      }
      if (selector === "[data-v2-total-panel]") {
        return totalPanel as unknown as Element;
      }
      if (selector === "[data-v2-number-line-panel]") {
        return numberLinePanel as unknown as Element;
      }
      if (selector === "[data-v2-circle-panel]") {
        return circlePanel as unknown as Element;
      }
      if (selector === "[data-v2-eigen-allocator-panel]") {
        return eigenAllocatorPanel as unknown as Element;
      }
      if (selector === "[data-v2-algebraic-panel]") {
        return algebraicPanel as unknown as Element;
      }
      return null;
    },
    querySelectorAll: () => [],
  };
  clearVisualizerHost(cleanupRoot as unknown as Element);
  assert.equal(graphClearCalls > 0, true, "clearVisualizerHost still clears graph runtime in full cleanup path");
  assert.equal(feedPanel.innerHTML, "", "clearVisualizerHost clears feed rows");
  assert.equal(titlePanel.innerHTML, "", "clearVisualizerHost clears title panel");
  assert.equal(releaseNotesPanel.innerHTML, "", "clearVisualizerHost clears release notes panel");
  assert.equal(helpPanel.innerHTML, "", "clearVisualizerHost clears help panel");
  assert.equal(factorizationPanel.innerHTML, "", "clearVisualizerHost clears factorization panel");
  assert.equal(numberLinePanel.innerHTML, "", "clearVisualizerHost clears number-line panel");
  assert.equal(circlePanel.innerHTML, "", "clearVisualizerHost clears circle panel");
  assert.equal(eigenAllocatorPanel.innerHTML, "", "clearVisualizerHost clears eigen allocator panel");
  assert.equal(algebraicPanel.innerHTML, "", "clearVisualizerHost clears algebraic panel");
  assert.equal(feedPanel.attributes["aria-hidden"], "true", "clearVisualizerHost hides feed panel");
  assert.equal(titlePanel.attributes["aria-hidden"], "true", "clearVisualizerHost hides title panel");
  assert.equal(releaseNotesPanel.attributes["aria-hidden"], "true", "clearVisualizerHost hides release notes panel");
  assert.equal(helpPanel.attributes["aria-hidden"], "true", "clearVisualizerHost hides help panel");
  assert.equal(factorizationPanel.attributes["aria-hidden"], "true", "clearVisualizerHost hides factorization panel");
  assert.equal(numberLinePanel.attributes["aria-hidden"], "true", "clearVisualizerHost hides number-line panel");
  assert.equal(circlePanel.attributes["aria-hidden"], "true", "clearVisualizerHost hides circle panel");
  assert.equal(eigenAllocatorPanel.attributes["aria-hidden"], "true", "clearVisualizerHost hides eigen allocator panel");
  assert.equal(algebraicPanel.attributes["aria-hidden"], "true", "clearVisualizerHost hides algebraic panel");
  assert.equal(graphDevice.attributes["aria-hidden"], "true", "clearVisualizerHost hides graph panel");
  assert.equal(totalPanel.attributes["aria-hidden"], "false", "clearVisualizerHost keeps total panel available for shared memory row");
  assert.equal(host.attributes["aria-hidden"], "true", "clearVisualizerHost hides host");
  assert.equal(host.dataset.v2VisualizerPanel, "total", "clearVisualizerHost resets host panel");

  const firstHost = createFakeElement();
  const firstGraphDevice = createFakeElement();
  const firstFeedPanel = createFakeElement();
  const firstTitlePanel = createFakeElement();
  const firstReleaseNotesPanel = createFakeElement();
  const firstHelpPanel = createFakeElement();
  const firstFactorizationPanel = createFakeElement();
  const firstNumberLinePanel = createFakeElement();
  const firstEigenAllocatorPanel = createFakeElement();
  const firstAlgebraicPanel = createFakeElement();
  const firstTotalPanel = createFakeElement();
  const firstRoot: RootLike = {
    querySelector: (selector: string) => {
      if (selector === "[data-v2-visualizer-host]") {
        return firstHost as unknown as Element;
      }
      if (selector === "[data-grapher-device]") {
        return firstGraphDevice as unknown as Element;
      }
      if (selector === "[data-v2-feed-panel]") {
        return firstFeedPanel as unknown as Element;
      }
      if (selector === "[data-v2-title-panel]") {
        return firstTitlePanel as unknown as Element;
      }
      if (selector === "[data-v2-release-notes-panel]") {
        return firstReleaseNotesPanel as unknown as Element;
      }
      if (selector === "[data-v2-help-panel]") {
        return firstHelpPanel as unknown as Element;
      }
      if (selector === "[data-v2-factorization-panel]") {
        return firstFactorizationPanel as unknown as Element;
      }
      if (selector === "[data-v2-total-panel]") {
        return firstTotalPanel as unknown as Element;
      }
      if (selector === "[data-v2-number-line-panel]") {
        return firstNumberLinePanel as unknown as Element;
      }
      if (selector === "[data-v2-eigen-allocator-panel]") {
        return firstEigenAllocatorPanel as unknown as Element;
      }
      if (selector === "[data-v2-algebraic-panel]") {
        return firstAlgebraicPanel as unknown as Element;
      }
      return null;
    },
    querySelectorAll: () => [],
  };

  const secondHost = createFakeElement();
  const secondGraphDevice = createFakeElement();
  const secondFeedPanel = createFakeElement();
  const secondTitlePanel = createFakeElement();
  const secondReleaseNotesPanel = createFakeElement();
  const secondHelpPanel = createFakeElement();
  const secondFactorizationPanel = createFakeElement();
  const secondNumberLinePanel = createFakeElement();
  const secondEigenAllocatorPanel = createFakeElement();
  const secondAlgebraicPanel = createFakeElement();
  const secondTotalPanel = createFakeElement();
  const secondRoot: RootLike = {
    querySelector: (selector: string) => {
      if (selector === "[data-v2-visualizer-host]") {
        return secondHost as unknown as Element;
      }
      if (selector === "[data-grapher-device]") {
        return secondGraphDevice as unknown as Element;
      }
      if (selector === "[data-v2-feed-panel]") {
        return secondFeedPanel as unknown as Element;
      }
      if (selector === "[data-v2-title-panel]") {
        return secondTitlePanel as unknown as Element;
      }
      if (selector === "[data-v2-release-notes-panel]") {
        return secondReleaseNotesPanel as unknown as Element;
      }
      if (selector === "[data-v2-help-panel]") {
        return secondHelpPanel as unknown as Element;
      }
      if (selector === "[data-v2-factorization-panel]") {
        return secondFactorizationPanel as unknown as Element;
      }
      if (selector === "[data-v2-total-panel]") {
        return secondTotalPanel as unknown as Element;
      }
      if (selector === "[data-v2-number-line-panel]") {
        return secondNumberLinePanel as unknown as Element;
      }
      if (selector === "[data-v2-eigen-allocator-panel]") {
        return secondEigenAllocatorPanel as unknown as Element;
      }
      if (selector === "[data-v2-algebraic-panel]") {
        return secondAlgebraicPanel as unknown as Element;
      }
      return null;
    },
    querySelectorAll: () => [],
  };

  renderVisualizerHost(firstRoot as unknown as Element, withGraphOn);
  renderVisualizerHost(secondRoot as unknown as Element, withFeedOn);
  assert.equal(firstHost.dataset.v2VisualizerTransition, "enter", "first root transition is independent");
  assert.equal(secondHost.dataset.v2VisualizerTransition, "enter", "second root transition is independent");

  const adaptiveHost = createFakeElement();
  const adaptiveDisplayWindow = createFakeElement();
  const adaptiveGraphDevice = createFakeElement();
  const adaptiveFeedPanel = createFakeElement();
  const adaptiveTitlePanel = createFakeElement();
  const adaptiveReleaseNotesPanel = createFakeElement();
  const adaptiveReleaseNotesBody = createFakeElement();
  adaptiveReleaseNotesBody.scrollHeight = 160;
  adaptiveReleaseNotesBody.clientHeight = 160;
  adaptiveReleaseNotesBody.offsetHeight = 160;
  adaptiveReleaseNotesPanel.querySelector = (selector: string): Element | null =>
    selector === ".v2-release-notes-body" ? adaptiveReleaseNotesBody as unknown as Element : null;
  const adaptiveHelpPanel = createFakeElement();
  const adaptiveFactorizationPanel = createFakeElement();
  const adaptiveNumberLinePanel = createFakeElement();
  const adaptiveCirclePanel = createFakeElement();
  const adaptiveEigenAllocatorPanel = createFakeElement();
  const adaptiveAlgebraicPanel = createFakeElement();
  const adaptiveTotalPanel = createFakeElement();
  const adaptiveRoot: RootLike = {
    querySelector: (selector: string) => {
      if (selector === "[data-v2-visualizer-host]") {
        return adaptiveHost as unknown as Element;
      }
      if (selector === "[data-display-window]") {
        return adaptiveDisplayWindow as unknown as Element;
      }
      if (selector === "[data-grapher-device]") {
        return adaptiveGraphDevice as unknown as Element;
      }
      if (selector === "[data-v2-feed-panel]") {
        return adaptiveFeedPanel as unknown as Element;
      }
      if (selector === "[data-v2-title-panel]") {
        return adaptiveTitlePanel as unknown as Element;
      }
      if (selector === "[data-v2-release-notes-panel]") {
        return adaptiveReleaseNotesPanel as unknown as Element;
      }
      if (selector === "[data-v2-help-panel]") {
        return adaptiveHelpPanel as unknown as Element;
      }
      if (selector === "[data-v2-factorization-panel]") {
        return adaptiveFactorizationPanel as unknown as Element;
      }
      if (selector === "[data-v2-total-panel]") {
        return adaptiveTotalPanel as unknown as Element;
      }
      if (selector === "[data-v2-number-line-panel]") {
        return adaptiveNumberLinePanel as unknown as Element;
      }
      if (selector === "[data-v2-circle-panel]") {
        return adaptiveCirclePanel as unknown as Element;
      }
      if (selector === "[data-v2-eigen-allocator-panel]") {
        return adaptiveEigenAllocatorPanel as unknown as Element;
      }
      if (selector === "[data-v2-algebraic-panel]") {
        return adaptiveAlgebraicPanel as unknown as Element;
      }
      return null;
    },
    querySelectorAll: () => [],
  };
  renderVisualizerHost(adaptiveRoot as unknown as Element, withReleaseNotesSelected);
  assert.equal(
    adaptiveDisplayWindow.attributes["style:--v2-visualizer-panel-height"],
    "160.00px",
    "text-budget visualizers can override canonical target height using rendered content measurement",
  );

  const feedHost = createFakeElement();
  const feedDisplayWindow = createFakeElement();
  const feedGraphDevice = createFakeElement();
  const feedBaselinePanel = createFakeElement();
  const feedTable = createFakeElement();
  feedTable.scrollHeight = 58;
  feedTable.clientHeight = 58;
  feedTable.offsetHeight = 58;
  feedBaselinePanel.querySelector = (selector: string): Element | null =>
    selector === ".v2-feed-table" ? feedTable as unknown as Element : null;
  const feedTitlePanel = createFakeElement();
  const feedReleaseNotesPanel = createFakeElement();
  const feedHelpPanel = createFakeElement();
  const feedFactorizationPanel = createFakeElement();
  const feedNumberLinePanel = createFakeElement();
  const feedCirclePanel = createFakeElement();
  const feedEigenAllocatorPanel = createFakeElement();
  const feedAlgebraicPanel = createFakeElement();
  const feedTotalPanel = createFakeElement();
  const feedRoot: RootLike = {
    querySelector: (selector: string) => {
      if (selector === "[data-v2-visualizer-host]") {
        return feedHost as unknown as Element;
      }
      if (selector === "[data-display-window]") {
        return feedDisplayWindow as unknown as Element;
      }
      if (selector === "[data-grapher-device]") {
        return feedGraphDevice as unknown as Element;
      }
      if (selector === "[data-v2-feed-panel]") {
        return feedBaselinePanel as unknown as Element;
      }
      if (selector === "[data-v2-title-panel]") {
        return feedTitlePanel as unknown as Element;
      }
      if (selector === "[data-v2-release-notes-panel]") {
        return feedReleaseNotesPanel as unknown as Element;
      }
      if (selector === "[data-v2-help-panel]") {
        return feedHelpPanel as unknown as Element;
      }
      if (selector === "[data-v2-factorization-panel]") {
        return feedFactorizationPanel as unknown as Element;
      }
      if (selector === "[data-v2-total-panel]") {
        return feedTotalPanel as unknown as Element;
      }
      if (selector === "[data-v2-number-line-panel]") {
        return feedNumberLinePanel as unknown as Element;
      }
      if (selector === "[data-v2-circle-panel]") {
        return feedCirclePanel as unknown as Element;
      }
      if (selector === "[data-v2-eigen-allocator-panel]") {
        return feedEigenAllocatorPanel as unknown as Element;
      }
      if (selector === "[data-v2-algebraic-panel]") {
        return feedAlgebraicPanel as unknown as Element;
      }
      return null;
    },
    querySelectorAll: () => [],
  };
  renderVisualizerHost(feedRoot as unknown as Element, withFeedOn);
  assert.equal(
    feedDisplayWindow.attributes["style:--v2-visualizer-panel-height"],
    "96.00px",
    "feed visualizer can shrink to baseline row height floor for sparse table content",
  );

  const withPrimeVisualizers: GameState = {
    ...base,
    activeCalculatorId: "f_prime",
    calculatorOrder: ["f_prime", "g_prime"],
    calculators: {
      f_prime: {
        id: "f_prime",
        symbol: "f_prime",
        calculator: {
          ...base.calculator,
          rollEntries: [...base.calculator.rollEntries],
          operationSlots: [...base.calculator.operationSlots],
          stepProgress: {
            ...base.calculator.stepProgress,
            executedSlotResults: [...base.calculator.stepProgress.executedSlotResults],
          },
        },
        settings: {
          ...base.settings,
          visualizer: "total",
        },
        lambdaControl: { ...base.lambdaControl },
        allocator: {
          ...base.allocator,
          allocations: { ...base.allocator.allocations },
        },
        ui: {
          ...base.ui,
          keyLayout: base.ui.keyLayout.map((cell) => ({ ...cell })),
          keypadCells: base.ui.keypadCells.map((cell) => ({ ...cell, cell: { ...cell.cell } })),
          storageLayout: [...base.ui.storageLayout],
          buttonFlags: { ...base.ui.buttonFlags },
          diagnostics: {
            lastAction: { ...base.ui.diagnostics.lastAction },
          },
          activeVisualizer: "total",
        },
      },
      g_prime: {
        id: "g_prime",
        symbol: "g_prime",
        calculator: {
          ...base.calculator,
          rollEntries: [...base.calculator.rollEntries],
          operationSlots: [...base.calculator.operationSlots],
          stepProgress: {
            ...base.calculator.stepProgress,
            executedSlotResults: [...base.calculator.stepProgress.executedSlotResults],
          },
        },
        settings: {
          ...base.settings,
          visualizer: "graph",
        },
        lambdaControl: { ...base.lambdaControl },
        allocator: {
          ...base.allocator,
          allocations: { ...base.allocator.allocations },
        },
        ui: {
          ...base.ui,
          keyLayout: base.ui.keyLayout.map((cell) => ({ ...cell })),
          keypadCells: base.ui.keypadCells.map((cell) => ({ ...cell, cell: { ...cell.cell } })),
          storageLayout: [...base.ui.storageLayout],
          buttonFlags: { ...base.ui.buttonFlags },
          diagnostics: {
            lastAction: { ...base.ui.diagnostics.lastAction },
          },
          activeVisualizer: "graph",
        },
      },
    },
  };
  const fPrimeInstance = createFakeVisualizerInstance("f_prime");
  const gPrimeInstance = createFakeVisualizerInstance("g_prime");
  const primeRoot: RootLike = {
    querySelector: () => null,
    querySelectorAll: () => [fPrimeInstance.instance as unknown as Element, gPrimeInstance.instance as unknown as Element],
  };

  renderVisualizerHost(primeRoot as unknown as Element, withPrimeVisualizers);
  assert.equal(
    fPrimeInstance.host.dataset.v2VisualizerPanel,
    "total",
    "f_prime instance keeps its own total visualizer projection",
  );
  assert.equal(
    fPrimeInstance.graph.attributes["aria-hidden"],
    "true",
    "f_prime graph panel remains hidden when f_prime visualizer is total",
  );
  assert.equal(
    gPrimeInstance.host.dataset.v2VisualizerPanel,
    "graph",
    "g_prime instance keeps its own graph visualizer projection",
  );
  assert.equal(
    gPrimeInstance.graph.attributes["aria-hidden"],
    "false",
    "g_prime graph panel is visible when g_prime visualizer is graph",
  );
  } finally {
    graphModule.clear = originalGraphClear;
  }
};

