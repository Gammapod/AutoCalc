import assert from "node:assert/strict";
import { installDomHarness } from "./helpers/domHarness.js";
import { toNanCalculatorValue, toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { initialState } from "../src/domain/state.js";
import { renderFactorizationVisualizerPanel } from "../src/ui/modules/visualizers/factorizationRenderer.js";
import { buildFactorizationPanelViewModel } from "../src/ui/shared/readModel.js";
import type { GameState, RollEntry, RationalValue } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });
const rv = (num: bigint, den: bigint = 1n): RationalValue => ({ num, den });

const step = (
  y: bigint,
  {
    d1,
    d2,
    r1,
    factorization,
    seedMinus1Y,
    seedPlus1Y,
    error,
  }: {
    d1: RationalValue;
    d2?: RationalValue | null;
    r1: RationalValue;
    factorization?: RollEntry["factorization"];
    seedMinus1Y?: RollEntry["seedMinus1Y"];
    seedPlus1Y?: RollEntry["seedPlus1Y"];
    error?: RollEntry["error"];
  },
): RollEntry => ({
  y: r(y),
  d1,
  d2: d2 ?? null,
  r1,
  seedMinus1Y: seedMinus1Y ?? null,
  seedPlus1Y: seedPlus1Y ?? null,
  ...(error ? { error } : {}),
  ...(factorization ? { factorization } : {}),
});

const withRoll = (entries: RollEntry[]): GameState => ({
  ...initialState(),
  calculator: {
    ...initialState().calculator,
    rollEntries: entries,
  },
});

