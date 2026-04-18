import assert from "node:assert/strict";
import { toNanCalculatorValue } from "../src/domain/calculatorValue.js";
import { HISTORY_FLAG, initialState } from "../src/domain/state.js";
import type { GameState, RollEntry } from "../src/domain/types.js";
import { renderTotalDisplay } from "../src/ui/modules/calculator/totalDisplay.js";
import { renderNumberLineVisualizerPanel } from "../src/ui/modules/visualizers/numberLineRenderer.js";
import { renderRatiosVisualizerPanel } from "../src/ui/modules/visualizers/ratiosRenderer.js";
import { buildFeedTableViewModelForState } from "../src/ui/shared/readModel.rollFeed.js";
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

const getActiveDigitSegments = (panel: HTMLElement, selector: string): string[][] =>
  Array.from(panel.querySelectorAll<HTMLElement>(`${selector} > .seg-frame .seg-digit--active`))
    .map((digit) =>
      Array.from(digit.querySelectorAll<HTMLElement>(".seg--on"))
        .map((segment) => (segment.className.match(/seg-([a-g])/u)?.[1] ?? ""))
        .filter((name) => name.length > 0),
    );

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

export const runUiVisualizerUxSpecInvariantsTests = (): void => {
  const harness = installDomHarness();
  const previousWindowForDom = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = harness.window as unknown;
  try {
    const totalPanel = harness.root.querySelector<HTMLElement>("[data-v2-total-panel]");
    const ratiosPanel = harness.root.querySelector<HTMLElement>("[data-v2-ratios-panel]");
    const numberLinePanel = harness.root.querySelector<HTMLElement>("[data-v2-number-line-panel]");
    assert.ok(totalPanel, "expected total panel mount");
    assert.ok(ratiosPanel, "expected ratios panel mount");
    assert.ok(numberLinePanel, "expected number-line panel mount");
    if (!totalPanel || !ratiosPanel || !numberLinePanel) {
      return;
    }

    // UX-VIS-06: cycle-start gating parity for total/feed/ratios.
    const cycle = { i: 1, j: 4, transientLength: 1, periodLength: 3 };
    const base = initialState();
    const cycleRows = re(r(1n), r(2n), r(3n), r(5n), r(2n), r(3n), r(5n), r(2n));
    const historyOff = withRoll(base, cycleRows, cycle);
    renderTotalDisplay(totalPanel, historyOff);
    renderRatiosVisualizerPanel(harness.root, historyOff);
    assert.equal(totalPanel.classList.contains("total-display--cycle"), false, "history-off disables total cycle highlight");
    assert.equal(ratiosPanel.classList.contains("v2-ratios-panel--cycle"), false, "history-off disables ratios cycle highlight");
    const feedHistoryOff = buildFeedTableViewModelForState(historyOff);
    assert.equal(feedHistoryOff.rows.some((row) => row.rowKind === "committed" && row.isCycle), false, "history-off disables feed cycle row marking");

    const historyOn = withRoll(
      {
        ...base,
        ui: {
          ...base.ui,
          buttonFlags: { ...base.ui.buttonFlags, [HISTORY_FLAG]: true },
        },
      },
      cycleRows,
      cycle,
    );
    renderTotalDisplay(totalPanel, historyOn);
    renderRatiosVisualizerPanel(harness.root, historyOn);
    assert.equal(totalPanel.classList.contains("total-display--cycle"), true, "history-on enables total cycle highlight after detection");
    assert.equal(ratiosPanel.classList.contains("v2-ratios-panel--cycle"), true, "history-on enables ratios cycle highlight after detection");
    const feedHistoryOn = buildFeedTableViewModelForState(historyOn);
    assert.equal(feedHistoryOn.rows.some((row) => row.rowKind === "committed" && row.isCycle), true, "history-on enables feed cycle row marking");

    // UX-VIS-07: cycle overlays are additive.
    const withNumberLineCycleOverlay = {
      ...historyOn,
      calculator: {
        ...historyOn.calculator,
        operationSlots: [{ operator: "op_add" as const, operand: 1n }],
      },
    };
    renderNumberLineVisualizerPanel(harness.root, withNumberLineCycleOverlay);
    assert.equal(numberLinePanel.querySelectorAll(".v2-number-line-cycle-line").length >= 3, true, "number-line cycle overlay renders");
    assert.ok(numberLinePanel.querySelector(".v2-number-line-vector--history"), "number-line cycle overlay keeps history vector");
    assert.ok(numberLinePanel.querySelector(".v2-number-line-vector--forecast"), "number-line cycle overlay keeps forecast vector");

    // UX-VIS-08 + UX-VIS-09: ratios Error styling + budget scoping.
    const nanErrorState: GameState = {
      ...initialState(),
      unlocks: {
        ...initialState().unlocks,
        maxTotalDigits: 3,
      },
      calculator: {
        ...initialState().calculator,
        total: toNanCalculatorValue(),
        rollEntries: [
          { y: c(0n, 1n) },
          { y: toNanCalculatorValue(), error: { code: "seed_nan", kind: "nan_input" } },
        ],
      },
    };
    renderRatiosVisualizerPanel(harness.root, nanErrorState);
    const nanTokens = Array.from(ratiosPanel.querySelectorAll<HTMLElement>(".v2-ratios-display"))
      .map((display) => display.getAttribute("data-ratios-token"));
    assert.deepEqual(nanTokens, ["Error", "Error", "Error", "Error"], "ratios renders Error token on all four cells for NaN-class errors");
    assert.equal(ratiosPanel.classList.contains("v2-ratios-panel--error"), true, "ratios Error token state enables red error styling class");
    renderTotalDisplay(totalPanel, nanErrorState);
    const totalNanSegments = getActiveDigitSegments(totalPanel, ".total-primary-display");
    assert.deepEqual(
      totalNanSegments.slice(-3),
      [
        ["a", "d", "e", "f", "g"],
        ["e", "g"],
        ["e", "g"],
      ],
      "total NaN tokens follow ratios-style Error prefix semantics under digit budgets",
    );

    const withDigitBudgets = {
      ...initialState(),
      unlocks: {
        ...initialState().unlocks,
        maxTotalDigits: 11,
      },
      lambdaControl: {
        ...initialState().lambdaControl,
        delta_q: 10,
      },
      calculator: {
        ...initialState().calculator,
        rollEntries: [{ y: c(0n, 1n) }],
      },
    };
    renderRatiosVisualizerPanel(harness.root, withDigitBudgets);
    const slotCounts = Array.from(ratiosPanel.querySelectorAll<HTMLElement>(".v2-ratios-display"))
      .map((display) => display.getAttribute("data-ratios-slot-count"));
    assert.deepEqual(slotCounts, ["11", "10", "11", "10"], "ratios slot budgets are scoped as delta for numerators and delta_q for denominators");
  } finally {
    (globalThis as { window?: unknown }).window = previousWindowForDom;
    harness.teardown();
  }
};
