import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { EXECUTION_PAUSE_EQUALS_FLAG, HISTORY_FLAG, initialState } from "../src/domain/state.js";
import { calculatorValuesEquivalent, toRationalCalculatorValue, toRationalScalarValue } from "../src/domain/calculatorValue.js";
import type { Action, GameState, RollEntry } from "../src/domain/types.js";
import { reducer } from "../src/domain/reducer.js";
import { createShellRenderer } from "../src/ui/renderAdapter.js";
import { click } from "./helpers/eventHarness.js";
import { installDomHarness } from "./helpers/domHarness.js";
import { withCalculatorProjection } from "./helpers/dualCalculatorState.js";

export const runUiIntegrationMobileShellTests = (): void => {
  const r = (num: bigint, den: bigint = 1n): RollEntry["y"] => ({
    kind: "rational",
    value: { num, den },
  });
  const c = (reNum: bigint, imNum: bigint): RollEntry["y"] => ({
    kind: "complex",
    value: {
      re: toRationalScalarValue({ num: reNum, den: 1n }),
      im: toRationalScalarValue({ num: imNum, den: 1n }),
    },
  });
  const rv = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });
  const harness = installDomHarness("http://localhost:4173/index.html?ui=mobile");
  const dispatched: Action[] = [];
  const dispatch = (action: Action): Action => {
    dispatched.push(action);
    return action;
  };

  const withStorage: GameState = {
    ...initialState(),
    unlocks: {
      ...initialState().unlocks,
      uiUnlocks: {
        ...initialState().unlocks.uiUnlocks,
        storageVisible: true,
      },
    },
  };

  try {
    const renderer = createShellRenderer(harness.root, { mode: "mobile" });
    renderer.render(withStorage, dispatch, {
            inputBlocked: false,
    });

    const shellRoot = harness.root.querySelector<HTMLElement>("[data-v2-shell-root='true']");
    assert.ok(shellRoot, "mobile shell mounts v2 shell root");
    const menu = shellRoot?.querySelector<HTMLElement>("[data-v2-menu='true']");
    assert.equal(menu?.getAttribute("aria-hidden"), "true", "mobile menu is hidden by default");

    renderer.forceActiveView({
      snapId: "bottom",
      bottomPanelId: "storage",
      includeTransition: false,
    });
    const storagePanel = shellRoot?.querySelector<HTMLElement>("[data-v2-drawer-panel='storage']");
    assert.equal(
      storagePanel?.getAttribute("aria-hidden"),
      "false",
      "forceActiveView can orchestrate bottom storage panel",
    );

    renderer.render(withStorage, dispatch, {
            inputBlocked: false,
    });
    const host = harness.root.querySelector<HTMLElement>("[data-v2-visualizer-host]");
    const withGraph = withCalculatorProjection(withStorage, "f", (projected) => ({
      ...projected,
      settings: {
        ...projected.settings,
        visualizer: "graph",
      },
    }));
    const withFeed = withCalculatorProjection(withStorage, "f", (projected) => ({
      ...projected,
      settings: {
        ...projected.settings,
        visualizer: "feed",
      },
    }));
    const withTotal = withCalculatorProjection(withStorage, "f", (projected) => ({
      ...projected,
      settings: {
        ...projected.settings,
        visualizer: "total",
      },
    }));
    renderer.render(withGraph, dispatch, {
            inputBlocked: false,
    });
    const memoryRowOutsideTotal = harness.root.querySelector<HTMLElement>("[data-v2-total-footer] .total-memory-row");
    assert.ok(memoryRowOutsideTotal, "memory row remains mounted while a non-total visualizer is active");
    assert.equal(
      memoryRowOutsideTotal?.textContent?.includes("\u03BB ="),
      true,
      "memory/lambda row remains visible regardless of active visualizer",
    );
    renderer.render(withFeed, dispatch, {
            inputBlocked: false,
    });
    const feedPanel = harness.root.querySelector<HTMLElement>("[data-v2-feed-panel]");
    assert.ok(feedPanel, "feed panel is mounted");
    const withFeedTable = withCalculatorProjection({
      ...withFeed,
      unlocks: {
        ...withFeed.unlocks,
        maxTotalDigits: 9,
      },
    }, "f", (projected) => ({
      ...projected,
      calculator: {
        ...projected.calculator,
        rollEntries: [
          { y: r(9n) },
          { y: c(10n, 2n) },
          { y: r(11n), error: { code: "n/0", kind: "division_by_zero" } },
        ],
      },
    }));
    renderer.render(withFeedTable, dispatch, {
            inputBlocked: false,
    });
    assert.equal(
      feedPanel?.textContent?.includes("  X  |"),
      true,
      "feed panel renders ascii table header",
    );
    const headerLine = feedPanel?.querySelector<HTMLElement>(".v2-feed-table-line");
    assert.equal(
      headerLine?.textContent ?? "",
      "  X  |     Y      |     Z      ",
      "feed panel header uses fixed ascii column widths for maxTotalDigits=9",
    );
    assert.equal(
      (feedPanel?.querySelector<HTMLElement>(".v2-feed-table-line")?.textContent?.split("|").length ?? 0) >= 3,
      true,
      "feed panel renders a Z column when any row has an imaginary result",
    );
    const zSegment = feedPanel?.querySelector<HTMLElement>(".v2-feed-table-line .v2-feed-z-col");
    assert.equal(Boolean(zSegment), true, "feed panel renders Z segment span when Z column is visible");
    assert.equal(zSegment?.textContent?.startsWith("|"), true, "Z segment includes the separator bar");
    const firstNineLines = Array.from(feedPanel?.querySelectorAll<HTMLElement>(".v2-feed-table-line") ?? []).slice(0, 9);
    const firstPipeColumns = firstNineLines.map((line) => (line.textContent ?? "").indexOf("|"));
    const secondPipeColumns = firstNineLines.map((line) => (line.textContent ?? "").indexOf("|", firstPipeColumns[0]! + 1));
    assert.equal(firstPipeColumns.every((index) => index === firstPipeColumns[0]), true, "first feed separator stays vertically aligned");
    assert.equal(secondPipeColumns.every((index) => index === secondPipeColumns[0]), true, "Z separator stays vertically aligned");
    assert.equal(
      feedPanel?.querySelectorAll(".v2-feed-row--error").length,
      1,
      "feed panel marks error rows in red",
    );
    const dividerLine = feedPanel?.querySelectorAll<HTMLElement>(".v2-feed-table-line")[1];
    assert.equal(
      /-{20,}/.test(dividerLine?.textContent ?? ""),
      false,
      "feed divider line does not emit oversized y-column padding dashes",
    );
    const withFeedNoImaginary = withCalculatorProjection(withFeed, "f", (projected) => ({
      ...projected,
      calculator: {
        ...projected.calculator,
        rollEntries: [
          { y: r(1n) },
          { y: r(2n) },
          { y: r(3n) },
          { y: r(4n) },
          { y: r(5n) },
          { y: r(6n) },
          { y: r(7n) },
          { y: r(8n) },
          { y: r(9n) },
          { y: r(10n) },
          { y: r(11n) },
          { y: r(12n) },
          { y: r(13n) },
          { y: r(14n) },
        ],
      },
    }));
    renderer.render(withFeedNoImaginary, dispatch, {
            inputBlocked: false,
    });
    const feedHeaderWithoutImaginary = feedPanel?.querySelector<HTMLElement>(".v2-feed-table-line");
    assert.equal(
      feedHeaderWithoutImaginary?.textContent?.split("|").length ?? 0,
      2,
      "feed panel hides Z column when no roll row includes an imaginary result",
    );
    assert.equal(
      feedPanel?.querySelector(".v2-feed-z-col") ?? null,
      null,
      "feed panel removes the Z segment span when Z column is hidden",
    );
    const withFeedCycleAndForecast = withCalculatorProjection(withFeed, "f", (projected) => ({
      ...projected,
      settings: {
        ...projected.settings,
        stepExpansion: "on",
      },
      ui: {
        ...projected.ui,
        buttonFlags: {
          ...projected.ui.buttonFlags,
          [HISTORY_FLAG]: true,
        },
      },
      calculator: {
        ...projected.calculator,
        total: r(5n),
        operationSlots: [{ operator: op("op_add"), operand: 1n }],
        rollEntries: [
          { y: r(1n) },
          { y: r(2n) },
          { y: r(3n) },
          { y: r(5n) },
          { y: r(2n) },
          { y: r(3n) },
          { y: r(5n) },
          { y: r(2n) },
        ],
        rollAnalysis: {
          stopReason: "cycle",
          cycle: { i: 1, j: 4, transientLength: 1, periodLength: 3 },
        },
      },
    }));
    renderer.render(withFeedCycleAndForecast, dispatch, {
            inputBlocked: false,
    });
    assert.equal(
      feedPanel?.querySelectorAll(".v2-feed-row--cycle").length,
      1,
      "feed panel marks qualifying committed cycle-start rows in amber",
    );
    assert.equal(
      feedPanel?.querySelectorAll(".v2-feed-row--forecast").length,
      2,
      "feed panel appends forecast projection rows with forecast styling",
    );
    const feedLinesWithForecast = Array.from(feedPanel?.querySelectorAll<HTMLElement>(".v2-feed-table-line") ?? []);
    const forecastLineText = feedLinesWithForecast.slice(-2).map((line) => line.textContent ?? "").join("\n");
    assert.equal(
      forecastLineText.includes("~8") && forecastLineText.includes("~9"),
      true,
      "feed forecast rows render absolute projection index prefixes",
    );
    const withFeedCycleHintNearMiss = withCalculatorProjection(withFeedCycleAndForecast, "f", (projected) => ({
      ...projected,
      calculator: {
        ...projected.calculator,
        rollAnalysis: {
          stopReason: "cycle",
          cycle: { i: 1, j: 4, transientLength: 1, periodLength: 2 },
        },
      },
    }));
    renderer.render(withFeedCycleHintNearMiss, dispatch, {
            inputBlocked: false,
    });
    assert.equal(
      feedPanel?.querySelectorAll(".v2-feed-row--hint-cycle-length").length >= 1,
      true,
      "feed cycle-length hint marks active cycle span rows when unresolved period predicate is close",
    );
    renderer.render(withGraph, dispatch, {
            inputBlocked: false,
    });
    renderer.render(withTotal, dispatch, {
            inputBlocked: false,
    });

    const totalPanel = harness.root.querySelector<HTMLElement>("[data-v2-total-panel]");
    assert.ok(totalPanel, "total panel is mounted");
    const hiddenDomainOnCleared = totalPanel?.querySelector<HTMLElement>(".total-domain-indicator");
    const hiddenBinOnDecimal = totalPanel?.querySelector<HTMLElement>(".total-base-indicator");
    const hintRows = Array.from(totalPanel?.querySelectorAll<HTMLElement>(".total-hint-row") ?? []);
    assert.equal(
      hiddenDomainOnCleared?.getAttribute("aria-hidden"),
      "true",
      "domain indicator is hidden when total display is the cleared placeholder",
    );
    assert.equal(
      hiddenBinOnDecimal?.getAttribute("aria-hidden"),
      "true",
      "binary badge is hidden in decimal mode",
    );
    assert.equal(hintRows.length, 4, "default total visualizer renders four closest-progress hint rows");
    assert.equal(
      hintRows.every((row) => (row.textContent ?? "").includes("/")),
      true,
      "closest-progress hint rows show numeric progress fractions",
    );
    const withThresholdHint = withCalculatorProjection(withTotal, "f", (projected) => ({
      ...projected,
      calculator: {
        ...projected.calculator,
        total: r(8n),
      },
    }));
    renderer.render(withThresholdHint, dispatch, {
            inputBlocked: false,
    });
    const thresholdHintRow = totalPanel?.querySelector<HTMLElement>(".total-threshold-marker-hint");
    assert.equal(
      Boolean(thresholdHintRow && (Number(thresholdHintRow.style.opacity || "0") > 0)),
      true,
      "total threshold-marker hint renders with non-zero opacity when total is near unresolved threshold unlock",
    );

    const withBinaryBadge = withCalculatorProjection(withTotal, "f", (projected) => ({
      ...projected,
      calculator: {
        ...projected.calculator,
        total: r(5n),
      },
      settings: {
        ...projected.settings,
        base: "base2",
      },
    }));
    renderer.render(withBinaryBadge, dispatch, {
            inputBlocked: false,
    });
    const binaryBadge = totalPanel?.querySelector<HTMLElement>(".total-base-indicator");
    assert.equal(binaryBadge?.getAttribute("aria-hidden"), "false", "binary badge is visible in binary mode");
    assert.equal(binaryBadge?.textContent, "| BIN |", "binary badge renders framed token");

    const withComplexRealLine = withCalculatorProjection(withTotal, "f", (projected) => ({
      ...projected,
      calculator: {
        ...projected.calculator,
        total: c(7n, 0n),
      },
    }));
    renderer.render(withComplexRealLine, dispatch, {
            inputBlocked: false,
    });
    assert.equal(totalPanel?.getAttribute("aria-label"), "Total 7", "zero-imaginary complex totals render as real-line display label");
    assert.equal(
      totalPanel?.classList.contains("total-display--imaginary"),
      false,
      "zero-imaginary complex totals do not trigger imaginary color mode",
    );

    const withComplexImaginary = withCalculatorProjection(withTotal, "f", (projected) => ({
      ...projected,
      calculator: {
        ...projected.calculator,
        total: c(0n, 3n),
      },
    }));
    renderer.render(withComplexImaginary, dispatch, {
            inputBlocked: false,
    });
    const hiddenImaginaryDisplayWithoutImagHistory = totalPanel?.querySelector<HTMLElement>(".total-imaginary-display");
    assert.equal(totalPanel?.getAttribute("aria-label"), "Total complex", "non-zero imaginary totals keep complex display label");
    assert.equal(
      totalPanel?.classList.contains("total-display--imaginary"),
      true,
      "total panel enters imaginary color mode when total has non-zero imaginary component",
    );
    assert.equal(
      hiddenImaginaryDisplayWithoutImagHistory?.getAttribute("aria-hidden"),
      "true",
      "imaginary row stays hidden until roll history includes an imaginary value",
    );

    const withErrorTotal = withCalculatorProjection(withTotal, "f", (projected) => ({
      ...projected,
      calculator: {
        ...projected.calculator,
        total: r(11n),
        rollEntries: [
          { y: r(5n) },
          { y: r(11n), error: { code: "n/0", kind: "division_by_zero" } },
        ],
      },
    }));
    renderer.render(withErrorTotal, dispatch, {
            inputBlocked: false,
    });
    const domainIndicatorWithError = totalPanel?.querySelector<HTMLElement>(".total-domain-indicator");
    const imaginaryDisplayWithError = totalPanel?.querySelector<HTMLElement>(".total-imaginary-display");
    assert.equal(
      totalPanel?.classList.contains("total-display--error"),
      true,
      "total panel enters error color mode when latest roll entry has an error",
    );
    assert.equal(
      totalPanel?.classList.contains("total-display--imaginary"),
      false,
      "total panel clears imaginary color mode when total no longer has non-zero imaginary component",
    );
    assert.equal(domainIndicatorWithError?.textContent, "\u2119", "domain indicator renders latest y domain symbol");
    assert.equal(
      domainIndicatorWithError?.classList.contains("total-domain-indicator--nan"),
      false,
      "domain indicator keeps default (green) styling for non-NaN totals",
    );
    assert.equal(
      imaginaryDisplayWithError?.getAttribute("aria-hidden"),
      "true",
      "imaginary row stays hidden when the total is purely real",
    );

    const withFractionalTotal = withCalculatorProjection({
      ...withErrorTotal,
      unlocks: {
        ...withErrorTotal.unlocks,
        maxTotalDigits: 4,
      },
    }, "f", (projected) => ({
      ...projected,
      calculator: {
        ...projected.calculator,
        total: r(1n, 2n),
        rollEntries: [...projected.calculator.rollEntries, { y: r(1n, 2n) }],
      },
    }));
    renderer.render(withFractionalTotal, dispatch, {
            inputBlocked: false,
    });
    const domainIndicatorWithFraction = totalPanel?.querySelector<HTMLElement>(".total-domain-indicator");
    const imaginaryDisplayWithFraction = totalPanel?.querySelector<HTMLElement>(".total-imaginary-display");
    assert.equal(
      totalPanel?.classList.contains("total-display--error"),
      false,
      "total panel clears error color mode when latest roll entry is not an error",
    );
    assert.equal(domainIndicatorWithFraction?.textContent, "\u211A", "domain indicator updates for fractional y values");
    assert.equal(
      imaginaryDisplayWithFraction?.getAttribute("aria-hidden"),
      "true",
      "imaginary row remains hidden for fractional real totals",
    );
    const fractionDigits = Array.from(totalPanel?.querySelectorAll<HTMLElement>(".total-primary-display .seg-digit") ?? []);
    assert.equal(fractionDigits.length, 12, "total display keeps fixed 12-slot frame");
    assert.equal(
      fractionDigits.slice(0, 8).every((digit) => digit.classList.contains("seg-digit--locked")),
      true,
      "fraction token keeps locked leading slots",
    );
    assert.equal(
      fractionDigits.slice(8).every((digit) => digit.classList.contains("seg-digit--active")),
      true,
      "fraction token right-aligns across unlocked slots",
    );

    const withComplexImaginaryFraction = withCalculatorProjection(withFractionalTotal, "f", (projected) => ({
      ...projected,
      calculator: {
        ...projected.calculator,
        total: c(5n, 1n),
        rollEntries: [...projected.calculator.rollEntries, { y: c(5n, 1n) }],
      },
    }));
    renderer.render(withComplexImaginaryFraction, dispatch, {
            inputBlocked: false,
    });
    const imaginaryDisplayWithComplex = totalPanel?.querySelector<HTMLElement>(".total-imaginary-display");
    assert.equal(
      imaginaryDisplayWithComplex?.getAttribute("aria-hidden"),
      "false",
      "imaginary row is visible for non-zero imaginary totals",
    );
    assert.equal(
      totalPanel?.classList.contains("total-display--imaginary"),
      true,
      "imaginary mode class is active when total has a non-zero imaginary component",
    );
    assert.equal(
      Array.from(imaginaryDisplayWithComplex?.querySelectorAll<HTMLElement>(".seg-digit") ?? []).length,
      12,
      "imaginary row uses the same 12-slot seven-segment frame",
    );
    const withNanTotal = withCalculatorProjection(withFractionalTotal, "f", (projected) => ({
      ...projected,
      calculator: {
        ...projected.calculator,
        total: { kind: "nan" },
        rollEntries: [...projected.calculator.rollEntries, { y: { kind: "nan" }, error: { code: "seed_nan", kind: "nan_input" } }],
      },
    }));
    renderer.render(withNanTotal, dispatch, {
            inputBlocked: false,
    });
    const nanDigits = Array.from(totalPanel?.querySelectorAll<HTMLElement>(".total-primary-display .seg-digit") ?? []);
    assert.equal(
      nanDigits.slice(8).every((digit) => digit.classList.contains("seg-digit--active")),
      true,
      "NaN token renders a left-prefixed Error token across unlocked digits",
    );
    assert.equal(
      totalPanel?.classList.contains("total-display--error"),
      true,
      "NaN totals use the error-mode visual precedence",
    );
    const domainIndicatorWithNan = totalPanel?.querySelector<HTMLElement>(".total-domain-indicator");
    assert.equal(domainIndicatorWithNan?.textContent, "\u2205", "domain indicator shows null-set symbol when total is NaN");
    assert.equal(
      domainIndicatorWithNan?.classList.contains("total-domain-indicator--nan"),
      true,
      "domain indicator switches to NaN (red) styling when total is NaN",
    );

    const keyButton = harness.root.querySelector<HTMLButtonElement>(`.key[data-key='${k("exec_equals")}']`);
    assert.ok(keyButton, "calculator key exists after mobile render");
    click(keyButton as HTMLButtonElement);
    assert.equal(
      dispatched.some((action) => action.type === "TOGGLE_FLAG" && action.flag === EXECUTION_PAUSE_EQUALS_FLAG),
      true,
      "clicking a rendered key dispatches equals toggle action",
    );

    const withStepKey = withCalculatorProjection({
      ...withStorage,
      unlocks: {
        ...withStorage.unlocks,
        maxSlots: 2,
      },
    }, "f", (projected) => ({
      ...projected,
      ui: {
        ...projected.ui,
        keyLayout: [{ kind: "key", key: k("exec_step_through") }, { kind: "key", key: k("exec_equals") }],
        keypadColumns: 2,
        keypadRows: 1,
      },
      calculator: {
        ...projected.calculator,
        total: r(1n),
        operationSlots: [{ operator: op("op_add"), operand: 2n }, { operator: op("op_mul"), operand: 3n }],
      },
    }));
    renderer.render(withStepKey, dispatch, {
            inputBlocked: false,
    });
    const stepTokenBefore = harness.root.querySelector<HTMLElement>("[data-slot] .slot-display__token--step-target");
    assert.ok(stepTokenBefore, "slot token is highlighted when step key is present on keypad");
    assert.equal(stepTokenBefore?.textContent?.includes("[ + 2 ]"), true, "inactive step target highlights first slot token");

    const steppedOnce = reducer(withStepKey, { type: "PRESS_KEY", key: k("exec_step_through") });
    renderer.render(steppedOnce, dispatch, {
            inputBlocked: false,
    });
    const stepTokenAfterOne = harness.root.querySelector<HTMLElement>("[data-slot] .slot-display__token--step-target");
    assert.ok(stepTokenAfterOne, "slot token remains highlighted after first step-through");
    assert.equal(stepTokenAfterOne?.textContent?.includes("[ \u00D7 3 ]"), true, "step target highlight moves to next slot token after one step");

    const withEqualsAutoOn = reducer(steppedOnce, { type: "TOGGLE_FLAG", flag: EXECUTION_PAUSE_EQUALS_FLAG });
    const afterAutoTick = reducer(withEqualsAutoOn, { type: "AUTO_STEP_TICK" });
    const steppedThenEquals = reducer(afterAutoTick, { type: "AUTO_STEP_TICK" });
    assert.equal(
      calculatorValuesEquivalent(steppedThenEquals.calculator.total, rv(9n)),
      true,
      "mixed step-through then equals-toggle auto-step continues remaining slots from partial cursor",
    );

    const withoutStepKey = withCalculatorProjection(steppedOnce, "f", (projected) => ({
      ...projected,
      ui: {
        ...projected.ui,
        keyLayout: [{ kind: "key", key: k("exec_equals") }],
      },
    }));
    renderer.render(withoutStepKey, dispatch, {
            inputBlocked: false,
    });
    assert.equal(
      harness.root.querySelector("[data-slot] .slot-display__token--step-target"),
      null,
      "slot token highlight is hidden when step key is absent from keypad",
    );

    renderer.dispose();
  } finally {
    harness.teardown();
  }
};







