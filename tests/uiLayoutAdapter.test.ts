import assert from "node:assert/strict";
import { reducer } from "../src/domain/reducer.js";
import { initialState } from "../src/domain/state.js";
import { render as renderLegacy } from "../src/ui/render.js";
import { render as renderModule } from "../src/ui/modules/calculatorModuleRenderer.js";
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
    let expectedColumns = "";
    let expectedRows = "";
    let expectedCalcWidth = "";
    let expectedVisualizerWidth = "";
    try {
      harness.document.body.setAttribute("data-ui-shell", "desktop");
      const state = reducer(initialState(), {
        type: "SET_KEYPAD_DIMENSIONS",
        columns: dimension.columns,
        rows: dimension.rows,
      });

      renderLegacy(harness.root, state, noopDispatch, {
        interactionMode: "calculator",
        inputBlocked: false,
        skipChecklist: true,
        skipGraph: true,
      });

      const keysA = harness.root.querySelector<HTMLElement>("[data-keys]");
      const calcA = harness.root.querySelector<HTMLElement>(".calc");
      assert.ok(keysA && calcA, "expected keys/calc elements");
      expectedColumns = keysA.style.gridTemplateColumns;
      expectedRows = keysA.style.gridTemplateRows;
      expectedCalcWidth = calcA.style.getPropertyValue("--desktop-calc-width");
      expectedVisualizerWidth = calcA.style.getPropertyValue("--desktop-visualizer-width");
    } finally {
      harness.teardown();
    }

    const harnessB = installDomHarness("http://localhost:4173/index.html?ui=desktop");
    try {
      harnessB.document.body.setAttribute("data-ui-shell", "desktop");
      const state = reducer(initialState(), {
        type: "SET_KEYPAD_DIMENSIONS",
        columns: dimension.columns,
        rows: dimension.rows,
      });
      renderModule(harnessB.root, state, noopDispatch, {
        interactionMode: "calculator",
        inputBlocked: false,
        skipChecklist: true,
        skipGraph: true,
      });
      const keysB = harnessB.root.querySelector<HTMLElement>("[data-keys]");
      const calcB = harnessB.root.querySelector<HTMLElement>(".calc");
      assert.ok(keysB && calcB, "expected keys/calc elements for module renderer");
      assert.equal(expectedColumns, keysB.style.gridTemplateColumns, "grid columns parity across renderers");
      assert.equal(expectedRows, keysB.style.gridTemplateRows, "grid rows parity across renderers");
      assert.equal(expectedCalcWidth, calcB.style.getPropertyValue("--desktop-calc-width"), "desktop calc width var parity across renderers");
      assert.equal(
        expectedVisualizerWidth,
        calcB.style.getPropertyValue("--desktop-visualizer-width"),
        "desktop visualizer width var parity across renderers",
      );
    } finally {
      harnessB.teardown();
    }
  }

  const harness = installDomHarness("http://localhost:4173/index.html?ui=desktop");
  try {
    harness.document.body.setAttribute("data-ui-shell", "desktop");
    const state = reducer(initialState(), { type: "SET_KEYPAD_DIMENSIONS", columns: 4, rows: 2 });
    renderModule(harness.root, state, noopDispatch, {
      interactionMode: "calculator",
      inputBlocked: false,
      skipChecklist: true,
      skipGraph: true,
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
