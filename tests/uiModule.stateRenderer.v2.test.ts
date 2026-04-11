import assert from "node:assert/strict";
import { DELTA_RANGE_CLAMP_FLAG, initialState, HISTORY_FLAG, STEP_EXPANSION_FLAG } from "../src/domain/state.js";
import { renderStateVisualizerPanel } from "../src/ui/modules/visualizers/stateRenderer.js";
import { installDomHarness } from "./helpers/domHarness.js";

export const runUiModuleStateRendererV2Tests = (): void => {
  const harness = installDomHarness();
  try {
    const panel = harness.root.querySelector<HTMLElement>("[data-v2-state-panel]");
    assert.ok(panel, "expected state visualizer mount");
    if (!panel) {
      return;
    }

    const base = initialState();
    const state = {
      ...base,
      settings: {
        ...base.settings,
        visualizer: "state" as const,
        base: "base2" as const,
        stepExpansion: "on" as const,
      },
      lambdaControl: {
        alpha: 5,
        beta: 4,
        gamma: 3,
        delta: 2,
        epsilon: 1,
      },
      ui: {
        ...base.ui,
        buttonFlags: {
          ...base.ui.buttonFlags,
          [DELTA_RANGE_CLAMP_FLAG]: true,
          [HISTORY_FLAG]: true,
          [STEP_EXPANSION_FLAG]: true,
        },
      },
    };

    renderStateVisualizerPanel(harness.root, state);
    assert.equal(panel.getAttribute("aria-hidden"), "false", "state panel is visible after render");
    assert.match(panel.textContent ?? "", /alpha/u, "state panel includes alpha");
    assert.match(panel.textContent ?? "", /epsilon/u, "state panel includes epsilon");
    assert.match(panel.textContent ?? "", /active visualizer/u, "state panel includes active visualizer");
    assert.match(panel.textContent ?? "", /active base/u, "state panel includes active base");
    assert.match(panel.textContent ?? "", /active wrap/u, "state panel includes active wrap");
    assert.match(panel.textContent ?? "", /step_expansion/u, "state panel includes step expansion setting");
    assert.match(panel.textContent ?? "", /history/u, "state panel includes history setting");
    assert.match(panel.textContent ?? "", /set/u, "state panel reflects set toggles");
  } finally {
    harness.teardown();
  }
};
