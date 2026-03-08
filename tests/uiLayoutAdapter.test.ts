import assert from "node:assert/strict";
import { reducer } from "../src/domain/reducer.js";
import { initialState } from "../src/domain/state.js";
import { renderCalculatorV2Module as renderModule } from "../src/ui/modules/calculator/render.js";
import {
  applyDesktopLayoutSnapshot,
  buildSingleInstanceLayoutInput,
  clearDesktopSizingVars,
  resolveSingleInstanceSnapshot,
} from "../src/ui/layout/layoutAdapter.js";
import { installDomHarness } from "./helpers/domHarness.js";

const noopDispatch = () => ({ type: "RESET_RUN" as const });

export const runUiLayoutAdapterTests = (): void => {
  const dimensions: Array<{ columns: number; rows: number }> = [
    { columns: 1, rows: 1 },
    { columns: 4, rows: 2 },
    { columns: 5, rows: 3 },
  ];
  for (const dimension of dimensions) {
    const harness = installDomHarness("http://localhost:4173/index.html?ui=desktop");
    try {
      harness.document.body.setAttribute("data-ui-shell", "desktop");
      const state = reducer(initialState(), {
        type: "SET_KEYPAD_DIMENSIONS",
        columns: dimension.columns,
        rows: dimension.rows,
      });
      renderModule(harness.root, state, noopDispatch, {
        interactionMode: "calculator",
        inputBlocked: false,
      });
      const keys = harness.root.querySelector<HTMLElement>("[data-keys]");
      const calc = harness.root.querySelector<HTMLElement>(".calc");
      assert.ok(keys && calc, "expected keys/calc elements for module renderer");
      assert.equal(
        keys.style.gridTemplateColumns.length > 0,
        true,
        "grid columns are set by module renderer",
      );
      assert.equal(keys.style.gridTemplateRows.length > 0, true, "grid rows are set by module renderer");
      assert.equal(
        calc.style.getPropertyValue("--desktop-calc-width").endsWith("px"),
        true,
        "desktop calc width var is set by module renderer",
      );
      assert.equal(
        calc.style.getPropertyValue("--desktop-visualizer-width").endsWith("px"),
        true,
        "desktop visualizer width var is set by module renderer",
      );
    } finally {
      harness.teardown();
    }
  }

  const harness = installDomHarness("http://localhost:4173/index.html?ui=desktop");
  try {
    harness.document.body.setAttribute("data-ui-shell", "desktop");
    const state = reducer(initialState(), { type: "SET_KEYPAD_DIMENSIONS", columns: 4, rows: 2 });
    renderModule(harness.root, state, noopDispatch, {
      interactionMode: "calculator",
      inputBlocked: false,
    });
    const keys = harness.root.querySelector<HTMLElement>("[data-keys]");
    const calc = harness.root.querySelector<HTMLElement>(".calc");
    assert.ok(keys && calc, "expected keys/calc for adapter surface tests");
    const snapshot = resolveSingleInstanceSnapshot({
      root: harness.root,
      keysEl: keys,
      calcBodyEl: calc,
      columns: 4,
      rows: 2,
      interactionMode: "calculator",
      inputBlocked: false,
    });

    applyDesktopLayoutSnapshot(keys, calc, snapshot);
    assert.equal(
      calc.style.getPropertyValue("--desktop-calc-width").endsWith("px"),
      true,
      "desktop sizing vars are applied",
    );

    clearDesktopSizingVars(keys, calc);
    assert.equal(calc.style.getPropertyValue("--desktop-calc-width"), "", "desktop sizing vars can be cleared");

    harness.root.setAttribute("data-visualizer-width-mode", "fixed");
    harness.root.setAttribute("data-visualizer-width-px", "333");
    const fixedInput = buildSingleInstanceLayoutInput({
      root: harness.root,
      keysEl: keys,
      calcBodyEl: calc,
      columns: 4,
      rows: 2,
      interactionMode: "calculator",
      inputBlocked: false,
    });
    assert.equal(
      fixedInput.calculatorInstances[0]?.visualizerWidthMode,
      "fixed",
      "layout adapter reads fixed visualizer mode from dataset",
    );
    assert.equal(
      fixedInput.calculatorInstances[0]?.visualizerWidthPx,
      333,
      "layout adapter reads fixed visualizer width from dataset",
    );
  } finally {
    harness.teardown();
  }
};
