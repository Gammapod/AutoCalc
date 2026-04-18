import assert from "node:assert/strict";
import { HISTORY_FLAG, initialState } from "../src/domain/state.js";
import type { GameState, RollEntry } from "../src/domain/types.js";
import {
  toExplicitComplexCalculatorValue,
  toExpressionCalculatorValue,
  toExpressionScalarValue,
  toNanCalculatorValue,
  toRationalScalarValue,
} from "../src/domain/calculatorValue.js";
import { symbolicExpr } from "../src/domain/expression.js";
import { clearRatiosVisualizerPanel, renderRatiosVisualizerPanel } from "../src/ui/modules/visualizers/ratiosRenderer.js";
import { installDomHarness } from "./helpers/domHarness.js";

const r = (num: bigint, den: bigint = 1n): { kind: "rational"; value: { num: bigint; den: bigint } } => ({
  kind: "rational",
  value: { num, den },
});
const c = (reNum: bigint, imNum: bigint): { kind: "complex"; value: { re: ReturnType<typeof r>; im: ReturnType<typeof r> } } => ({
  kind: "complex",
  value: {
    re: r(reNum),
    im: r(imNum),
  },
});
const re = (...values: RollEntry["y"][]): RollEntry[] => values.map((y) => ({ y }));
const withRoll = (state: GameState, entries: RollEntry[], cycle: GameState["calculator"]["rollAnalysis"]["cycle"]): GameState => ({
  ...state,
  calculator: {
    ...state.calculator,
    total: entries.at(-1)?.y ?? state.calculator.total,
    rollEntries: entries,
    rollAnalysis: cycle
      ? { stopReason: "cycle", cycle }
      : { stopReason: "none", cycle: null },
  },
});

const withImaginaryRollHistory = (state: GameState): GameState => ({
  ...state,
  calculator: {
    ...state.calculator,
    rollEntries: [{ y: c(0n, 1n) }, ...state.calculator.rollEntries],
  },
});

