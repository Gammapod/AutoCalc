import type { Action, CalculatorId, GameState, UiEffect } from "../../domain/types.js";
import { renderCalculatorV2Module } from "./calculator/render.js";
import { renderStorageV2Module } from "./storage/render.js";
import { renderInputV2Module } from "./input/render.js";
import { projectCalculatorToLegacy, resolveActiveCalculatorId } from "../../domain/multiCalculator.js";

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
  const calculatorDevice = root.querySelector<HTMLElement>("[data-calc-device]");
  const switchRow = calculatorDevice?.querySelector<HTMLElement>("[data-calc-switch-row]");
  const calculatorOrder = state.calculatorOrder ?? ["f"];
  const hasMultiple = calculatorOrder.length > 1;
  const hasInstanceNodes = Boolean(calculatorDevice?.querySelector("[data-calc-instance-id]"));
  if (hasMultiple && calculatorDevice && hasInstanceNodes) {
    if (switchRow) {
      switchRow.hidden = false;
    }
    const activeCalculatorId = resolveActiveCalculatorId(state);
    calculatorDevice.dataset.activeCalculatorId = activeCalculatorId;
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

    const instances = calculatorDevice.querySelectorAll<HTMLElement>("[data-calc-instance-id]");
    instances.forEach((instanceEl) => {
      const id = instanceEl.dataset.calcInstanceId as CalculatorId | undefined;
      if (!id || !calculatorOrder.includes(id)) {
        instanceEl.hidden = true;
        return;
      }
      instanceEl.hidden = false;
      const projected = projectCalculatorToLegacy(state, id);
      renderCalculatorV2Module(instanceEl, projected, dispatch, {
        inputBlocked: options.inputBlocked,
        executionGateRejectCount: executionRejectCountFor(id),
      });
    });
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
      renderCalculatorV2Module(instanceEl, state, dispatch, {
        inputBlocked: options.inputBlocked,
        executionGateRejectCount: executionRejectCountFor(activeCalculatorId),
      });
    });
    if (!activeInstance) {
      renderCalculatorV2Module(root, state, dispatch, {
        inputBlocked: options.inputBlocked,
        executionGateRejectCount: executionRejectCountFor(activeCalculatorId),
      });
    }
  } else {
    renderCalculatorV2Module(root, state, dispatch, {
      inputBlocked: options.inputBlocked,
      executionGateRejectCount: executionRejectCountFor(resolveActiveCalculatorId(state)),
    });
  }
  renderStorageV2Module(root, state, dispatch, {
    inputBlocked: options.inputBlocked,
  });
  renderInputV2Module(root, state, dispatch, {
    inputBlocked: options.inputBlocked,
  });
};

