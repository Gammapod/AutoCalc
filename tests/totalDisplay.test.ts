import assert from "node:assert/strict";
import { buildClearedTotalSlotModel, buildTotalSlotModel, isClearedCalculatorState } from "../src/ui/modules/calculator/viewModel.js";
import { HISTORY_FLAG, initialState } from "../src/domain/state.js";
import type { GameState, RollEntry } from "../src/domain/types.js";
import {
  toExplicitComplexCalculatorValue,
  toExpressionCalculatorValue,
  toExpressionScalarValue,
  toRationalScalarValue,
} from "../src/domain/calculatorValue.js";
import { symbolicExpr } from "../src/domain/expression.js";
import { renderTotalDisplay } from "../src/ui/modules/calculator/totalDisplay.js";
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
  Array.from(panel.querySelectorAll<HTMLElement>(`${selector} .seg-digit--active`))
    .map((digit) =>
      Array.from(digit.querySelectorAll<HTMLElement>(".seg--on"))
        .map((segment) => (segment.className.match(/seg-([a-g])/u)?.[1] ?? ""))
        .filter((name) => name.length > 0),
    );

const getPrimaryActiveDigitSegments = (panel: HTMLElement): string[][] =>
  Array.from(panel.querySelectorAll<HTMLElement>(".total-primary-display > .seg-frame .seg-digit--active"))
    .map((digit) =>
      Array.from(digit.querySelectorAll<HTMLElement>(".seg--on"))
        .map((segment) => (segment.className.match(/seg-([a-g])/u)?.[1] ?? ""))
        .filter((name) => name.length > 0),
    );

const getImaginaryActiveDigitSegments = (panel: HTMLElement): string[][] =>
  getActiveDigitSegments(panel, ".total-imaginary-display");

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