export const runUiModuleRatiosRendererV2Tests = (): void => {
  const harness = installDomHarness();
  try {
    const panel = harness.root.querySelector<HTMLElement>("[data-v2-ratios-panel]");
    assert.ok(panel, "expected ratios visualizer mount");
    if (!panel) {
      return;
    }

    renderRatiosVisualizerPanel(harness.root, initialState());
    assert.equal(panel.getAttribute("aria-hidden"), "false", "ratios panel is visible after render");
    assert.equal(panel.classList.contains("v2-ratios-panel--cycle"), false, "cycle class is off for initial state");
    const table = panel.querySelector<HTMLElement>(".v2-ratios-table");
    assert.ok(table, "ratios panel renders table scaffold");
    const domainIndicator = panel.querySelector<HTMLElement>(".v2-ratios-domain-indicator");
    const baseIndicator = panel.querySelector<HTMLElement>(".v2-ratios-base-indicator");
    assert.ok(domainIndicator, "ratios panel renders domain indicator");
    assert.ok(baseIndicator, "ratios panel renders base indicator");
    assert.equal((domainIndicator?.textContent ?? "").length > 0, true, "domain indicator renders a domain glyph");
    assert.equal(baseIndicator?.getAttribute("aria-hidden"), "true", "binary indicator is hidden in decimal mode");
    assert.equal(panel.querySelectorAll(".v2-ratios-row").length, 1, "ratios panel hides imaginary row while roll history is real-only");
    assert.equal(panel.querySelectorAll(".v2-ratios-separator").length, 1, "ratios panel renders one ':' separator for the visible row");
    const imaginaryRow = panel.querySelector<HTMLElement>(".v2-ratios-row--imaginary");
    assert.equal(imaginaryRow, null, "imaginary ratios row is not present when no roll has imaginary content");
    const initialTokens = Array.from(panel.querySelectorAll<HTMLElement>(".v2-ratios-display"))
      .map((display) => display.getAttribute("data-ratios-token"));
    assert.deepEqual(initialTokens, ["0", "1"], "initial ratios display shows only the real 0:1 row");
    const initialSlotCounts = Array.from(panel.querySelectorAll<HTMLElement>(".v2-ratios-display"))
      .map((display) => display.getAttribute("data-ratios-slot-count"));
    assert.deepEqual(initialSlotCounts, ["3", "1"], "initial ratios slots use delta for numerator and delta_q for denominator");

    renderRatiosVisualizerPanel(harness.root, withImaginaryRollHistory(initialState()));
    assert.equal(panel.querySelectorAll(".v2-ratios-row").length, 2, "ratios panel shows imaginary row once any roll has imaginary content");
    assert.equal(
      panel.querySelector<HTMLElement>(".v2-ratios-row--imaginary")?.getAttribute("data-ux-role"),
      "imaginary",
      "visible imaginary row uses imaginary feedback channel role",
    );

    const withComplexRationalTotal = withImaginaryRollHistory({
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: toExplicitComplexCalculatorValue(
          toRationalScalarValue({ num: 7n, den: 5n }),
          toRationalScalarValue({ num: -2n, den: 3n }),
        ),
      },
      unlocks: {
        ...initialState().unlocks,
        maxTotalDigits: 6,
      },
      lambdaControl: {
        ...initialState().lambdaControl,
        delta_q: 4,
      },
    });
    renderRatiosVisualizerPanel(harness.root, withComplexRationalTotal);
    const complexTokens = Array.from(panel.querySelectorAll<HTMLElement>(".v2-ratios-display"))
      .map((display) => display.getAttribute("data-ratios-token"));
    assert.deepEqual(complexTokens, ["-2", "3", "7", "5"], "ratios panel maps Im num:den on top row and Re num:den on bottom row");
    const complexSlotCounts = Array.from(panel.querySelectorAll<HTMLElement>(".v2-ratios-display"))
      .map((display) => display.getAttribute("data-ratios-slot-count"));
    assert.deepEqual(complexSlotCounts, ["6", "4", "6", "4"], "ratios slots track configured delta and delta_q");
    assert.equal(
      panel.querySelectorAll(".v2-ratios-display .seg--on").length > 0,
      true,
      "ratios panel renders seven-segment active glyphs",
    );

    const withWideDigitBudgets = {
      ...withComplexRationalTotal,
      unlocks: {
        ...withComplexRationalTotal.unlocks,
        maxTotalDigits: 11,
      },
      lambdaControl: {
        ...withComplexRationalTotal.lambdaControl,
        delta_q: 10,
      },
    };
    renderRatiosVisualizerPanel(harness.root, withWideDigitBudgets);
    const wideSlotCounts = Array.from(panel.querySelectorAll<HTMLElement>(".v2-ratios-display"))
      .map((display) => display.getAttribute("data-ratios-slot-count"));
    assert.deepEqual(wideSlotCounts, ["11", "10", "11", "10"], "ratios supports slots above 8 up to total-display cap");
    const withBinaryBase = {
      ...withWideDigitBudgets,
      settings: {
        ...withWideDigitBudgets.settings,
        base: "base2" as const,
      },
    };
    renderRatiosVisualizerPanel(harness.root, withBinaryBase);
    const binaryIndicator = panel.querySelector<HTMLElement>(".v2-ratios-base-indicator");
    assert.equal(binaryIndicator?.getAttribute("aria-hidden"), "false", "binary indicator is visible in binary mode");
    assert.equal(binaryIndicator?.textContent, "| BIN |", "binary indicator renders framed token");

    const realIrrationalState: GameState = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: toExpressionCalculatorValue(symbolicExpr("sqrt(2)")),
      },
    };
    renderRatiosVisualizerPanel(harness.root, realIrrationalState);
    const realIrrationalTokens = Array.from(panel.querySelectorAll<HTMLElement>(".v2-ratios-display"))
      .map((display) => display.getAttribute("data-ratios-token"));
    assert.deepEqual(
      realIrrationalTokens,
      ["rAdicAL", "rAdicAL"],
      "real-only roll history keeps the imaginary row hidden even for irrational real totals",
    );

    const complexImaginaryIrrationalState: GameState = withImaginaryRollHistory({
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: toExplicitComplexCalculatorValue(
          toRationalScalarValue({ num: 3n, den: 2n }),
          toExpressionScalarValue(symbolicExpr("sqrt(2)")),
        ),
      },
    });
    renderRatiosVisualizerPanel(harness.root, complexImaginaryIrrationalState);
    const complexImaginaryIrrationalTokens = Array.from(panel.querySelectorAll<HTMLElement>(".v2-ratios-display"))
      .map((display) => display.getAttribute("data-ratios-token"));
    assert.deepEqual(
      complexImaginaryIrrationalTokens,
      ["rAdicAL", "rAdicAL", "3", "2"],
      "complex irrational components render rAdicAL in both fields of the affected component",
    );

    const rationalExprState: GameState = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: toExpressionCalculatorValue({ type: "rational_literal", value: { num: 8n, den: 4n } }),
      },
    };
    renderRatiosVisualizerPanel(harness.root, rationalExprState);
    const rationalExprTokens = Array.from(panel.querySelectorAll<HTMLElement>(".v2-ratios-display"))
      .map((display) => display.getAttribute("data-ratios-token"));
    assert.deepEqual(
      rationalExprTokens,
      ["2", "1"],
      "rational-equivalent expressions keep imaginary row hidden with real-only roll history",
    );

    const cycle = { i: 1, j: 4, transientLength: 1, periodLength: 3 };
    const base = initialState();
    const historyOffCycleMatch = withRoll(base, re(r(1n), r(2n), r(3n), r(5n), r(2n), r(3n), r(5n), r(2n)), cycle);
    renderRatiosVisualizerPanel(harness.root, historyOffCycleMatch);
    assert.equal(panel.classList.contains("v2-ratios-panel--cycle"), false, "cycle styling is disabled when history is off");

    const historyOnBeforeDetection = withRoll(
      {
        ...base,
        ui: {
          ...base.ui,
          buttonFlags: {
            ...base.ui.buttonFlags,
            [HISTORY_FLAG]: true,
          },
        },
      },
      re(r(1n), r(2n), r(3n), r(5n)),
      cycle,
    );
    renderRatiosVisualizerPanel(harness.root, historyOnBeforeDetection);
    assert.equal(panel.classList.contains("v2-ratios-panel--cycle"), false, "cycle styling stays off before detection index");

    const historyOnCycleMatch = withRoll(
      {
        ...base,
        ui: {
          ...base.ui,
          buttonFlags: {
            ...base.ui.buttonFlags,
            [HISTORY_FLAG]: true,
          },
        },
      },
      re(r(1n), r(2n), r(3n), r(5n), r(2n), r(3n), r(5n), r(2n)),
      cycle,
    );
    renderRatiosVisualizerPanel(harness.root, historyOnCycleMatch);
    assert.equal(panel.classList.contains("v2-ratios-panel--cycle"), true, "cycle styling enables on cycle-start match after detection");

    const historyOnCycleNoMatch = withRoll(
      {
        ...base,
        ui: {
          ...base.ui,
          buttonFlags: {
            ...base.ui.buttonFlags,
            [HISTORY_FLAG]: true,
          },
        },
      },
      re(r(1n), r(2n), r(3n), r(5n), r(2n), r(3n)),
      cycle,
    );
    renderRatiosVisualizerPanel(harness.root, historyOnCycleNoMatch);
    assert.equal(panel.classList.contains("v2-ratios-panel--cycle"), false, "cycle styling stays off when latest does not match cycle-start");

    const complexCycleRows = withRoll(
      {
        ...base,
        ui: {
          ...base.ui,
          buttonFlags: {
            ...base.ui.buttonFlags,
            [HISTORY_FLAG]: true,
          },
        },
      },
      re(c(1n, 0n), c(0n, 1n), c(-1n, 0n), c(0n, -1n), c(1n, 0n), c(0n, 1n)),
      { i: 1, j: 5, transientLength: 1, periodLength: 4 },
    );
    renderRatiosVisualizerPanel(harness.root, complexCycleRows);
    assert.equal(panel.classList.contains("v2-ratios-panel--cycle"), true, "complex cycle-start matches also enable cycle styling");

    const overflowState: GameState = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: r(99n, 1n),
        rollEntries: [
          {
            y: r(99n, 1n),
            error: { code: "overflow", kind: "overflow" },
            limitMetadata: {
              rawY: r(150n, 7n),
              components: { re: "overflow", im: "none" },
            },
          },
        ],
      },
      unlocks: {
        ...initialState().unlocks,
        maxTotalDigits: 2,
      },
      lambdaControl: {
        ...initialState().lambdaControl,
        delta_q: 3,
      },
    };
    renderRatiosVisualizerPanel(harness.root, overflowState);
    const overflowTokens = Array.from(panel.querySelectorAll<HTMLElement>(".v2-ratios-display"))
      .map((display) => display.getAttribute("data-ratios-token"));
    assert.deepEqual(overflowTokens, ["99", "7"], "overflow displays clamped numerator while preserving raw denominator");

    const precisionOverflowState: GameState = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: r(3n, 4n),
        rollEntries: [
          {
            y: r(3n, 4n),
            error: { code: "overflow_q", kind: "overflow_q" },
            limitMetadata: {
              rawY: r(8n, 11n),
              components: { re: "overflow_q", im: "none" },
            },
          },
        ],
      },
      unlocks: {
        ...initialState().unlocks,
        maxTotalDigits: 3,
      },
      lambdaControl: {
        ...initialState().lambdaControl,
        delta_q: 1,
      },
    };
    renderRatiosVisualizerPanel(harness.root, precisionOverflowState);
    const precisionOverflowTokens = Array.from(panel.querySelectorAll<HTMLElement>(".v2-ratios-display"))
      .map((display) => display.getAttribute("data-ratios-token"));
    assert.deepEqual(
      precisionOverflowTokens,
      ["8", "4"],
      "precision overflow displays raw numerator while preserving clamped denominator",
    );

    const overflowWithoutMetadataState: GameState = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: r(99n, 1n),
        rollEntries: [
          { y: r(99n, 1n), error: { code: "overflow", kind: "overflow" } },
        ],
      },
    };
    renderRatiosVisualizerPanel(harness.root, overflowWithoutMetadataState);
    const overflowFallbackTokens = Array.from(panel.querySelectorAll<HTMLElement>(".v2-ratios-display"))
      .map((display) => display.getAttribute("data-ratios-token"));
    assert.deepEqual(
      overflowFallbackTokens,
      ["99", "1"],
      "missing overflow metadata falls back gracefully to clamped display values",
    );

    const nanErrorState: GameState = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: toNanCalculatorValue(),
        rollEntries: [{ y: toNanCalculatorValue(), error: { code: "seed_nan", kind: "nan_input" } }],
      },
    };
    renderRatiosVisualizerPanel(harness.root, nanErrorState);
    const nanTokens = Array.from(panel.querySelectorAll<HTMLElement>(".v2-ratios-display"))
      .map((display) => display.getAttribute("data-ratios-token"));
    assert.deepEqual(nanTokens, ["Error", "Error"], "NaN errors render Error on the visible real row when imaginary row is hidden");
    assert.equal(panel.classList.contains("v2-ratios-panel--error"), true, "NaN Error rendering enables ratios error class");
    const nanDomainIndicator = panel.querySelector<HTMLElement>(".v2-ratios-domain-indicator");
    assert.equal(nanDomainIndicator?.textContent, "\u2205", "domain indicator shows null-set symbol when ratios value is NaN");
    assert.equal(
      nanDomainIndicator?.classList.contains("v2-ratios-domain-indicator--nan"),
      true,
      "domain indicator switches to NaN styling when ratios value is NaN",
    );

    clearRatiosVisualizerPanel(harness.root);
    assert.equal(panel.getAttribute("aria-hidden"), "true", "clear helper hides ratios panel");
    assert.equal((panel.textContent ?? "").trim(), "", "clear helper empties ratios panel content");
    assert.equal(panel.classList.contains("v2-ratios-panel--cycle"), false, "clear helper resets cycle class");
    assert.equal(panel.classList.contains("v2-ratios-panel--error"), false, "clear helper resets error class");
  } finally {
    harness.teardown();
  }
};
