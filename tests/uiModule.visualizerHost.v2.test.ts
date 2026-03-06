import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
import { clearVisualizerHost, renderVisualizerHost, resolveActiveVisualizerPanel } from "../src_v2/ui/renderAdapter.js";
import { VISUALIZER_REGISTRY } from "../src_v2/ui/modules/visualizers/registry.js";
import type { GameState } from "../src/domain/types.js";

type RootLike = {
  querySelector: (selector: string) => Element | null;
};

type FakeElement = {
  innerHTML: string;
  dataset: Record<string, string>;
  attributes: Record<string, string>;
  setAttribute: (name: string, value: string) => void;
};

const createFakeElement = (): FakeElement => {
  const element: FakeElement = {
    innerHTML: "",
    dataset: {},
    attributes: {},
    setAttribute(name: string, value: string): void {
      element.attributes[name] = value;
    },
  };
  return element;
};

const r = (num: bigint): { kind: "rational"; value: { num: bigint; den: bigint } } => ({
  kind: "rational",
  value: { num, den: 1n },
});

export const runUiModuleVisualizerHostV2Tests = (): void => {
  const base = initialState();
  assert.equal(resolveActiveVisualizerPanel(base), "none", "no toggles keeps visualizer host hidden");
  assert.deepEqual(
    VISUALIZER_REGISTRY.map((module) => module.id),
    ["graph", "feed"],
    "visualizer registry preserves graph-first precedence order",
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
      roll: [r(7n)],
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
  assert.equal(resolveActiveVisualizerPanel(withCircleSelected), "none", "unsupported visualizer ids resolve to none");

  const missingRoot: RootLike = {
    querySelector: () => null,
  };
  assert.doesNotThrow(
    () => renderVisualizerHost(missingRoot as unknown as Element, withFeedOnRoll),
    "visualizer host renderer safely handles missing mount points",
  );

  const renderHost = createFakeElement();
  const renderGraphDevice = createFakeElement();
  const renderFeedPanel = createFakeElement();
  renderFeedPanel.innerHTML = "stale";
  renderFeedPanel.attributes["aria-hidden"] = "false";
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
      return null;
    },
  };
  renderVisualizerHost(renderRoot as unknown as Element, withGraphOn);
  assert.equal(renderHost.dataset.v2VisualizerPanel, "graph", "host data state tracks active graph panel");
  assert.equal(renderHost.attributes["aria-hidden"], "false", "active panel keeps visualizer host visible");
  assert.equal(renderGraphDevice.attributes["aria-hidden"], "false", "graph panel is shown when graph is active");
  assert.equal(renderFeedPanel.innerHTML, "", "inactive feed panel is cleared during graph render");
  assert.equal(renderFeedPanel.attributes["aria-hidden"], "true", "inactive feed panel is hidden during graph render");

  const host = createFakeElement();
  const graphDevice = createFakeElement();
  const feedPanel = createFakeElement();
  feedPanel.innerHTML = "stale";
  feedPanel.attributes["aria-hidden"] = "false";
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
      return null;
    },
  };
  clearVisualizerHost(cleanupRoot as unknown as Element);
  assert.equal(feedPanel.innerHTML, "", "clearVisualizerHost clears feed rows");
  assert.equal(feedPanel.attributes["aria-hidden"], "true", "clearVisualizerHost hides feed panel");
  assert.equal(graphDevice.attributes["aria-hidden"], "true", "clearVisualizerHost hides graph panel");
  assert.equal(host.attributes["aria-hidden"], "true", "clearVisualizerHost hides host");
  assert.equal(host.dataset.v2VisualizerPanel, "none", "clearVisualizerHost resets host panel");
};
