import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { clearVisualizerHost, renderVisualizerHost, resolveActiveVisualizerPanel } from "../src/ui/renderAdapter.js";
import { VISUALIZER_REGISTRY } from "../src/ui/modules/visualizers/registry.js";
import type { GameState, RollEntry } from "../src/domain/types.js";

type RootLike = {
  querySelector: (selector: string) => Element | null;
};

type FakeElement = {
  innerHTML: string;
  dataset: Record<string, string>;
  attributes: Record<string, string>;
  style: {
    setProperty: (name: string, value: string) => void;
    removeProperty: (name: string) => void;
  };
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  getBoundingClientRect: () => { height: number };
};

const createFakeElement = (): FakeElement => {
  const element: FakeElement = {
    innerHTML: "",
    dataset: {},
    attributes: {},
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
    ["graph", "feed", "factorization", "circle", "eigen_allocator", "algebraic"],
    "visualizer registry preserves graph/feed/factorization/circle order with eigen allocator and algebraic support",
  );

  const withGraphOn: GameState = {
    ...base,
    ui: {
      ...base.ui,
      activeVisualizer: "graph",
    },
  };
  assert.equal(resolveActiveVisualizerPanel(withGraphOn), "graph", "graph flag activates graph panel");

  const withFeedOnEmptyRoll: GameState = {
    ...base,
    ui: {
      ...base.ui,
      activeVisualizer: "feed",
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
    ui: {
      ...withFeedOnRoll.ui,
      activeVisualizer: "graph",
    },
  };
  assert.equal(resolveActiveVisualizerPanel(withGraphAndFeed), "graph", "graph panel is active when selected");

  const withCircleSelected: GameState = {
    ...base,
    ui: {
      ...base.ui,
      activeVisualizer: "circle",
    },
  };
  assert.equal(resolveActiveVisualizerPanel(withCircleSelected), "circle", "circle visualizer resolves to circle panel");

  const withEigenSelected: GameState = {
    ...base,
    ui: {
      ...base.ui,
      activeVisualizer: "eigen_allocator",
    },
  };
  assert.equal(resolveActiveVisualizerPanel(withEigenSelected), "eigen_allocator", "lambda visualizer resolves to eigen allocator panel");

  const missingRoot: RootLike = {
    querySelector: () => null,
  };
  assert.doesNotThrow(
    () => renderVisualizerHost(missingRoot as unknown as Element, withFeedOnRoll),
    "visualizer host renderer safely handles missing mount points",
  );
  clearVisualizerHost(missingRoot as unknown as Element);

  const renderHost = createFakeElement();
  const renderGraphDevice = createFakeElement();
  const renderFeedPanel = createFakeElement();
  const renderFactorizationPanel = createFakeElement();
  const renderCirclePanel = createFakeElement();
  const renderEigenAllocatorPanel = createFakeElement();
  const renderAlgebraicPanel = createFakeElement();
  const renderTotalPanel = createFakeElement();
  renderFeedPanel.innerHTML = "stale";
  renderFeedPanel.attributes["aria-hidden"] = "false";
  renderCirclePanel.innerHTML = "stale";
  renderCirclePanel.attributes["aria-hidden"] = "false";
  renderTotalPanel.attributes["aria-hidden"] = "false";
  const renderRoot: RootLike = {
    querySelector: (selector: string) => {
      if (selector === "[data-v2-visualizer-host]") {
        return renderHost as unknown as Element;
      }
      if (selector === "[data-grapher-device]") {
        return renderGraphDevice as unknown as Element;
      }
      if (selector === "[data-v2-feed-panel]") {
        return renderFeedPanel as unknown as Element;
      }
      if (selector === "[data-v2-factorization-panel]") {
        return renderFactorizationPanel as unknown as Element;
      }
      if (selector === "[data-v2-total-panel]") {
        return renderTotalPanel as unknown as Element;
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
  };
  renderVisualizerHost(renderRoot as unknown as Element, withGraphOn);
  assert.equal(renderHost.dataset.v2VisualizerPanel, "graph", "host data state tracks active graph panel");
  assert.equal(renderHost.dataset.v2VisualizerFrom, "total", "host tracks previous panel");
  assert.equal(renderHost.dataset.v2VisualizerTo, "graph", "host tracks next panel");
  assert.equal(renderHost.dataset.v2VisualizerTransition, "enter", "total to graph is enter transition");
  assert.equal(renderHost.attributes["aria-hidden"], "false", "active panel keeps visualizer host visible");
  assert.equal(renderGraphDevice.attributes["aria-hidden"], "false", "graph panel is shown when graph is active");
  assert.equal(renderFeedPanel.innerHTML, "", "inactive feed panel is cleared during graph render");
  assert.equal(renderFeedPanel.attributes["aria-hidden"], "true", "inactive feed panel is hidden during graph render");
  assert.equal(renderFactorizationPanel.innerHTML, "", "inactive factorization panel is cleared during graph render");
  assert.equal(renderFactorizationPanel.attributes["aria-hidden"], "true", "inactive factorization panel is hidden during graph render");
  assert.equal(renderCirclePanel.innerHTML, "", "inactive circle panel is cleared during graph render");
  assert.equal(renderCirclePanel.attributes["aria-hidden"], "true", "inactive circle panel is hidden during graph render");
  assert.equal(renderEigenAllocatorPanel.innerHTML, "", "inactive eigen allocator panel is cleared during graph render");
  assert.equal(renderEigenAllocatorPanel.attributes["aria-hidden"], "true", "inactive eigen allocator panel is hidden during graph render");
  assert.equal(renderAlgebraicPanel.innerHTML, "", "inactive algebraic panel is cleared during graph render");
  assert.equal(renderAlgebraicPanel.attributes["aria-hidden"], "true", "inactive algebraic panel is hidden during graph render");
  assert.equal(renderTotalPanel.attributes["aria-hidden"], "true", "inactive total panel is hidden during graph render");
  const withFeedOn: GameState = {
    ...withGraphOn,
    ui: {
      ...withGraphOn.ui,
      activeVisualizer: "feed",
    },
  };
  renderVisualizerHost(renderRoot as unknown as Element, withFeedOn);
  assert.equal(renderHost.dataset.v2VisualizerTransition, "swap", "graph to feed is swap transition");
  assert.equal(renderHost.attributes["data-v2-visualizer-height-lock"], "true", "swap applies temporary height lock");

  renderVisualizerHost(renderRoot as unknown as Element, base);
  assert.equal(renderHost.dataset.v2VisualizerTransition, "exit", "visualizer to total is exit transition");

  const host = createFakeElement();
  const graphDevice = createFakeElement();
  const feedPanel = createFakeElement();
  const factorizationPanel = createFakeElement();
  const circlePanel = createFakeElement();
  const eigenAllocatorPanel = createFakeElement();
  const algebraicPanel = createFakeElement();
  const totalPanel = createFakeElement();
  feedPanel.innerHTML = "stale";
  feedPanel.attributes["aria-hidden"] = "false";
  circlePanel.innerHTML = "stale";
  circlePanel.attributes["aria-hidden"] = "false";
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
      if (selector === "[data-v2-factorization-panel]") {
        return factorizationPanel as unknown as Element;
      }
      if (selector === "[data-v2-total-panel]") {
        return totalPanel as unknown as Element;
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
  };
  clearVisualizerHost(cleanupRoot as unknown as Element);
  assert.equal(feedPanel.innerHTML, "", "clearVisualizerHost clears feed rows");
  assert.equal(factorizationPanel.innerHTML, "", "clearVisualizerHost clears factorization panel");
  assert.equal(circlePanel.innerHTML, "", "clearVisualizerHost clears circle panel");
  assert.equal(eigenAllocatorPanel.innerHTML, "", "clearVisualizerHost clears eigen allocator panel");
  assert.equal(algebraicPanel.innerHTML, "", "clearVisualizerHost clears algebraic panel");
  assert.equal(feedPanel.attributes["aria-hidden"], "true", "clearVisualizerHost hides feed panel");
  assert.equal(factorizationPanel.attributes["aria-hidden"], "true", "clearVisualizerHost hides factorization panel");
  assert.equal(circlePanel.attributes["aria-hidden"], "true", "clearVisualizerHost hides circle panel");
  assert.equal(eigenAllocatorPanel.attributes["aria-hidden"], "true", "clearVisualizerHost hides eigen allocator panel");
  assert.equal(algebraicPanel.attributes["aria-hidden"], "true", "clearVisualizerHost hides algebraic panel");
  assert.equal(graphDevice.attributes["aria-hidden"], "true", "clearVisualizerHost hides graph panel");
  assert.equal(totalPanel.attributes["aria-hidden"], "true", "clearVisualizerHost hides total panel");
  assert.equal(host.attributes["aria-hidden"], "true", "clearVisualizerHost hides host");
  assert.equal(host.dataset.v2VisualizerPanel, "total", "clearVisualizerHost resets host panel");

  const firstHost = createFakeElement();
  const firstGraphDevice = createFakeElement();
  const firstFeedPanel = createFakeElement();
  const firstFactorizationPanel = createFakeElement();
  const firstCirclePanel = createFakeElement();
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
      if (selector === "[data-v2-factorization-panel]") {
        return firstFactorizationPanel as unknown as Element;
      }
      if (selector === "[data-v2-total-panel]") {
        return firstTotalPanel as unknown as Element;
      }
      if (selector === "[data-v2-circle-panel]") {
        return firstCirclePanel as unknown as Element;
      }
      if (selector === "[data-v2-eigen-allocator-panel]") {
        return firstEigenAllocatorPanel as unknown as Element;
      }
      if (selector === "[data-v2-algebraic-panel]") {
        return firstAlgebraicPanel as unknown as Element;
      }
      return null;
    },
  };

  const secondHost = createFakeElement();
  const secondGraphDevice = createFakeElement();
  const secondFeedPanel = createFakeElement();
  const secondFactorizationPanel = createFakeElement();
  const secondCirclePanel = createFakeElement();
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
      if (selector === "[data-v2-factorization-panel]") {
        return secondFactorizationPanel as unknown as Element;
      }
      if (selector === "[data-v2-total-panel]") {
        return secondTotalPanel as unknown as Element;
      }
      if (selector === "[data-v2-circle-panel]") {
        return secondCirclePanel as unknown as Element;
      }
      if (selector === "[data-v2-eigen-allocator-panel]") {
        return secondEigenAllocatorPanel as unknown as Element;
      }
      if (selector === "[data-v2-algebraic-panel]") {
        return secondAlgebraicPanel as unknown as Element;
      }
      return null;
    },
  };

  renderVisualizerHost(firstRoot as unknown as Element, withGraphOn);
  renderVisualizerHost(secondRoot as unknown as Element, withFeedOn);
  assert.equal(firstHost.dataset.v2VisualizerTransition, "enter", "first root transition is independent");
  assert.equal(secondHost.dataset.v2VisualizerTransition, "enter", "second root transition is independent");
};
