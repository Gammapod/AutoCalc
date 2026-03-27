import assert from "node:assert/strict";
import { installDomHarness } from "./helpers/domHarness.js";
import { initialState } from "../src/domain/state.js";
import {
  detectResidueWheelSpec,
  projectRadialPoints,
  projectResidueWheelPoints,
  resolveCircleRenderMode,
  toCanonicalWheelIndex,
} from "../src/ui/modules/visualizers/circleModel.js";
import { renderCircleVisualizerPanel } from "../src/ui/modules/visualizers/circleRenderer.js";
import type { GameState, RollEntry } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n): RollEntry["y"] => ({
  kind: "rational",
  value: { num, den },
});
const e = (y: RollEntry["y"], patch: Partial<RollEntry> = {}): RollEntry => ({ y, ...patch });

export const runUiModuleCircleVisualizerV2Tests = (): void => {
  const base = initialState();
  const deltaBoundary = (10 ** base.unlocks.maxTotalDigits) - 1;

  const cycleWindowState: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      rollEntries: [
        e(r(0n)),
        e(r(12n, 10n)),
        e(r(28n, 10n)),
        e(r(14n, 10n)),
        e(r(36n, 10n)),
      ],
      rollAnalysis: {
        stopReason: "cycle",
        cycle: {
          i: 1,
          j: 4,
          transientLength: 1,
          periodLength: 3,
        },
      },
    },
  };
  const wheelSpec = detectResidueWheelSpec(cycleWindowState);
  assert.ok(wheelSpec, "cycle stop reason enables residue-wheel mode");
  assert.equal(wheelSpec?.wheelMin, 1, "wheel minimum uses floor(min) over cycle window");
  assert.equal(wheelSpec?.wheelMaxExclusive, 4, "wheel maximum uses ceil(max) over cycle window");
  assert.equal(wheelSpec?.span, 3, "wheel span matches maxExclusive - min");
  assert.equal(resolveCircleRenderMode(cycleWindowState), "residue_wheel", "render mode resolves to residue wheel");

  const constantCycle: GameState = {
    ...cycleWindowState,
    calculator: {
      ...cycleWindowState.calculator,
      rollEntries: [e(r(0n)), e(r(2n)), e(r(2n)), e(r(2n))],
      rollAnalysis: {
        stopReason: "cycle",
        cycle: {
          i: 1,
          j: 3,
          transientLength: 1,
          periodLength: 2,
        },
      },
    },
  };
  assert.equal(detectResidueWheelSpec(constantCycle), null, "constant cycle range does not enable residue-wheel mode");
  assert.equal(resolveCircleRenderMode(constantCycle), "radial", "constant cycle remains in radial mode");

  const nonCycleState: GameState = {
    ...cycleWindowState,
    calculator: {
      ...cycleWindowState.calculator,
      rollAnalysis: { stopReason: "none", cycle: null },
    },
  };
  assert.equal(detectResidueWheelSpec(nonCycleState), null, "non-cycle roll analysis keeps radial mode");

  const withModZeroToDelta: GameState = {
    ...base,
    settings: {
      ...base.settings,
      wrapper: "mod_zero_to_delta",
    },
  };
  const modFlagSpec = detectResidueWheelSpec(withModZeroToDelta);
  assert.ok(modFlagSpec, "mod-zero-to-delta flag enables wheel mode immediately");
  assert.equal(resolveCircleRenderMode(withModZeroToDelta), "residue_wheel", "mod-zero-to-delta flag forces residue wheel mode");
  assert.equal(modFlagSpec?.cycleEndIndex, -1, "mod-flag wheel starts at seed with no radial history segment");
  assert.equal(modFlagSpec?.wheelMin, 0, "mod-zero-to-delta wheel starts at zero");
  assert.equal(modFlagSpec?.wheelMaxExclusive, deltaBoundary, "mod-zero-to-delta wheel upper bound follows delta boundary");

  const withDeltaRange: GameState = {
    ...base,
    settings: {
      ...base.settings,
      wrapper: "delta_range_clamp",
    },
  };
  const deltaFlagSpec = detectResidueWheelSpec(withDeltaRange);
  assert.ok(deltaFlagSpec, "delta-range flag enables wheel mode immediately");
  assert.equal(resolveCircleRenderMode(withDeltaRange), "residue_wheel", "delta-range flag forces residue wheel mode");
  assert.equal(deltaFlagSpec?.wheelMin, -deltaBoundary, "delta-range wheel lower bound is -delta");
  assert.equal(deltaFlagSpec?.wheelMaxExclusive, deltaBoundary, "delta-range wheel upper bound is +delta exclusive");

  assert.equal(toCanonicalWheelIndex(-2, 3), 1, "canonical wheel index wraps negatives");
  const residueProjection = projectResidueWheelPoints(
    [
      e(r(0n)),
      e(r(12n, 10n)),
      e(r(28n, 10n)),
      e(r(14n, 10n)),
      e(r(36n, 10n)),
      e(r(47n, 10n)),
      e(r(-11n, 10n)),
      e(r(51n, 10n), { error: { code: "x\u2209[-R,R]", kind: "overflow" } }),
      e(r(19n, 10n)),
    ],
    {
      cycleStartIndex: 1,
      cycleEndIndex: 4,
      wheelMin: 1,
      wheelMaxExclusive: 4,
      span: 3,
    },
    50,
    48,
  );
  assert.deepEqual(
    residueProjection.dots.map((dot) => dot.residue),
    [0, 0, 1, 0],
    "residue-wheel projection starts at entries after cycle index j and maps by canonical wheel index",
  );
  assert.deepEqual(
    residueProjection.dots.map((dot) => dot.hasError),
    [false, false, true, false],
    "wheel projection includes error points and tags them for rendering",
  );
  assert.ok(
    residueProjection.segments.every((segment) => segment.length >= 1),
    "wheel trace segments remain contiguous between error boundaries",
  );

  const layeredState: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      rollEntries: [
        e(r(0n)),
        e(r(1n)),
        e(r(2n)),
        e(r(3n)),
        e(r(4n)),
        e(r(5n)),
      ],
      rollAnalysis: {
        stopReason: "cycle",
        cycle: {
          i: 1,
          j: 3,
          transientLength: 1,
          periodLength: 2,
        },
      },
    },
  };
  const fullRadial = projectRadialPoints(layeredState, 50, 48);
  const cappedRadial = projectRadialPoints(layeredState, 50, 48, 3);
  assert.ok(fullRadial.dots.length > cappedRadial.dots.length, "radial cap keeps history through cycle index j only");

  const radialWithError: GameState = {
    ...base,
    calculator: {
      ...base.calculator,
      rollEntries: [e(r(0n)), e(r(1n)), e(r(2n), { error: { code: "x\u2209[-R,R]", kind: "overflow" } }), e(r(3n))],
    },
  };
  const radialErrorProjection = projectRadialPoints(radialWithError, 50, 48);
  assert.deepEqual(
    radialErrorProjection.segments.map((segment) => segment.length),
    [2, 1],
    "radial error points break the trace into separate segments",
  );

  const harness = installDomHarness();
  try {
    renderCircleVisualizerPanel(harness.root, {
      ...layeredState,
      calculator: {
        ...layeredState.calculator,
        rollEntries: [
          ...layeredState.calculator.rollEntries,
          e(r(6n), { error: { code: "x\u2209[-R,R]", kind: "overflow" } }),
          e(r(7n)),
        ],
      },
    });
    const panel = harness.root.querySelector<HTMLElement>("[data-v2-circle-panel]");
    assert.ok(panel, "expected circle panel mount");
    if (!panel) {
      return;
    }
    assert.equal(panel.dataset.v2CircleMode, "residue_wheel", "renderer tags panel with residue-wheel mode");
    assert.equal(panel.querySelectorAll(".v2-circle-slice").length, 0, "renderer does not emit residue slices");
    assert.ok(panel.querySelector(".v2-circle-point--radial"), "renderer keeps radial history points");
    assert.ok(panel.querySelector(".v2-circle-point--wheel"), "renderer overlays wheel points for post-cycle entries");
    assert.ok(panel.querySelector(".v2-circle-point--error"), "renderer marks plotted errors with error class");
    assert.ok(panel.querySelector(".v2-circle-trace--radial"), "renderer emits radial trace layer");
    assert.ok(panel.querySelector(".v2-circle-trace--wheel"), "renderer emits wheel trace layer");
  } finally {
    harness.teardown();
  }

  const modFlagHarness = installDomHarness();
  try {
    renderCircleVisualizerPanel(modFlagHarness.root, {
      ...base,
      calculator: {
        ...base.calculator,
        rollEntries: [e(r(0n)), e(r(5n)), e(r(11n)), e(r(2n), { error: { code: "x\u2209[-R,R]", kind: "overflow" } })],
      },
      ui: {
        ...base.ui,
      },
      settings: {
        ...base.settings,
        wrapper: "mod_zero_to_delta",
      },
    });
    const panel = modFlagHarness.root.querySelector<HTMLElement>("[data-v2-circle-panel]");
    assert.ok(panel, "expected circle panel mount for mod-flag render");
    if (!panel) {
      return;
    }
    assert.equal(panel.dataset.v2CircleMode, "residue_wheel", "mod-flag render stays in residue mode");
    assert.equal(panel.querySelectorAll(".v2-circle-point--radial").length, 0, "mod-flag render suppresses radial points");
    assert.ok(panel.querySelector(".v2-circle-point--wheel"), "mod-flag render emits wheel points from start");
  } finally {
    modFlagHarness.teardown();
  }
};



