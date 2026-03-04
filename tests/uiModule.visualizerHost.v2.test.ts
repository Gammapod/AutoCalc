import assert from "node:assert/strict";
import { FEED_VISIBLE_FLAG, GRAPH_VISIBLE_FLAG, initialState } from "../src/domain/state.js";
import { clearVisualizerHost, renderVisualizerHost, resolveActiveVisualizerPanel } from "../src_v2/ui/renderAdapter.js";
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

  const withGraphOn: GameState = {
    ...base,
    ui: {
      ...base.ui,
      buttonFlags: {
        ...base.ui.buttonFlags,
        [GRAPH_VISIBLE_FLAG]: true,
      },
    },
  };
  assert.equal(resolveActiveVisualizerPanel(withGraphOn), "graph", "graph flag activates graph panel");

  const withFeedOnEmptyRoll: GameState = {
    ...base,
    ui: {
      ...base.ui,
      buttonFlags: {
        ...base.ui.buttonFlags,
        [FEED_VISIBLE_FLAG]: true,
      },
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
      buttonFlags: {
        ...withFeedOnRoll.ui.buttonFlags,
        [GRAPH_VISIBLE_FLAG]: true,
      },
    },
  };
  assert.equal(resolveActiveVisualizerPanel(withGraphAndFeed), "graph", "graph suppresses feed when both flags are on");

  const missingRoot: RootLike = {
    querySelector: () => null,
  };
  assert.doesNotThrow(
    () => renderVisualizerHost(missingRoot as unknown as Element, withFeedOnRoll),
    "visualizer host renderer safely handles missing mount points",
  );

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