export const runTotalDisplayTests = (): void => {
  const baseline = buildTotalSlotModel(r(0n), 2);
  assert.equal(baseline.length, 12, "display always renders 12 fixed-width slots");
  assert.equal(
    baseline.filter((slot) => slot.state === "locked").length,
    10,
    "2 unlocked digits leaves 10 locked slots",
  );
  assert.equal(
    baseline.filter((slot) => slot.state === "active").length,
    1,
    "zero renders one active digit on the right",
  );
  assert.deepEqual(
    baseline.at(-1)?.activeSegments,
    ["a", "b", "c", "d", "e", "f"],
    "rightmost active digit renders 0 segments",
  );

  const twoDigitTotal = buildTotalSlotModel(r(42n), 2);
  assert.equal(
    twoDigitTotal.filter((slot) => slot.state === "active").length,
    2,
    "two-digit total fills both unlocked slots",
  );
  assert.deepEqual(twoDigitTotal.at(-2)?.activeSegments, ["b", "c", "f", "g"], "left active digit renders 4 segments");
  assert.deepEqual(
    twoDigitTotal.at(-1)?.activeSegments,
    ["a", "b", "d", "e", "g"],
    "right active digit renders 2 segments",
  );

  const clamped = buildTotalSlotModel(r(1234n), 20);
  assert.equal(
    clamped.filter((slot) => slot.state === "locked").length,
    0,
    "unlocked digit count is clamped to max 12",
  );

  const negativeSingleDigit = buildTotalSlotModel(r(-1n), 2);
  assert.equal(
    negativeSingleDigit.filter((slot) => slot.state === "active").length,
    1,
    "negative totals render digit slots from magnitude only",
  );
  assert.deepEqual(
    negativeSingleDigit.at(-1)?.activeSegments,
    ["b", "c"],
    "negative -1 keeps 1 segments in the rightmost digit slot",
  );

  const cleared = initialState().calculator;
  assert.equal(isClearedCalculatorState(cleared), true, "initial/reset calculator state is treated as cleared");

  const calculatedZero = {
    ...cleared,
    rollEntries: re(r(0n)),
  };
  assert.equal(isClearedCalculatorState(calculatedZero), false, "calculated zero is not treated as cleared");

  const typedNonZero = {
    ...cleared,
    total: r(5n),
  };
  assert.equal(isClearedCalculatorState(typedNonZero), false, "non-zero totals are not treated as cleared");

  const clearedSlots = buildClearedTotalSlotModel(2);
  assert.equal(
    clearedSlots.filter((slot) => slot.state === "locked").length,
    10,
    "cleared model preserves locked vs unlocked digit structure",
  );
  assert.equal(
    clearedSlots.filter((slot) => slot.state === "active").length,
    1,
    "cleared model lights exactly one slot for underscore",
  );
  assert.deepEqual(
    clearedSlots.at(-1)?.activeSegments,
    ["d"],
    "cleared model renders underscore with the bottom segment",
  );

  const harness = installDomHarness();
  try {
    const totalPanel = harness.root.querySelector<HTMLElement>("[data-v2-total-panel]");
    assert.ok(totalPanel, "expected total panel mount");
    if (!totalPanel) {
      return;
    }

    const cycle = { i: 1, j: 4, transientLength: 1, periodLength: 3 };
    const base = initialState();

    const historyOffCycleMatch = withRoll(base, re(r(1n), r(2n), r(3n), r(5n), r(2n), r(3n), r(5n), r(2n)), cycle);
    renderTotalDisplay(totalPanel, historyOffCycleMatch);
    assert.equal(
      totalPanel.classList.contains("total-display--cycle"),
      false,
      "cycle color remains off when history toggle is off",
    );

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
    renderTotalDisplay(totalPanel, historyOnBeforeDetection);
    assert.equal(
      totalPanel.classList.contains("total-display--cycle"),
      false,
      "cycle color stays off before cycle detection index is reached",
    );

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
    renderTotalDisplay(totalPanel, historyOnCycleMatch);
    assert.equal(
      totalPanel.classList.contains("total-display--cycle"),
      true,
      "cycle color enables when latest value matches cycle-start after detection",
    );

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
    renderTotalDisplay(totalPanel, historyOnCycleNoMatch);
    assert.equal(
      totalPanel.classList.contains("total-display--cycle"),
      false,
      "cycle color stays off when latest value is not cycle-start value",
    );

    const historyOnCycleWithError = withRoll(
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
      [
        { y: r(1n) },
        { y: r(2n) },
        { y: r(3n) },
        { y: r(5n) },
        { y: r(2n) },
        { y: r(3n) },
        { y: r(5n) },
        { y: r(2n), error: { code: "overflow", kind: "overflow" } },
      ],
      cycle,
    );
    renderTotalDisplay(totalPanel, historyOnCycleWithError);
    assert.equal(totalPanel.classList.contains("total-display--error"), true, "error class remains active on latest error");
    assert.equal(totalPanel.classList.contains("total-display--cycle"), false, "error precedence disables cycle color");

    const imaginaryCycleState = {
      ...historyOnCycleMatch,
      calculator: {
        ...historyOnCycleMatch.calculator,
        total: {
          kind: "complex" as const,
          value: {
            re: { kind: "rational" as const, value: { num: 2n, den: 1n } },
            im: { kind: "rational" as const, value: { num: 1n, den: 1n } },
          },
        },
      },
    };
    renderTotalDisplay(totalPanel, imaginaryCycleState);
    assert.equal(totalPanel.classList.contains("total-display--cycle"), true, "cycle color remains active when cycle condition is met");
    assert.equal(
      totalPanel.classList.contains("total-display--imaginary"),
      false,
      "cycle color takes precedence over imaginary color when both apply",
    );

    const imaginaryNoCycleState = {
      ...historyOnCycleNoMatch,
      calculator: {
        ...historyOnCycleNoMatch.calculator,
        total: {
          kind: "complex" as const,
          value: {
            re: { kind: "rational" as const, value: { num: 3n, den: 1n } },
            im: { kind: "rational" as const, value: { num: 1n, den: 1n } },
          },
        },
      },
    };
    renderTotalDisplay(totalPanel, imaginaryNoCycleState);
    assert.equal(
      totalPanel.classList.contains("total-display--imaginary"),
      true,
      "imaginary color applies when no error/cycle color is active",
    );

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
    renderTotalDisplay(totalPanel, complexCycleRows);
    assert.equal(
      totalPanel.classList.contains("total-display--cycle"),
      true,
      "complex cycle-start matches activate cycle color under history gating",
    );

    const firstTwoNotAmber = withRoll(
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
      re(r(1n), r(2n)),
      cycle,
    );
    renderTotalDisplay(totalPanel, firstTwoNotAmber);
    assert.equal(
      totalPanel.classList.contains("total-display--cycle"),
      false,
      "regression: first appearance of cycle-start value is not amber before detection",
    );

    renderTotalDisplay(totalPanel, historyOnCycleMatch);
    assert.equal(
      totalPanel.classList.contains("total-display--cycle"),
      true,
      "regression: repeated cycle-start value is amber after detection",
    );

    const realIrrationalState: GameState = {
      ...base,
      calculator: {
        ...base.calculator,
        total: toExpressionCalculatorValue(symbolicExpr("sqrt(2)")),
      },
    };
    renderTotalDisplay(totalPanel, realIrrationalState);
    const realIrrationalSegments = getPrimaryActiveDigitSegments(totalPanel);
    assert.deepEqual(
      realIrrationalSegments.slice(-3),
      [
        ["e", "g"],
        ["a", "b", "c", "e", "f", "g"],
        ["b", "c", "d", "e", "g"],
      ],
      "real irrational totals render rAd token in the seven-segment display",
    );

    const complexAnyState: GameState = {
      ...base,
      calculator: {
        ...base.calculator,
        total: toExplicitComplexCalculatorValue(
          toExpressionScalarValue(symbolicExpr("sqrt(2)")),
          toRationalScalarValue({ num: 3n, den: 1n }),
        ),
      },
    };
    renderTotalDisplay(totalPanel, complexAnyState);
    const complexRealSegments = getPrimaryActiveDigitSegments(totalPanel);
    const complexImaginarySegments = getImaginaryActiveDigitSegments(totalPanel);
    const complexImaginaryDisplay = totalPanel.querySelector<HTMLElement>(".total-imaginary-display");
    assert.deepEqual(
      complexRealSegments.slice(-3),
      [
        ["e", "g"],
        ["a", "b", "c", "e", "f", "g"],
        ["b", "c", "d", "e", "g"],
      ],
      "complex irrational real parts render rAd token on the main row",
    );
    assert.deepEqual(
      complexImaginarySegments.at(-1),
      ["a", "b", "c"],
      "complex integer imaginary parts render numerically on the imaginary row",
    );
    assert.equal(complexImaginaryDisplay?.getAttribute("aria-hidden"), "false", "non-zero imaginary complex totals show imaginary row");

    const complexRealEquivalentState: GameState = {
      ...base,
      calculator: {
        ...base.calculator,
        total: toExplicitComplexCalculatorValue(
          toRationalScalarValue({ num: 7n, den: 1n }),
          toRationalScalarValue({ num: 0n, den: 1n }),
        ),
      },
    };
    renderTotalDisplay(totalPanel, complexRealEquivalentState);
    const hiddenImaginaryDisplay = totalPanel.querySelector<HTMLElement>(".total-imaginary-display");
    assert.equal(hiddenImaginaryDisplay?.getAttribute("aria-hidden"), "true", "real-equivalent complex totals hide imaginary row");

    const complexFractionalImaginaryState: GameState = {
      ...base,
      unlocks: {
        ...base.unlocks,
        maxTotalDigits: 4,
      },
      calculator: {
        ...base.calculator,
        total: toExplicitComplexCalculatorValue(
          toRationalScalarValue({ num: 5n, den: 1n }),
          toRationalScalarValue({ num: 1n, den: 2n }),
        ),
      },
    };
    renderTotalDisplay(totalPanel, complexFractionalImaginaryState);
    const fractionalImaginarySegments = getImaginaryActiveDigitSegments(totalPanel);
    assert.deepEqual(
      fractionalImaginarySegments.slice(-4),
      [
        ["e", "g"],
        ["e", "g"],
        ["a", "b", "c", "e", "f", "g"],
        ["a", "d", "e", "f"],
      ],
      "fractional imaginary components render FrAC token on the imaginary row",
    );

    const withNaNState: GameState = {
      ...base,
      unlocks: {
        ...base.unlocks,
        maxTotalDigits: 3,
      },
      calculator: {
        ...base.calculator,
        total: { kind: "nan" },
        rollEntries: [{ y: { kind: "nan" }, error: { code: "n/0", kind: "division_by_zero" } }],
      },
    };
    renderTotalDisplay(totalPanel, withNaNState);
    const nanSegments = getPrimaryActiveDigitSegments(totalPanel);
    assert.deepEqual(
      nanSegments.slice(-3),
      [
        ["a", "d", "e", "f", "g"],
        ["e", "g"],
        ["e", "g"],
      ],
      "NaN totals render left-prefixed Err token when digit budget is 3",
    );

    const withRadicalOneDigitState: GameState = {
      ...base,
      unlocks: {
        ...base.unlocks,
        maxTotalDigits: 1,
      },
      calculator: {
        ...base.calculator,
        total: toExpressionCalculatorValue(symbolicExpr("sqrt(3)")),
      },
    };
    renderTotalDisplay(totalPanel, withRadicalOneDigitState);
    const oneDigitRadicalSegments = getPrimaryActiveDigitSegments(totalPanel);
    assert.deepEqual(
      oneDigitRadicalSegments.slice(-1),
      [["e", "g"]],
      "irrational totals render left-prefixed r token when digit budget is 1",
    );

    const withErrorOneDigitState: GameState = {
      ...base,
      unlocks: {
        ...base.unlocks,
        maxTotalDigits: 1,
      },
      calculator: {
        ...base.calculator,
        total: { kind: "nan" },
        rollEntries: [{ y: { kind: "nan" }, error: { code: "seed_nan", kind: "nan_input" } }],
      },
    };
    renderTotalDisplay(totalPanel, withErrorOneDigitState);
    const oneDigitErrorSegments = getPrimaryActiveDigitSegments(totalPanel);
    assert.deepEqual(
      oneDigitErrorSegments.slice(-1),
      [["a", "d", "e", "f", "g"]],
      "NaN totals render left-prefixed E token when digit budget is 1",
    );

    const complexImaginaryIrrationalState: GameState = {
      ...base,
      unlocks: {
        ...base.unlocks,
        maxTotalDigits: 3,
      },
      calculator: {
        ...base.calculator,
        total: toExplicitComplexCalculatorValue(
          toRationalScalarValue({ num: 2n, den: 1n }),
          toExpressionScalarValue(symbolicExpr("sqrt(5)")),
        ),
      },
    };
    renderTotalDisplay(totalPanel, complexImaginaryIrrationalState);
    const irrationalImaginarySegments = getImaginaryActiveDigitSegments(totalPanel);
    assert.deepEqual(
      irrationalImaginarySegments.slice(-3),
      [
        ["e", "g"],
        ["a", "b", "c", "e", "f", "g"],
        ["b", "c", "d", "e", "g"],
      ],
      "irrational imaginary components render left-prefixed rAd token",
    );

    const rationalExprState: GameState = {
      ...base,
      calculator: {
        ...base.calculator,
        total: toExpressionCalculatorValue({ type: "rational_literal", value: { num: 6n, den: 3n } }),
      },
    };
    renderTotalDisplay(totalPanel, rationalExprState);
    const rationalExprSegments = getPrimaryActiveDigitSegments(totalPanel);
    assert.deepEqual(
      rationalExprSegments.at(-1),
      ["a", "b", "d", "e", "g"],
      "rational-equivalent expression totals render numerically and clear rAd token",
    );
  } finally {
    harness.teardown();
  }
};

