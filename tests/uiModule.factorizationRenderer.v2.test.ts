import assert from "node:assert/strict";
import { installDomHarness } from "./helpers/domHarness.js";
import { toNanCalculatorValue, toRationalCalculatorValue } from "../src/domain/calculatorValue.js";
import { initialState } from "../src/domain/state.js";
import { renderFactorizationVisualizerPanel } from "../src/ui/modules/visualizers/factorizationRenderer.js";
import type { GameState } from "../src/domain/types.js";

const r = (num: bigint, den: bigint = 1n) => toRationalCalculatorValue({ num, den });

export const runUiModuleFactorizationRendererV2Tests = (): void => {
  const harness = installDomHarness();
  try {
    const panel = harness.root.querySelector<HTMLElement>("[data-v2-factorization-panel]");
    assert.ok(panel, "expected factorization visualizer mount");
    if (!panel) {
      return;
    }

    renderFactorizationVisualizerPanel(harness.root, initialState());
    assert.equal(panel.getAttribute("aria-hidden"), "false", "factorization panel renders as visible");
    assert.match(panel.textContent ?? "", /not factorable/i, "empty roll renders placeholder");

    const withIntegerFactorization: GameState = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        rollEntries: [
          {
            y: r(18n),
            factorization: {
              sign: 1,
              numerator: [{ prime: 2n, exponent: 1 }, { prime: 3n, exponent: 2 }],
              denominator: [],
            },
          },
          {
            y: r(200560490130n),
            factorization: {
              sign: 1,
              numerator: [
                { prime: 2n, exponent: 1 },
                { prime: 3n, exponent: 1 },
                { prime: 5n, exponent: 1 },
                { prime: 7n, exponent: 1 },
                { prime: 11n, exponent: 1 },
                { prime: 13n, exponent: 1 },
                { prime: 17n, exponent: 1 },
                { prime: 19n, exponent: 1 },
                { prime: 23n, exponent: 1 },
                { prime: 29n, exponent: 1 },
                { prime: 31n, exponent: 1 },
              ],
              denominator: [],
            },
          },
        ],
      },
    };
    renderFactorizationVisualizerPanel(harness.root, withIntegerFactorization);
    assert.match(panel.textContent ?? "", /2\u00B9 \u00D7 3\u00B9 \u00D7 5\u00B9 \u00D7 7\u00B9 \u00D7 11\u00B9 \u00D7 13\u00B9 \u00D7 17\u00B9 \u00D7 19\u00B9 \u00D7 23\u00B9 \u00D7 29\u00B9 \u00D7 31\u00B9/u, "visualizer renders only most-recent factorization with superscript exponents");
    assert.match(
      panel.textContent ?? "",
      /11\u00B9 \u00D7 13\u00B9 \u00D7 17\u00B9 \u00D7 19\u00B9 \u00D7 23\u00B9 \u00D7 29\u00B9 \u00D7 31\u00B9/u,
      "11-distinct-prime factorization renders fully without truncation in latest-row mode",
    );

    const withRationalAndUnsupported: GameState = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        rollEntries: [
          {
            y: r(-6n, 35n),
            factorization: {
              sign: -1,
              numerator: [{ prime: 2n, exponent: 1 }, { prime: 3n, exponent: 1 }],
              denominator: [{ prime: 5n, exponent: 1 }, { prime: 7n, exponent: 1 }],
            },
          },
          { y: toNanCalculatorValue() },
        ],
      },
    };
    renderFactorizationVisualizerPanel(harness.root, withRationalAndUnsupported);
    assert.match(panel.textContent ?? "", /not factorable/i, "non-factorable latest entry takes precedence over older rows");

    const withRationalLatest: GameState = {
      ...withRationalAndUnsupported,
      calculator: {
        ...withRationalAndUnsupported.calculator,
        rollEntries: withRationalAndUnsupported.calculator.rollEntries.slice(0, 1),
      },
    };
    renderFactorizationVisualizerPanel(harness.root, withRationalLatest);
    assert.match(panel.textContent ?? "", /-\(2\u00B9 \u00D7 3\u00B9\) \/ \(5\u00B9 \u00D7 7\u00B9\)/u, "rational factorization renders numerator/denominator form with superscript exponents");

    const missingPayloadNoDerive: GameState = {
      ...initialState(),
      calculator: {
        ...initialState().calculator,
        rollEntries: [{ y: r(12n) }],
      },
    };
    renderFactorizationVisualizerPanel(harness.root, missingPayloadNoDerive);
    assert.equal(
      panel.textContent?.trim(),
      "not factorable",
      "renderer is read-only over stored payload and does not derive factors at render time",
    );
  } finally {
    harness.teardown();
  }
};
