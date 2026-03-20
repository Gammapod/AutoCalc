import type { Action, GameState, UiEffect } from "../../domain/types.js";
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
  const executionRejectCountFor = (calculatorId: "g" | "f"): number =>
    options.uiEffects.filter((effect) => effect.type === "execution_gate_rejected" && effect.calculatorId === calculatorId).length;
  const calculatorDevice = root.querySelector<HTMLElement>("[data-calc-device]");
  const switchRow = calculatorDevice?.querySelector<HTMLElement>("[data-calc-switch-row]");
  const fInstance = calculatorDevice?.querySelector<HTMLElement>("[data-calc-instance-id='f']");
  const gInstance = calculatorDevice?.querySelector<HTMLElement>("[data-calc-instance-id='g']");
  const hasDual = Boolean(state.calculators?.g && state.calculators?.f);
  if (hasDual && calculatorDevice) {
    if (switchRow) {
      switchRow.hidden = false;
    }
    if (fInstance) {
      fInstance.hidden = false;
    }
    if (gInstance) {
      gInstance.hidden = false;
    }
    const activeCalculatorId = resolveActiveCalculatorId(state);
    calculatorDevice.dataset.activeCalculatorId = activeCalculatorId;
    const switchButtons = calculatorDevice.querySelectorAll<HTMLButtonElement>("[data-calc-switch]");
    switchButtons.forEach((button) => {
      const target = button.dataset.calcSwitch;
      button.setAttribute("aria-pressed", target === activeCalculatorId ? "true" : "false");
      button.onclick = () => {
        if (!target || (target !== "f" && target !== "g")) {
          return;
        }
        dispatch({ type: "SET_ACTIVE_CALCULATOR", calculatorId: target });
      };
    });

    const instances = calculatorDevice.querySelectorAll<HTMLElement>("[data-calc-instance-id]");
    instances.forEach((instanceEl) => {
      const id = instanceEl.dataset.calcInstanceId;
      if (id !== "f" && id !== "g") {
        return;
      }
      const projected = projectCalculatorToLegacy(state, id);
      renderCalculatorV2Module(instanceEl, projected, dispatch, {
        inputBlocked: options.inputBlocked,
        executionGateRejectCount: executionRejectCountFor(id),
      });
    });
  } else if (calculatorDevice && fInstance) {
    calculatorDevice.dataset.activeCalculatorId = "f";
    if (switchRow) {
      switchRow.hidden = true;
    }
    fInstance.hidden = false;
    if (gInstance) {
      gInstance.hidden = true;
    }
    renderCalculatorV2Module(fInstance, state, dispatch, {
      inputBlocked: options.inputBlocked,
      executionGateRejectCount: executionRejectCountFor("f"),
    });
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

