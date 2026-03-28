import assert from "node:assert/strict";
import { materializeCalculatorG, projectCalculatorToLegacy } from "../src/domain/multiCalculator.js";
import { reducer } from "../src/domain/reducer.js";
import { KEY_ID } from "../src/domain/keyPresentation.js";
import { initialState } from "../src/domain/state.js";
import { renderTotalDisplay } from "../src/ui/modules/calculator/totalDisplay.js";
import { renderEigenAllocatorVisualizerPanel } from "../src/ui/modules/visualizers/eigenAllocatorRenderer.js";
import { installDomHarness } from "./helpers/domHarness.js";

type KatexRenderOptions = {
  displayMode?: boolean;
  throwOnError?: boolean;
};

type KatexApi = {
  render: (expression: string, element: HTMLElement, options?: KatexRenderOptions) => void;
};

const readSelectedFooterSymbol = (root: HTMLElement): string | null => {
  const selected = root.querySelector<HTMLElement>(".total-memory-symbol--selected");
  return selected?.textContent ?? null;
};

const readEigenSelectedToken = (root: HTMLElement): "alpha" | "beta" | "gamma" | null => {
  const equation = root.querySelector<HTMLElement>(".v2-eigen-equation");
  const text = equation?.textContent ?? "";
  if (text.includes("[\\alpha]")) {
    return "alpha";
  }
  if (text.includes("[\\beta]")) {
    return "beta";
  }
  if (text.includes("[\\gamma]")) {
    return "gamma";
  }
  return null;
};

export const runUiModuleEigenAllocatorRendererV2Tests = (): void => {
  const harness = installDomHarness();
  const globalScope = globalThis as typeof globalThis & { katex?: KatexApi };
  const previousKatex = globalScope.katex;

  globalScope.katex = {
    render(expression: string, element: HTMLElement): void {
      element.textContent = expression;
    },
  };

  try {
    const totalPanel = harness.root.querySelector<HTMLElement>("[data-v2-total-panel]");
    assert.ok(totalPanel, "expected total panel mount for total/footer render");
    if (!totalPanel) {
      return;
    }

    const base = initialState();
    const withSelectedBeta = {
      ...base,
      ui: {
        ...base.ui,
        selectedControlField: "beta" as const,
        memoryVariable: "α" as const,
      },
    };
    renderTotalDisplay(totalPanel, withSelectedBeta);
    renderEigenAllocatorVisualizerPanel(harness.root, withSelectedBeta);
    assert.equal(readSelectedFooterSymbol(harness.root), "β", "total/footer highlight reflects selected control field");
    assert.equal(readEigenSelectedToken(harness.root), "beta", "eigen allocator highlight reflects selected control field");

    const memoryCycleReady = {
      ...base,
      unlocks: {
        ...base.unlocks,
        memory: {
          ...base.unlocks.memory,
          [KEY_ID.memory_cycle_variable]: true,
        },
      },
      ui: {
        ...base.ui,
        selectedControlField: "alpha" as const,
      },
    };
    const afterMemoryCycle = reducer(memoryCycleReady, { type: "PRESS_KEY", key: KEY_ID.memory_cycle_variable });
    renderTotalDisplay(totalPanel, afterMemoryCycle);
    renderEigenAllocatorVisualizerPanel(harness.root, afterMemoryCycle);
    assert.equal(readSelectedFooterSymbol(harness.root), "β", "footer highlight tracks memory cycle selection updates");
    assert.equal(readEigenSelectedToken(harness.root), "beta", "eigen allocator highlight tracks memory cycle selection updates");

    const dualBase = materializeCalculatorG(initialState());
    const dualMemoryReady = {
      ...dualBase,
      unlocks: {
        ...dualBase.unlocks,
        memory: {
          ...dualBase.unlocks.memory,
          [KEY_ID.memory_cycle_variable]: true,
          [KEY_ID.memory_adjust_plus]: true,
        },
      },
      ui: {
        ...dualBase.ui,
        selectedControlField: "alpha" as const,
      },
      calculators: {
        ...dualBase.calculators,
        g: dualBase.calculators?.g
          ? {
              ...dualBase.calculators.g,
              ui: {
                ...dualBase.calculators.g.ui,
                selectedControlField: "gamma" as const,
              },
            }
          : dualBase.calculators?.g,
      },
    };
    const afterTargetedGCycle = reducer(dualMemoryReady, {
      type: "PRESS_KEY",
      key: KEY_ID.memory_cycle_variable,
      calculatorId: "g",
    });
    const projectedF = projectCalculatorToLegacy(afterTargetedGCycle, "f");
    renderTotalDisplay(totalPanel, projectedF);
    renderEigenAllocatorVisualizerPanel(harness.root, projectedF);
    assert.equal(readSelectedFooterSymbol(harness.root), "α", "targeted g memory cycle keeps f footer highlight stable");
    assert.equal(readEigenSelectedToken(harness.root), "alpha", "targeted g memory cycle keeps f eigen highlight stable");

    const projectedG = projectCalculatorToLegacy(afterTargetedGCycle, "g");
    renderTotalDisplay(totalPanel, projectedG);
    renderEigenAllocatorVisualizerPanel(harness.root, projectedG);
    assert.equal(readSelectedFooterSymbol(harness.root), "γ", "targeted g memory cycle keeps g footer highlight stable");
    assert.equal(readEigenSelectedToken(harness.root), "gamma", "targeted g memory cycle keeps g eigen highlight stable");
  } finally {
    globalScope.katex = previousKatex;
    harness.teardown();
  }
};
