import type { Action, GameState } from "../../domain/types.js";
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
  },
): void => {
  const calculatorDevice = root.querySelector<HTMLElement>("[data-calc-device]");
  const hasDual = Boolean(state.calculators?.g && state.calculators?.f);
  if (hasDual && calculatorDevice) {
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
      });
    });
  } else {
    renderCalculatorV2Module(root, state, dispatch, {
      inputBlocked: options.inputBlocked,
    });
  }
  renderStorageV2Module(root, state, dispatch, {
    inputBlocked: options.inputBlocked,
  });
  renderInputV2Module(root, state, dispatch, {
    inputBlocked: options.inputBlocked,
  });
};

