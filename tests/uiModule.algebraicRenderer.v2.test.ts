import "./support/keyCompat.runtime.js";
import assert from "node:assert/strict";
import { installDomHarness } from "./helpers/domHarness.js";
import { initialState } from "../src/domain/state.js";
import { renderAlgebraicVisualizerPanel } from "../src/ui/modules/visualizers/algebraicRenderer.js";
import { toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import type { GameState } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });

export const runUiModuleAlgebraicRendererV2Tests = (): void => {
  const harness = installDomHarness();
  try {
    const panel = harness.root.querySelector<HTMLElement>("[data-v2-algebraic-panel]");
    assert.ok(panel, "expected algebraic visualizer mount");
    if (!panel) {
      return;
    }

    renderAlgebraicVisualizerPanel(harness.root, initialState());
    assert.equal(panel.getAttribute("aria-hidden"), "false", "algebraic panel renders as visible");
    const initialBuilderRow = panel.querySelector<HTMLElement>(".v2-algebraic-builder-row");
    assert.ok(initialBuilderRow, "builder row renders");
    assert.ok(initialBuilderRow?.querySelector(".v2-algebraic-builder-function"), "builder row includes left function segment");
    assert.ok(initialBuilderRow?.querySelector(".v2-algebraic-builder-seed"), "builder row includes right seed segment");
    assert.match(panel.textContent ?? "", /(?:\u{1D453}\u2080\(\u{1D465}\)|f_0)\s*=\s*_/u, "seedless state shows f0 seed placeholder");
    assert.match(
      panel.textContent ?? "",
      /(?:\u{1D453}\u2099\u208A\u2081\(\u{1D465}\)|f_\{n\+1\})\s*=\s*(?:\u{1D453}\u2099\(\u{1D465}\)|f_n)/u,
      "empty builder shows identity recurrence in plain or math-rendered form",
    );

    const stateWithCommittedBuilder: GameState = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: r(5n),
        operationSlots: [
          { operator: op("+"), operand: 1n },
          { operator: op("*"), operand: 3n },
        ],
      },
    };
    renderAlgebraicVisualizerPanel(harness.root, stateWithCommittedBuilder);
    const committedText = panel.textContent ?? "";
    assert.match(committedText, /(?:\u{1D453}\u2080\(\u{1D465}\)|f_0)\s*=\s*5/u, "pre-roll seed line uses current seed value");
    assert.match(
      committedText,
      /\((?:\u{1D453}\u2099\(\u{1D465}\)|f_n)\s*\+\s*1\)\s*(?:�|×|\*)\s*3/u,
      "recurrence builds from committed slots",
    );

    const stateWithPartialDraft: GameState = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        draftingSlot: { operator: op("+"), operandInput: "", isNegative: false },
      },
    };
    renderAlgebraicVisualizerPanel(harness.root, stateWithPartialDraft);
    assert.match(
      panel.textContent ?? "",
      /\((?:\u{1D453}\u2099\(\u{1D465}\)|f_n)\s*\+\s*_\)/u,
      "drafting operator-only recurrence includes underscore placeholder",
    );

    const stateWithRelevantSimplifiedRoll: GameState = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: r(0n),
        operationSlots: [
          { operator: op("+"), operand: { type: "constant", value: "pi" } },
          { operator: op("-"), operand: { type: "constant", value: "pi" } },
        ],
        rollEntries: [
          {
            y: r(0n),
            symbolic: { exprText: "((f_n+pi)-pi)", truncated: false, renderText: "f_n" },
          },
        ],
      },
    };
    renderAlgebraicVisualizerPanel(harness.root, stateWithRelevantSimplifiedRoll);
    assert.match(panel.textContent ?? "", /f_n(?:\(x\))?/i, "post-roll main area uses simplified text for relevant symbolic payload");

    const stateWithBuilderChangedAfterRoll: GameState = {
      ...stateWithRelevantSimplifiedRoll,
      calculator: {
        ...stateWithRelevantSimplifiedRoll.calculator,
        operationSlots: [{ operator: op("+"), operand: 1n }],
      },
    };
    renderAlgebraicVisualizerPanel(harness.root, stateWithBuilderChangedAfterRoll);
    assert.match(
      panel.textContent ?? "",
      /(?:\u{1D453}\u2099\(\u{1D465}\)|f_n)\s*\+\s*1/u,
      "when builder changes, main line falls back to live builder recurrence",
    );

    const stateWithEuclidLiteral: GameState = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        total: r(12n),
        operationSlots: [{ operator: op("#"), operand: 5n }],
        rollEntries: [
          {
            y: r(2n),
            symbolic: { exprText: "(f_n(x)#5)", truncated: false, renderText: "2" },
          },
        ],
      },
    };
    renderAlgebraicVisualizerPanel(harness.root, stateWithEuclidLiteral);
    assert.match(panel.textContent ?? "", /\u2AFD\s*5/i, "euclidean literal operator stays literal in algebra view");
  } finally {
    harness.teardown();
  }
};


