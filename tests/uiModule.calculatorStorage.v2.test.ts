import assert from "node:assert/strict";
import { resolveCalculatorKeysLocked } from "../src/ui/modules/calculatorStorageCore.js";
import { initialState } from "../src/domain/state.js";
import { materializeCalculator } from "../src/domain/multiCalculator.js";
import type { Action } from "../src/domain/types.js";
import {
  renderCalculatorStorageV2Module,
  resetCalculatorRendererForTests,
  setCalculatorRendererForTests,
} from "../src/ui/modules/calculatorStorageRenderer.js";
import { installDomHarness } from "./helpers/domHarness.js";

const noopDispatch = (action: Action): Action => action;

export const runUiModuleCalculatorStorageV2Tests = (): void => {
  assert.equal(
    resolveCalculatorKeysLocked(false),
    false,
    "desktop keeps keypad buttons interactive",
  );
  assert.equal(
    resolveCalculatorKeysLocked(false),
    false,
    "mobile keeps keypad buttons interactive",
  );
  assert.equal(
    resolveCalculatorKeysLocked(false),
    false,
    "calculator mode keeps keypad buttons available",
  );
  assert.equal(
    resolveCalculatorKeysLocked(true),
    true,
    "input blocking overrides shell-specific keypad behavior",
  );

  const harness = installDomHarness("http://localhost:4173/index.html");
  try {
    const renderTargets: string[] = [];
    setCalculatorRendererForTests((root) => {
      if (root instanceof HTMLElement) {
        renderTargets.push(root.dataset.calcInstanceId ?? root.id ?? "<unknown>");
      } else {
        renderTargets.push("<unknown>");
      }
    });

    const base = initialState();
    const withMenu = materializeCalculator(base, "menu");
    const dualState = materializeCalculator(withMenu, "g");
    const activeFState = {
      ...dualState,
      activeCalculatorId: "f" as const,
    };

    renderTargets.length = 0;
    renderCalculatorStorageV2Module(harness.root, activeFState, noopDispatch, {
      inputBlocked: false,
      uiEffects: [],
    });
    assert.equal(renderTargets.length, 1, "multi-instance path renders exactly one calculator module pass");
    assert.deepEqual(renderTargets, ["f"], "multi-instance path renders only active calculator instance");

    const instanceF = harness.root.querySelector<HTMLElement>("[data-calc-instance-id='f']");
    const instanceG = harness.root.querySelector<HTMLElement>("[data-calc-instance-id='g']");
    const instanceMenu = harness.root.querySelector<HTMLElement>("[data-calc-instance-id='menu']");
    assert.equal(instanceF?.hidden, false, "active calculator instance remains visible");
    assert.equal(instanceG?.hidden, true, "inactive g calculator instance remains hidden");
    assert.equal(instanceMenu?.hidden, true, "inactive menu calculator instance remains hidden");

    const activeGState = {
      ...dualState,
      activeCalculatorId: "g" as const,
    };
    renderTargets.length = 0;
    renderCalculatorStorageV2Module(harness.root, activeGState, noopDispatch, {
      inputBlocked: false,
      uiEffects: [],
    });
    assert.equal(renderTargets.length, 1, "switching active calculator still renders one calculator module pass");
    assert.deepEqual(renderTargets, ["g"], "render target follows active calculator switch");
    const gSwitchButton = harness.root.querySelector<HTMLButtonElement>("[data-calc-switch='g']");
    const fSwitchButton = harness.root.querySelector<HTMLButtonElement>("[data-calc-switch='f']");
    assert.equal(gSwitchButton?.getAttribute("aria-pressed"), "true", "active switch button reflects switched active calculator");
    assert.equal(fSwitchButton?.getAttribute("aria-pressed"), "false", "inactive switch button is not pressed");

    const gNode = harness.root.querySelector<HTMLElement>("[data-calc-instance-id='g']");
    gNode?.remove();
    renderTargets.length = 0;
    renderCalculatorStorageV2Module(harness.root, activeGState, noopDispatch, {
      inputBlocked: false,
      uiEffects: [],
    });
    assert.equal(renderTargets.length, 1, "missing active instance falls back to one root calculator render");
    assert.deepEqual(renderTargets, ["app"], "fallback render targets app root when active instance node is missing");

    renderTargets.length = 0;
    renderCalculatorStorageV2Module(harness.root, base, noopDispatch, {
      inputBlocked: false,
      uiEffects: [],
    });
    assert.equal(
      renderTargets.length >= 1,
      true,
      "single-instance path still renders calculator module",
    );
    assert.equal(
      renderTargets.includes("f"),
      true,
      "single-instance path still includes active f calculator render",
    );
  } finally {
    resetCalculatorRendererForTests();
    harness.teardown();
  }
};

