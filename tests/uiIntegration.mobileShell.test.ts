import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { initialState } from "../src/domain/state.js";
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
  const harness = installDomHarness("http://localhost:4173/index.html?ui=mobile");
  const dispatched: Action[] = [];
  const dispatch = (action: Action): Action => {
    dispatched.push(action);
    return action;
  };
  const getDigitOnSegments = (digit: HTMLElement): string[] =>
    Array.from(digit.querySelectorAll<HTMLElement>(".seg--on"))
      .map((segment) =>
        Array.from(segment.classList).find((className) => className.startsWith("seg-") && className !== "seg" && className !== "seg--on"))
      .filter((name): name is string => Boolean(name))
      .map((name) => name.replace("seg-", ""))
      .sort();

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
      bottomPanelId: "checklist",
      includeTransition: false,
    });
    const allocatorPanel = shellRoot?.querySelector<HTMLElement>("[data-v2-drawer-panel='checklist']");
    assert.equal(
      allocatorPanel?.getAttribute("aria-hidden"),
      "false",
      "forceActiveView can orchestrate bottom checklist panel",
    );

    renderer.render(withStorage, dispatch, {
            inputBlocked: false,
    });
    const host = harness.root.querySelector<HTMLElement>("[data-v2-visualizer-host]");
    const withGraph = withCalculatorProjection(withStorage, "f", (projected) => ({
      ...projected,
      ui: {
        ...projected.ui,
        activeVisualizer: "graph",
      },
    }));
    const withFeed = withCalculatorProjection(withStorage, "f", (projected) => ({
      ...projected,
      ui: {
        ...projected.ui,
        activeVisualizer: "feed",
      },
    }));
    const withTotal = withCalculatorProjection(withStorage, "f", (projected) => ({
      ...projected,
      ui: {
        ...projected.ui,
        activeVisualizer: "total",
      },
    }));
    renderer.render(withGraph, dispatch, {
            inputBlocked: false,
    });
    const memoryRowOutsideTotal = harness.root.querySelector<HTMLElement>("[data-v2-total-panel] .total-memory-row");
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
          { y: r(10n), remainder: { num: 1n, den: 2n } },
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
      "  X  |     Y      |   r    ",
      "feed panel header uses fixed ascii column widths for maxTotalDigits=9",
    );
    assert.equal(
      (feedPanel?.querySelector<HTMLElement>(".v2-feed-table-line")?.textContent?.split("|").length ?? 0) >= 3,
      true,
      "feed panel renders an r column when a visible row has remainder",
    );
    const rSegment = feedPanel?.querySelector<HTMLElement>(".v2-feed-table-line .v2-feed-r-col");
    assert.equal(Boolean(rSegment), true, "feed panel renders r segment span when r column is visible");
    assert.equal(rSegment?.textContent?.startsWith("|"), true, "r segment includes the yellow separator bar");
    const firstNineLines = Array.from(feedPanel?.querySelectorAll<HTMLElement>(".v2-feed-table-line") ?? []).slice(0, 9);
    const firstPipeColumns = firstNineLines.map((line) => (line.textContent ?? "").indexOf("|"));
    const secondPipeColumns = firstNineLines.map((line) => (line.textContent ?? "").indexOf("|", firstPipeColumns[0]! + 1));
    assert.equal(firstPipeColumns.every((index) => index === firstPipeColumns[0]), true, "first feed separator stays vertically aligned");
    assert.equal(secondPipeColumns.every((index) => index === secondPipeColumns[0]), true, "r separator stays vertically aligned");
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
    const withFeedNoVisibleRemainder = withCalculatorProjection(withFeed, "f", (projected) => ({
      ...projected,
      calculator: {
        ...projected.calculator,
        rollEntries: [
          { y: r(1n) },
          { y: r(2n), remainder: { num: 1n, den: 2n } },
          { y: r(3n) },
          { y: r(4n) },
          { y: r(5n) },
          { y: r(6n) },
          { y: r(7n) },
          { y: r(8n) },
          { y: r(9n) },
        ],
      },
    }));
    renderer.render(withFeedNoVisibleRemainder, dispatch, {
            inputBlocked: false,
    });
    const feedHeaderWithoutRemainder = feedPanel?.querySelector<HTMLElement>(".v2-feed-table-line");
    assert.equal(
      feedHeaderWithoutRemainder?.textContent?.split("|").length ?? 0,
      2,
      "feed panel hides r column when no visible row includes remainder",
    );
    assert.equal(
      feedPanel?.querySelector(".v2-feed-r-col") ?? null,
      null,
      "feed panel removes the r segment span when r column is hidden",
    );
    renderer.render(withGraph, dispatch, {
            inputBlocked: false,
    });
    renderer.render(withTotal, dispatch, {
            inputBlocked: false,
    });
    assert.equal(
      host?.dataset.v2VisualizerTransition,
      "exit",
      "rapid visualizer sequence ends with exit transition into total",
    );
    assert.equal(
      host?.getAttribute("data-v2-visualizer-height-lock"),
      null,
      "rapid visualizer sequence does not leave swap height lock behind",
    );

    const totalPanel = harness.root.querySelector<HTMLElement>("[data-v2-total-panel]");
    assert.ok(totalPanel, "total panel is mounted");
    const hiddenDomainOnCleared = totalPanel?.querySelector<HTMLElement>(".total-domain-indicator");
    assert.equal(
      hiddenDomainOnCleared?.getAttribute("aria-hidden"),
      "true",
      "domain indicator is hidden when total display is the cleared placeholder",
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
    const remainderDisplayWithError = totalPanel?.querySelector<HTMLElement>(".total-remainder-display");
    assert.equal(
      totalPanel?.classList.contains("total-display--error"),
      true,
      "total panel enters error color mode when latest roll entry has an error",
    );
    assert.equal(domainIndicatorWithError?.textContent, "ℕ", "domain indicator renders latest y domain symbol");
    assert.equal(
      domainIndicatorWithError?.classList.contains("total-domain-indicator--nan"),
      false,
      "domain indicator keeps default (green) styling for non-NaN totals",
    );
    assert.equal(
      remainderDisplayWithError?.getAttribute("aria-hidden"),
      "true",
      "remainder display is hidden when latest roll entry has no remainder",
    );

    const withRemainderTotal = withCalculatorProjection({
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
        rollEntries: [
          ...projected.calculator.rollEntries,
          { y: r(1n, 2n), remainder: { num: 1n, den: 3n } },
        ],
      },
    }));
    renderer.render(withRemainderTotal, dispatch, {
            inputBlocked: false,
    });
    const domainIndicatorWithRemainder = totalPanel?.querySelector<HTMLElement>(".total-domain-indicator");
    const remainderDisplayWithRemainder = totalPanel?.querySelector<HTMLElement>(".total-remainder-display");
    assert.equal(
      totalPanel?.classList.contains("total-display--error"),
      false,
      "total panel clears error color mode when latest roll entry is not an error",
    );
    assert.equal(domainIndicatorWithRemainder?.textContent, "ℚ", "domain indicator updates for fractional y values");
    assert.equal(
      remainderDisplayWithRemainder?.getAttribute("aria-hidden"),
      "false",
      "remainder display is visible when latest roll entry includes remainder",
    );
    const remainderDigitsWithFraction = Array.from(
      remainderDisplayWithRemainder?.querySelectorAll<HTMLElement>(".seg-digit") ?? [],
    );
    assert.equal(
      remainderDisplayWithRemainder?.querySelector<HTMLElement>(".seg-fraction") ?? null,
      null,
      "remainder uses seven-segment rendering, not text fallback",
    );
    assert.equal(
      remainderDigitsWithFraction.length,
      6,
      "fraction remainder renders r=FrAC across six seven-segment slots",
    );
    assert.deepEqual(getDigitOnSegments(remainderDigitsWithFraction[0]!), ["e", "g"], "remainder prefix r uses segment glyph");
    assert.deepEqual(getDigitOnSegments(remainderDigitsWithFraction[1]!), ["d", "g"], "remainder prefix = uses segment glyph");
    assert.deepEqual(getDigitOnSegments(remainderDigitsWithFraction[2]!), ["a", "e", "f", "g"], "remainder token F uses segment glyph");
    assert.deepEqual(getDigitOnSegments(remainderDigitsWithFraction[3]!), ["e", "g"], "remainder token r uses segment glyph");
    assert.deepEqual(getDigitOnSegments(remainderDigitsWithFraction[4]!), ["a", "b", "c", "e", "f", "g"], "remainder token A uses segment glyph");
    assert.deepEqual(getDigitOnSegments(remainderDigitsWithFraction[5]!), ["a", "d", "e", "f"], "remainder token C uses segment glyph");
    assert.equal(
      remainderDisplayWithRemainder?.textContent?.includes("1/3"),
      false,
      "fraction remainder shows FrAC token instead of numeric fraction text",
    );

    const withLongIntegerRemainder = withCalculatorProjection(withRemainderTotal, "f", (projected) => ({
      ...projected,
      calculator: {
        ...projected.calculator,
        rollEntries: [
          ...projected.calculator.rollEntries,
          { y: r(123456789n), remainder: { num: 123456789n, den: 1n } },
        ],
      },
    }));
    renderer.render(withLongIntegerRemainder, dispatch, {
            inputBlocked: false,
    });
    const remainderDisplayWithLongInteger = totalPanel?.querySelector<HTMLElement>(".total-remainder-display");
    const remainderDigitsWithLongInteger = Array.from(
      remainderDisplayWithLongInteger?.querySelectorAll<HTMLElement>(".seg-digit") ?? [],
    );
    assert.equal(
      remainderDigitsWithLongInteger.length,
      "r=123456789".length,
      "integer remainder can exceed maxTotalDigits and still renders full seven-segment message",
    );
    const fractionTextToken = totalPanel?.querySelector<HTMLElement>(".total-primary-display .seg-fraction");
    assert.equal(fractionTextToken ?? null, null, "fraction total token is rendered via seven-segment slots");
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
    assert.deepEqual(getDigitOnSegments(fractionDigits[8]!), ["a", "e", "f", "g"], "F token maps to segment glyph");
    assert.deepEqual(getDigitOnSegments(fractionDigits[9]!), ["e", "g"], "r token maps to segment glyph");
    assert.deepEqual(getDigitOnSegments(fractionDigits[10]!), ["a", "b", "c", "e", "f", "g"], "A token maps to segment glyph");
    assert.deepEqual(getDigitOnSegments(fractionDigits[11]!), ["a", "d", "e", "f"], "C token maps to segment glyph");

    const withNanTotal = withCalculatorProjection(withRemainderTotal, "f", (projected) => ({
      ...projected,
      calculator: {
        ...projected.calculator,
        total: { kind: "nan" },
        rollEntries: [...projected.calculator.rollEntries, { y: { kind: "nan" } }],
      },
    }));
    renderer.render(withNanTotal, dispatch, {
            inputBlocked: false,
    });
    const nanTextToken = totalPanel?.querySelector<HTMLElement>(".total-primary-display .seg-fraction");
    assert.equal(nanTextToken ?? null, null, "NaN token is rendered via seven-segment slots");
    const nanDigits = Array.from(totalPanel?.querySelectorAll<HTMLElement>(".total-primary-display .seg-digit") ?? []);
    assert.equal(
      nanDigits.slice(8, 9).every((digit) => digit.classList.contains("seg-digit--unlocked")),
      true,
      "NaN token preserves right-aligned unlocked padding",
    );
    assert.deepEqual(getDigitOnSegments(nanDigits[9]!), ["a", "d", "e", "f", "g"], "E token maps to segment glyph");
    assert.deepEqual(getDigitOnSegments(nanDigits[10]!), ["e", "g"], "r token maps to segment glyph");
    assert.deepEqual(getDigitOnSegments(nanDigits[11]!), ["e", "g"], "r token maps to segment glyph");
    const domainIndicatorWithNan = totalPanel?.querySelector<HTMLElement>(".total-domain-indicator");
    assert.equal(domainIndicatorWithNan?.textContent, "∅", "domain indicator shows null-set symbol when total is NaN");
    assert.equal(
      domainIndicatorWithNan?.classList.contains("total-domain-indicator--nan"),
      true,
      "domain indicator switches to NaN (red) styling when total is NaN",
    );

    const keyButton = harness.root.querySelector<HTMLButtonElement>(`.key[data-key='${k("exec_equals")}']`);
    assert.ok(keyButton, "calculator key exists after mobile render");
    click(keyButton as HTMLButtonElement);
    assert.equal(
      dispatched.some((action) => action.type === "PRESS_KEY" && action.key === k("exec_equals")),
      true,
      "clicking a rendered key dispatches PRESS_KEY action",
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

    const steppedThenEquals = reducer(steppedOnce, { type: "PRESS_KEY", key: k("exec_equals") });
    assert.deepEqual(
      steppedThenEquals.calculator.total,
      r(9n),
      "mixed step-through then equals continues remaining slots from partial cursor",
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






