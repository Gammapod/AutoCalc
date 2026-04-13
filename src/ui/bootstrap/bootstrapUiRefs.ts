import type { ControlField } from "../../domain/types.js";

export type BootstrapUiRefs = {
  debugToggle: HTMLInputElement;
  debugMenu: HTMLElement;
  debugCalculatorSelect: HTMLSelectElement;
  clearSaveButton: HTMLButtonElement;
  unlockAllButton: HTMLButtonElement;
  debugControlInputs: Record<ControlField, HTMLInputElement>;
  applyControlFieldsButton: HTMLButtonElement;
  copyCalculatorSnapshotButton: HTMLButtonElement;
  debugRollStateEl: HTMLElement;
  toggleUiShellLink: HTMLAnchorElement;
  toggleAppModeLink: HTMLAnchorElement;
};

export const resolveBootstrapUiRefs = (doc: Document): BootstrapUiRefs => {
  const debugToggle = doc.querySelector<HTMLInputElement>("[data-debug-toggle]");
  const debugMenu = doc.querySelector<HTMLElement>("[data-debug-menu]");
  const debugCalculatorSelect = doc.querySelector<HTMLSelectElement>("[data-debug-calculator-select]");
  const clearSaveButton = doc.querySelector<HTMLButtonElement>("[data-debug-clear-save]");
  const unlockAllButton = doc.querySelector<HTMLButtonElement>("[data-debug-unlock-all]");
  const alphaInput = doc.querySelector<HTMLInputElement>("[data-debug-control-alpha]");
  const betaInput = doc.querySelector<HTMLInputElement>("[data-debug-control-beta]");
  const gammaInput = doc.querySelector<HTMLInputElement>("[data-debug-control-gamma]");
  const deltaInput = doc.querySelector<HTMLInputElement>("[data-debug-control-delta]");
  const deltaQInput = doc.querySelector<HTMLInputElement>("[data-debug-control-delta-q]");
  const epsilonInput = doc.querySelector<HTMLInputElement>("[data-debug-control-epsilon]");
  const applyControlFieldsButton = doc.querySelector<HTMLButtonElement>("[data-debug-apply-control-fields]");
  const copyCalculatorSnapshotButton = doc.querySelector<HTMLButtonElement>("[data-debug-copy-calculator-snapshot]");
  const debugRollStateEl = doc.querySelector<HTMLElement>("[data-debug-roll-state]");
  const toggleUiShellLink = doc.querySelector<HTMLAnchorElement>("[data-debug-toggle-ui-shell]");
  const toggleAppModeLink = doc.querySelector<HTMLAnchorElement>("[data-debug-toggle-app-mode]");

  if (
    !debugToggle ||
    !debugMenu ||
    !debugCalculatorSelect ||
    !clearSaveButton ||
    !unlockAllButton ||
    !alphaInput ||
    !betaInput ||
    !gammaInput ||
    !deltaInput ||
    !deltaQInput ||
    !epsilonInput ||
    !applyControlFieldsButton ||
    !copyCalculatorSnapshotButton ||
    !debugRollStateEl ||
    !toggleUiShellLink ||
    !toggleAppModeLink
  ) {
    throw new Error("Required UI controls are missing.");
  }

  return {
    debugToggle,
    debugMenu,
    debugCalculatorSelect,
    clearSaveButton,
    unlockAllButton,
    debugControlInputs: {
      alpha: alphaInput,
      beta: betaInput,
      gamma: gammaInput,
      delta: deltaInput,
      delta_q: deltaQInput,
      epsilon: epsilonInput,
    },
    applyControlFieldsButton,
    copyCalculatorSnapshotButton,
    debugRollStateEl,
    toggleUiShellLink,
    toggleAppModeLink,
  };
};
