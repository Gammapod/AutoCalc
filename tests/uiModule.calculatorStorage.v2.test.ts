import assert from "node:assert/strict";
import { resolveCalculatorKeysLocked } from "../src/ui/modules/calculatorStorageCore.js";
import { initialState } from "../src/domain/state.js";
import { materializeCalculator } from "../src/domain/multiCalculator.js";
import { createSandboxState } from "../src/domain/sandboxPreset.js";
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
    const renderCalls: Array<{
      target: string;
      rejectedInputCount: number;
      builderChangedCount: number;
      settingsChangedCount: number;
      rollUpdatedCount: number;
      substepExecutedCount: number;
      unlockCompletedCount: number;
    }> = [];
    setCalculatorRendererForTests((root, _state, _dispatch, options) => {
      const target =
        root instanceof HTMLElement
          ? root.dataset.calcInstanceId ?? root.id ?? "<unknown>"
          : "<unknown>";
      renderCalls.push({
        target,
        rejectedInputCount: options.rejectedInputCount ?? 0,
        builderChangedCount: options.builderChangedCount ?? 0,
        settingsChangedCount: options.settingsChangedCount ?? 0,
        rollUpdatedCount: options.rollUpdatedCount ?? 0,
        substepExecutedCount: options.substepExecutedCount ?? 0,
        unlockCompletedCount: options.unlockCompletedCount ?? 0,
      });
      if (root instanceof HTMLElement) {
        return;
      }
    });

    const base = initialState();
    const withMenu = materializeCalculator(base, "menu");
    const dualState = materializeCalculator(withMenu, "g");
    const activeFState = {
      ...dualState,
      activeCalculatorId: "f" as const,
    };

    renderCalls.length = 0;
    renderCalculatorStorageV2Module(harness.root, activeFState, noopDispatch, {
      inputBlocked: false,
      uiEffects: [],
    });
    assert.equal(renderCalls.length, 1, "multi-instance path renders exactly one calculator module pass");
    assert.deepEqual(renderCalls.map((call) => call.target), ["f"], "multi-instance path renders only active calculator instance");

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
    renderCalls.length = 0;
    renderCalculatorStorageV2Module(harness.root, activeGState, noopDispatch, {
      inputBlocked: false,
      uiEffects: [],
    });
    assert.equal(renderCalls.length, 1, "switching active calculator still renders one calculator module pass");
    assert.deepEqual(renderCalls.map((call) => call.target), ["g"], "render target follows active calculator switch");
    const gSwitchButton = harness.root.querySelector<HTMLButtonElement>("[data-calc-switch='g']");
    const fSwitchButton = harness.root.querySelector<HTMLButtonElement>("[data-calc-switch='f']");
    assert.equal(gSwitchButton?.getAttribute("aria-pressed"), "true", "active switch button reflects switched active calculator");
    assert.equal(fSwitchButton?.getAttribute("aria-pressed"), "false", "inactive switch button is not pressed");

    const activeHPrimeState = {
      ...createSandboxState(),
      activeCalculatorId: "h_prime" as const,
    };
    renderCalls.length = 0;
    renderCalculatorStorageV2Module(harness.root, activeHPrimeState, noopDispatch, {
      inputBlocked: false,
      uiEffects: [],
    });
    assert.deepEqual(renderCalls.map((call) => call.target), ["h_prime"], "sandbox path renders active h_prime instance");
    assert.equal(
      harness.root.querySelector<HTMLButtonElement>("[data-calc-switch='h_prime']")?.hidden,
      false,
      "h_prime switch is visible when included in calculator order",
    );
    assert.equal(
      harness.root.querySelector<HTMLButtonElement>("[data-calc-switch='i_prime']")?.hidden,
      false,
      "i_prime switch is visible when included in calculator order",
    );
    assert.equal(
      harness.root.querySelector<HTMLButtonElement>("[data-calc-switch='h_prime']")?.getAttribute("aria-pressed"),
      "true",
      "h_prime switch reflects active sandbox calculator",
    );

    harness.document.body.setAttribute("data-ui-shell", "desktop");
    renderCalls.length = 0;
    renderCalculatorStorageV2Module(harness.root, activeGState, noopDispatch, {
      inputBlocked: false,
      uiEffects: [],
    });
    assert.deepEqual(
      renderCalls.map((call) => call.target).sort(),
      ["f", "g", "menu"].sort(),
      "desktop instance-track initial pass renders each available calculator instance",
    );
    assert.equal(
      harness.root.querySelector<HTMLElement>("[data-calc-instance-id='f']")?.hidden,
      false,
      "desktop instance-track keeps f visible",
    );
    assert.equal(
      harness.root.querySelector<HTMLElement>("[data-calc-instance-id='g']")?.hidden,
      false,
      "desktop instance-track keeps g visible",
    );
    renderCalls.length = 0;
    renderCalculatorStorageV2Module(harness.root, activeGState, noopDispatch, {
      inputBlocked: false,
      uiEffects: [],
    });
    assert.deepEqual(
      renderCalls.map((call) => call.target),
      ["g"],
      "desktop instance-track reuses unchanged inactive calculator renders",
    );
    assert.equal(
      harness.root.querySelector<HTMLElement>("[data-calc-instance-id='menu']")?.hidden,
      false,
      "desktop instance-track keeps menu visible",
    );
    harness.document.body.setAttribute("data-ui-shell", "mobile");

    const gNode = harness.root.querySelector<HTMLElement>("[data-calc-instance-id='g']");
    gNode?.remove();
    renderCalls.length = 0;
    renderCalculatorStorageV2Module(harness.root, activeGState, noopDispatch, {
      inputBlocked: false,
      uiEffects: [],
    });
    assert.equal(renderCalls.length, 1, "missing active instance falls back to one root calculator render");
    assert.deepEqual(renderCalls.map((call) => call.target), ["app"], "fallback render targets app root when active instance node is missing");

    renderCalls.length = 0;
    renderCalculatorStorageV2Module(harness.root, base, noopDispatch, {
      inputBlocked: false,
      uiEffects: [],
    });
    assert.equal(
      renderCalls.length >= 1,
      true,
      "single-instance path still renders calculator module",
    );
    assert.equal(
      renderCalls.some((call) => call.target === "f"),
      true,
      "single-instance path still includes active f calculator render",
    );

    renderCalls.length = 0;
    renderCalculatorStorageV2Module(harness.root, activeGState, noopDispatch, {
      inputBlocked: false,
      uiEffects: [
        { type: "input_feedback", calculatorId: "g", outcome: "accepted", source: "domain_dispatch" },
        { type: "input_feedback", calculatorId: "g", outcome: "rejected", source: "domain_dispatch", reasonCode: "no_effect" },
      ],
    });
    const gRenderCall = renderCalls.find((call) => call.target === "g" || call.target === "app");
    assert.ok(gRenderCall, "active g calculator render (or root fallback) exists for mixed input feedback");
    assert.equal(gRenderCall?.rejectedInputCount, 1, "mixed feedback batch uses latest outcome only (rejected on)");

    renderCalls.length = 0;
    renderCalculatorStorageV2Module(harness.root, activeGState, noopDispatch, {
      inputBlocked: false,
      uiEffects: [
        { type: "input_feedback", calculatorId: "g", outcome: "accepted", source: "domain_dispatch", trigger: "system_action" },
      ],
    });
    const gSystemOnlyCall = renderCalls.find((call) => call.target === "g" || call.target === "app");
    assert.ok(gSystemOnlyCall, "active g calculator render (or root fallback) exists for system-only feedback");
    assert.equal(gSystemOnlyCall?.rejectedInputCount, 0, "system-action feedback does not trigger red led pulse");

    renderCalls.length = 0;
    renderCalculatorStorageV2Module(harness.root, activeGState, noopDispatch, {
      inputBlocked: false,
      uiEffects: [
        { type: "builder_changed", calculatorId: "g" },
        { type: "settings_changed", calculatorId: "g" },
        { type: "roll_updated", calculatorId: "g" },
        { type: "substep_executed", calculatorId: "g" },
        { type: "substep_executed", calculatorId: "g" },
        {
          type: "unlock_completed",
          unlockId: "unlock_digit_1_portable_on_total_equals_9",
          description: "Make 1 portable when total equals 9.",
          effectType: "unlock_digit",
          targetLabel: "1",
          key: "digit_1",
        },
      ],
    });
    const gExpandedCall = renderCalls.find((call) => call.target === "g" || call.target === "app");
    assert.ok(gExpandedCall, "active g calculator render (or root fallback) exists for expanded feedback pathways");
    assert.equal(gExpandedCall?.builderChangedCount, 1, "builder-changed effects map to blue count");
    assert.equal(gExpandedCall?.settingsChangedCount, 1, "settings-changed effects map to orange count");
    assert.equal(gExpandedCall?.rollUpdatedCount, 1, "roll-updated effects map to green count");
    assert.equal(gExpandedCall?.substepExecutedCount, 2, "substep-executed effects preserve multiplicity");
    assert.equal(gExpandedCall?.unlockCompletedCount, 1, "portable digit_1 unlock-completed effect maps to purple count on active calculator");
  } finally {
    resetCalculatorRendererForTests();
    harness.teardown();
  }
};

