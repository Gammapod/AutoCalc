import type { Action, CalculatorId, GameState, UiEffect } from "../../domain/types.js";
import { renderCalculatorV2Module } from "./calculator/render.js";
import { renderStorageV2Module } from "./storage/render.js";
import { renderInputV2Module } from "./input/render.js";
import { projectCalculatorToLegacy, resolveActiveCalculatorId } from "../../domain/multiCalculator.js";

type CalculatorRenderer = typeof renderCalculatorV2Module;

let calculatorRenderer: CalculatorRenderer = renderCalculatorV2Module;

export const setCalculatorRendererForTests = (renderer: CalculatorRenderer): void => {
  calculatorRenderer = renderer;
};

export const resetCalculatorRendererForTests = (): void => {
  calculatorRenderer = renderCalculatorV2Module;
};

export const renderCalculatorStorageV2Module = (
  root: Element,
  state: GameState,
  dispatch: (action: Action) => unknown,
  options: {
    inputBlocked: boolean;
    uiEffects: UiEffect[];
  },
): void => {
  const executionRejectCountFor = (calculatorId: CalculatorId): number =>
    options.uiEffects.filter((effect) => effect.type === "execution_gate_rejected" && effect.calculatorId === calculatorId).length;
  const latestInputOutcomeByCalculator = options.uiEffects.reduce<Partial<Record<CalculatorId, "accepted" | "rejected">>>(
    (acc, effect) => {
      if (effect.type === "input_feedback" && effect.trigger !== "system_action") {
        acc[effect.calculatorId] = effect.outcome;
      }
      return acc;
    },
    {},
  );
  const inputFeedbackPulseFor = (calculatorId: CalculatorId): { acceptedInputCount: number; rejectedInputCount: number } => {
    const outcome = latestInputOutcomeByCalculator[calculatorId];
    return {
      acceptedInputCount: outcome === "accepted" ? 1 : 0,
      rejectedInputCount: outcome === "rejected" ? 1 : 0,
    };
  };
  const calculatorDevice = root.querySelector<HTMLElement>("[data-calc-device]");
  const switchRow = calculatorDevice?.querySelector<HTMLElement>("[data-calc-switch-row]");
  const calculatorOrder = state.calculatorOrder ?? ["f"];
  const hasMultiple = calculatorOrder.length > 1;
  const hasInstanceNodes = Boolean(calculatorDevice?.querySelector("[data-calc-instance-id]"));
  const uiShellMode = calculatorDevice?.ownerDocument?.body?.dataset.uiShell;
  const useDesktopInstanceTrack = uiShellMode === "desktop";
  if (hasMultiple && calculatorDevice && hasInstanceNodes) {
    if (switchRow) {
      switchRow.hidden = useDesktopInstanceTrack;
    }
    const activeCalculatorId = resolveActiveCalculatorId(state);
    calculatorDevice.dataset.activeCalculatorId = activeCalculatorId;
    if (!useDesktopInstanceTrack) {
      const switchButtons = calculatorDevice.querySelectorAll<HTMLButtonElement>("[data-calc-switch]");
      switchButtons.forEach((button) => {
        const target = button.dataset.calcSwitch as CalculatorId | undefined;
        button.setAttribute("aria-pressed", target === activeCalculatorId ? "true" : "false");
        button.hidden = !target || !calculatorOrder.includes(target);
        button.onclick = () => {
          if (!target || !calculatorOrder.includes(target)) {
            return;
          }
          dispatch({ type: "SET_ACTIVE_CALCULATOR", calculatorId: target });
        };
      });
    }

    const instances = calculatorDevice.querySelectorAll<HTMLElement>("[data-calc-instance-id]");
    let activeInstanceRendered = false;
    instances.forEach((instanceEl) => {
      const id = instanceEl.dataset.calcInstanceId as CalculatorId | undefined;
      if (!id || !calculatorOrder.includes(id)) {
        instanceEl.hidden = true;
        return;
      }
      if (useDesktopInstanceTrack) {
        const isActive = id === activeCalculatorId;
        instanceEl.hidden = false;
        instanceEl.dataset.calcActive = isActive ? "true" : "false";
        instanceEl.onclick = () => {
          dispatch({ type: "SET_ACTIVE_CALCULATOR", calculatorId: id });
        };
        const projected = projectCalculatorToLegacy(state, id);
        const inputFeedbackPulse = inputFeedbackPulseFor(id);
        calculatorRenderer(instanceEl, projected, dispatch, {
          inputBlocked: options.inputBlocked,
          executionGateRejectCount: executionRejectCountFor(id),
          acceptedInputCount: inputFeedbackPulse.acceptedInputCount,
          rejectedInputCount: inputFeedbackPulse.rejectedInputCount,
        });
        activeInstanceRendered = true;
        return;
      }
      const isActive = id === activeCalculatorId;
      instanceEl.hidden = !isActive;
      if (!isActive) {
        return;
      }
      activeInstanceRendered = true;
      const projected = projectCalculatorToLegacy(state, id);
      const inputFeedbackPulse = inputFeedbackPulseFor(id);
      calculatorRenderer(instanceEl, projected, dispatch, {
        inputBlocked: options.inputBlocked,
        executionGateRejectCount: executionRejectCountFor(id),
        acceptedInputCount: inputFeedbackPulse.acceptedInputCount,
        rejectedInputCount: inputFeedbackPulse.rejectedInputCount,
      });
    });
    if (!activeInstanceRendered) {
      const projected = projectCalculatorToLegacy(state, activeCalculatorId);
      const inputFeedbackPulse = inputFeedbackPulseFor(activeCalculatorId);
      calculatorRenderer(root, projected, dispatch, {
        inputBlocked: options.inputBlocked,
        executionGateRejectCount: executionRejectCountFor(activeCalculatorId),
        acceptedInputCount: inputFeedbackPulse.acceptedInputCount,
        rejectedInputCount: inputFeedbackPulse.rejectedInputCount,
      });
    }
  } else if (calculatorDevice) {
    const activeCalculatorId = resolveActiveCalculatorId(state);
    const activeInstance = calculatorDevice.querySelector<HTMLElement>(`[data-calc-instance-id='${activeCalculatorId}']`);
    const allInstances = calculatorDevice.querySelectorAll<HTMLElement>("[data-calc-instance-id]");
    calculatorDevice.dataset.activeCalculatorId = activeCalculatorId;
    if (switchRow) {
      switchRow.hidden = true;
    }
    allInstances.forEach((instanceEl) => {
      instanceEl.hidden = instanceEl !== activeInstance;
      const inputFeedbackPulse = inputFeedbackPulseFor(activeCalculatorId);
      calculatorRenderer(instanceEl, state, dispatch, {
        inputBlocked: options.inputBlocked,
        executionGateRejectCount: executionRejectCountFor(activeCalculatorId),
        acceptedInputCount: inputFeedbackPulse.acceptedInputCount,
        rejectedInputCount: inputFeedbackPulse.rejectedInputCount,
      });
    });
    if (!activeInstance) {
      const inputFeedbackPulse = inputFeedbackPulseFor(activeCalculatorId);
      calculatorRenderer(root, state, dispatch, {
        inputBlocked: options.inputBlocked,
        executionGateRejectCount: executionRejectCountFor(activeCalculatorId),
        acceptedInputCount: inputFeedbackPulse.acceptedInputCount,
        rejectedInputCount: inputFeedbackPulse.rejectedInputCount,
      });
    }
  } else {
    const activeCalculatorId = resolveActiveCalculatorId(state);
    const inputFeedbackPulse = inputFeedbackPulseFor(activeCalculatorId);
    calculatorRenderer(root, state, dispatch, {
      inputBlocked: options.inputBlocked,
      executionGateRejectCount: executionRejectCountFor(activeCalculatorId),
      acceptedInputCount: inputFeedbackPulse.acceptedInputCount,
      rejectedInputCount: inputFeedbackPulse.rejectedInputCount,
    });
  }
  renderStorageV2Module(root, state, dispatch, {
    inputBlocked: options.inputBlocked,
  });
  renderInputV2Module(root, state, dispatch, {
    inputBlocked: options.inputBlocked,
  });
};