export const runUiModuleFactorizationRendererV2Tests = (): void => {
  const harness = installDomHarness();
  try {
    const panel = harness.root.querySelector<HTMLElement>("[data-v2-factorization-panel]");
    assert.ok(panel, "expected factorization visualizer mount");
    if (!panel) {
      return;
    }

    const defaultModel = buildFactorizationPanelViewModel(initialState());
    assert.equal(defaultModel.seedLabel, "f\u2080 = \u2205", "default seed zero renders as empty-set factorization");
    assert.equal(defaultModel.currentLabel, "f\u2099 = \u2205", "default pre-roll current entry is empty-set placeholder");
    assert.equal(defaultModel.growthOrder, "unknown", "default growth order is unknown before roll diagnostics exist");

    const preRollSeedState: GameState = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: r(12n),
      },
    };
    const preRollSeedModel = buildFactorizationPanelViewModel(preRollSeedState);
    assert.match(preRollSeedModel.seedLabel, /f\u2080 = 2\u00B2 \u00D7 3\u00B9/u, "pre-roll seed factorization is derived from current total");

    const nanSeedState: GameState = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: toNanCalculatorValue(),
      },
    };
    assert.equal(buildFactorizationPanelViewModel(nanSeedState).seedLabel, "f\u2080 = \u2205", "NaN seed renders empty-set placeholder");

    const linearState = withRoll([
      { y: r(2n) },
      step(4n, { d1: rv(2n), d2: rv(0n), r1: rv(2n) }),
      step(6n, { d1: rv(2n), d2: rv(0n), r1: rv(3n, 2n) }),
      step(8n, { d1: rv(2n), d2: rv(0n), r1: rv(4n, 3n) }),
      step(10n, { d1: rv(2n), d2: rv(0n), r1: rv(5n, 4n) }),
      step(12n, {
        d1: rv(2n),
        d2: rv(0n),
        r1: rv(6n, 5n),
        factorization: {
          sign: 1,
          numerator: [{ prime: 2n, exponent: 2 }, { prime: 3n, exponent: 1 }],
          denominator: [],
        },
      }),
    ]);
    const linearModel = buildFactorizationPanelViewModel(linearState);
    assert.equal(linearModel.growthOrder, "linear", "constant non-zero d1 over last five diagnostics resolves to linear");
    assert.equal(linearModel.growthLabel, "O(f) = linear", "non-cycle growth label uses O(f)");
    assert.match(linearModel.currentLabel, /f\u2099 = 2\u00B2 \u00D7 3\u00B9/u, "f_n retains latest stored factorization rendering");

    const constantState = withRoll([
      { y: r(9n) },
      step(9n, { d1: rv(0n), d2: rv(0n), r1: rv(1n) }),
      step(9n, { d1: rv(0n), d2: rv(0n), r1: rv(1n) }),
      step(9n, { d1: rv(0n), d2: rv(0n), r1: rv(1n) }),
      step(9n, { d1: rv(0n), d2: rv(0n), r1: rv(1n) }),
      step(9n, { d1: rv(0n), d2: rv(0n), r1: rv(1n) }),
    ]);
    assert.equal(buildFactorizationPanelViewModel(constantState).growthOrder, "constant", "all-zero d1 resolves to constant");

    const exponentialState = withRoll([
      { y: r(1n) },
      step(2n, { d1: rv(1n), d2: rv(1n), r1: rv(2n) }),
      step(4n, { d1: rv(2n), d2: rv(1n), r1: rv(2n) }),
      step(8n, { d1: rv(4n), d2: rv(2n), r1: rv(2n) }),
      step(16n, { d1: rv(8n), d2: rv(4n), r1: rv(2n) }),
      step(32n, { d1: rv(16n), d2: rv(8n), r1: rv(2n) }),
    ]);
    assert.equal(buildFactorizationPanelViewModel(exponentialState).growthOrder, "exponential", "constant |r1|>1 resolves to exponential");

    const quadraticState = withRoll([
      { y: r(0n) },
      step(1n, { d1: rv(1n), d2: rv(2n), r1: rv(1n) }),
      step(4n, { d1: rv(3n), d2: rv(2n), r1: rv(4n, 3n) }),
      step(9n, { d1: rv(5n), d2: rv(2n), r1: rv(3n, 2n) }),
      step(16n, { d1: rv(7n), d2: rv(2n), r1: rv(16n, 9n) }),
      step(25n, { d1: rv(9n), d2: rv(2n), r1: rv(25n, 16n) }),
    ]);
    assert.equal(buildFactorizationPanelViewModel(quadraticState).growthOrder, "quadratic", "constant non-zero d2 resolves to quadratic");

    const logarithmicState = withRoll([
      { y: r(0n) },
      step(0n, { d1: rv(1n), d2: rv(1n), r1: rv(1n, 2n) }),
      step(69n, { d1: rv(2n), d2: rv(3n), r1: rv(3n, 2n) }),
      step(110n, { d1: rv(4n), d2: rv(5n), r1: rv(4n, 3n) }),
      step(138n, { d1: rv(7n), d2: rv(8n), r1: rv(5n, 4n) }),
      step(160n, { d1: rv(11n), d2: rv(13n), r1: rv(6n, 5n) }),
    ]);
    assert.equal(buildFactorizationPanelViewModel(logarithmicState).growthOrder, "logarithmic", "AICc model selection can classify logarithmic sequences");

    const radicalState = withRoll([
      { y: r(100n) },
      step(100n, { d1: rv(3n), d2: rv(5n), r1: rv(7n, 5n) }),
      step(141n, { d1: rv(5n), d2: rv(8n), r1: rv(8n, 5n) }),
      step(173n, { d1: rv(8n), d2: rv(13n), r1: rv(9n, 5n) }),
      step(200n, { d1: rv(13n), d2: rv(21n), r1: rv(2n, 1n) }),
      step(223n, { d1: rv(21n), d2: rv(34n), r1: rv(11n, 5n) }),
    ]);
    assert.equal(buildFactorizationPanelViewModel(radicalState).growthOrder, "radical", "AICc model selection can classify sublinear power sequences");

    const shortWindowState = withRoll([
      { y: r(1n) },
      step(2n, { d1: rv(1n), d2: rv(1n), r1: rv(2n) }),
      step(3n, { d1: rv(1n), d2: rv(1n), r1: rv(3n, 2n) }),
      step(4n, { d1: rv(1n), d2: rv(1n), r1: rv(4n, 3n) }),
      step(5n, { d1: rv(1n), d2: rv(1n), r1: rv(5n, 4n) }),
    ]);
    assert.equal(buildFactorizationPanelViewModel(shortWindowState).growthOrder, "unknown", "fewer than five diagnostic samples resolves to unknown");

    const cycleLikelyState = withRoll([
      { y: r(3n) },
      step(7n, { d1: rv(1n), d2: rv(1n), r1: rv(2n) }),
      step(8n, { d1: rv(1n), d2: rv(1n), r1: rv(9n, 8n) }),
      step(9n, { d1: rv(1n), d2: rv(1n), r1: rv(9n, 8n) }),
      step(8n, { d1: rv(-1n), d2: rv(-2n), r1: rv(8n, 9n) }),
      step(7n, { d1: rv(-1n), d2: rv(-2n), r1: rv(7n, 8n) }),
      step(8n, { d1: rv(1n), d2: rv(2n), r1: rv(8n, 7n) }),
    ]);
    assert.equal(
      buildFactorizationPanelViewModel(cycleLikelyState).growthLabel,
      "O(f) = cycle-likely",
      "integer bounded repeated horizon triggers cycle-likely gating",
    );

    const chaosLikeState = withRoll([
      { y: r(0n) },
      step(2n, { d1: rv(2n), d2: rv(0n), r1: rv(2n), seedMinus1Y: r(1n), seedPlus1Y: r(3n) }),
      step(4n, { d1: rv(2n), d2: rv(0n), r1: rv(2n), seedMinus1Y: r(2n), seedPlus1Y: r(6n) }),
      step(8n, { d1: rv(4n), d2: rv(2n), r1: rv(2n), seedMinus1Y: r(4n), seedPlus1Y: r(12n) }),
      step(16n, { d1: rv(8n), d2: rv(4n), r1: rv(2n), seedMinus1Y: r(8n), seedPlus1Y: r(24n) }),
      step(32n, { d1: rv(16n), d2: rv(8n), r1: rv(2n), seedMinus1Y: r(16n), seedPlus1Y: r(48n) }),
      step(64n, { d1: rv(32n), d2: rv(16n), r1: rv(2n), seedMinus1Y: r(32n), seedPlus1Y: r(96n) }),
    ]);
    assert.equal(
      buildFactorizationPanelViewModel(chaosLikeState).growthLabel,
      "O(f) = chaos?",
      "monotone divergence over the required horizon triggers chaos-like gating",
    );

    const bothHeuristicsState = withRoll([
      { y: r(1n) },
      step(5n, { d1: rv(1n), d2: rv(1n), r1: rv(1n), seedMinus1Y: r(4n), seedPlus1Y: r(6n) }),
      step(6n, { d1: rv(1n), d2: rv(1n), r1: rv(1n), seedMinus1Y: r(4n), seedPlus1Y: r(8n) }),
      step(5n, { d1: rv(-1n), d2: rv(-2n), r1: rv(1n), seedMinus1Y: r(1n), seedPlus1Y: r(9n) }),
      step(6n, { d1: rv(1n), d2: rv(2n), r1: rv(1n), seedMinus1Y: r(-2n), seedPlus1Y: r(14n) }),
      step(5n, { d1: rv(-1n), d2: rv(-2n), r1: rv(1n), seedMinus1Y: r(-11n), seedPlus1Y: r(21n) }),
      step(6n, { d1: rv(1n), d2: rv(2n), r1: rv(1n), seedMinus1Y: r(-26n), seedPlus1Y: r(38n) }),
    ]);
    assert.equal(
      buildFactorizationPanelViewModel(bothHeuristicsState).growthLabel,
      "O(f) = cycle-likely",
      "cycle-likely gating takes precedence when both chaos-like and cycle-likely conditions are satisfied",
    );

    const cycleFrozenState: GameState = {
      ...withRoll([
        { y: r(2n) },
        step(4n, { d1: rv(2n), d2: rv(0n), r1: rv(2n) }),
        step(6n, { d1: rv(2n), d2: rv(0n), r1: rv(3n, 2n) }),
        step(8n, { d1: rv(2n), d2: rv(0n), r1: rv(4n, 3n) }),
        step(10n, { d1: rv(2n), d2: rv(0n), r1: rv(5n, 4n) }),
        step(12n, { d1: rv(2n), d2: rv(0n), r1: rv(6n, 5n) }),
        step(999n, { d1: rv(80n), d2: rv(77n), r1: rv(9n) }),
      ]),
      calculator: {
        ...withRoll([
          { y: r(2n) },
          step(4n, { d1: rv(2n), d2: rv(0n), r1: rv(2n) }),
          step(6n, { d1: rv(2n), d2: rv(0n), r1: rv(3n, 2n) }),
          step(8n, { d1: rv(2n), d2: rv(0n), r1: rv(4n, 3n) }),
          step(10n, { d1: rv(2n), d2: rv(0n), r1: rv(5n, 4n) }),
          step(12n, { d1: rv(2n), d2: rv(0n), r1: rv(6n, 5n) }),
          step(999n, { d1: rv(80n), d2: rv(77n), r1: rv(9n) }),
        ]).calculator,
        rollAnalysis: {
          stopReason: "cycle",
          cycle: {
            i: 2,
            j: 5,
            transientLength: 2,
            periodLength: 3,
          },
        },
      },
    };
    const cycleModel = buildFactorizationPanelViewModel(cycleFrozenState);
    assert.equal(cycleModel.growthOrder, "linear", "cycle freeze evaluates growth at detection index j");
    assert.equal(cycleModel.growthLabel, "O(f_\u03BC) = linear", "cycle state switches growth label to O(f_\u03BC)");
    assert.equal(cycleModel.transientLabel, "f^\u03BC = 2", "cycle state exposes transient length row");
    assert.equal(cycleModel.cycleLabel, "f^\u27E1 = 3", "cycle state exposes period length row");

    const cycleBypassChaosState: GameState = {
      ...chaosLikeState,
      calculator: {
        ...chaosLikeState.calculator,
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
    const cycleBypassModel = buildFactorizationPanelViewModel(cycleBypassChaosState);
    assert.match(cycleBypassModel.growthLabel, /^O\(f_\u03BC\) = /u, "cycle state bypasses non-cycle heuristic gates");
    assert.equal(cycleBypassModel.growthLabel.includes("chaos?"), false, "cycle state does not display chaos? override");
    assert.equal(cycleBypassModel.growthLabel.includes("cycle-likely"), false, "cycle state does not display cycle-likely override");

    const withRationalLatest = withRoll([
      {
        y: r(-6n, 35n),
        factorization: {
          sign: -1,
          numerator: [{ prime: 2n, exponent: 1 }, { prime: 3n, exponent: 1 }],
          denominator: [{ prime: 5n, exponent: 1 }, { prime: 7n, exponent: 1 }],
        },
      },
    ]);
    renderFactorizationVisualizerPanel(harness.root, withRationalLatest);
    assert.match(panel.textContent ?? "", /f\u2099 = -\(2\u00B9 \u00D7 3\u00B9\) \/ \(5\u00B9 \u00D7 7\u00B9\)/u, "rational latest factorization uses superscript exponent rendering");

    const missingPayloadNoDerive = withRoll([{ y: r(12n) }]);
    renderFactorizationVisualizerPanel(harness.root, missingPayloadNoDerive);
    assert.match(panel.textContent ?? "", /f\u2099 = \u2205/u, "latest entry still reads stored factorization payload and does not derive at render time");

    renderFactorizationVisualizerPanel(harness.root, cycleFrozenState);
    assert.equal(panel.getAttribute("aria-hidden"), "false", "factorization panel renders visible");
    assert.match(panel.textContent ?? "", /f\u2080 = 2\u00B9/u, "panel includes f_0 row");
    assert.match(panel.textContent ?? "", /O\(f_\u03BC\) = linear/u, "panel includes cycle growth label row");
    assert.match(panel.textContent ?? "", /f\u03BC = 2/u, "panel includes transient metadata row");
    assert.match(panel.textContent ?? "", /f\u27E1 = 3/u, "panel includes cycle metadata row");
    const cycleRows = panel.querySelectorAll(".v2-factorization-row--cycle");
    assert.equal(cycleRows.length, 2, "cycle metadata rows are marked with cycle styling class");
    const cycleSuperscripts = panel.querySelectorAll(".v2-factorization-row--cycle sup");
    assert.equal(cycleSuperscripts.length, 2, "cycle metadata labels render superscript glyphs");

    const errorLatestState: GameState = {
      ...withRationalLatest,
      calculator: {
        ...withRationalLatest.calculator,
        rollEntries: [
          {
            ...withRationalLatest.calculator.rollEntries[0],
            error: { code: "n/0", kind: "division_by_zero" },
          },
        ],
      },
    };
    renderFactorizationVisualizerPanel(harness.root, errorLatestState);
    const currentRow = panel.querySelectorAll(".v2-factorization-row")[1];
    assert.ok(currentRow?.classList.contains("v2-factorization-row--error"), "f\u2099 row is highlighted as error when latest roll entry has an error");
  } finally {
    harness.teardown();
  }
};

