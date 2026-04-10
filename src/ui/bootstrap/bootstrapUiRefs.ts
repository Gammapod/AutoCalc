export type BootstrapUiRefs = {
  debugToggle: HTMLInputElement;
  debugMenu: HTMLElement;
  debugCalculatorSelect: HTMLSelectElement;
  clearSaveButton: HTMLButtonElement;
  unlockAllButton: HTMLButtonElement;
  keypadWidthInput: HTMLInputElement;
  keypadHeightInput: HTMLInputElement;
  applyKeypadSizeButton: HTMLButtonElement;
  upgradeKeypadRowButton: HTMLButtonElement;
  upgradeKeypadColumnButton: HTMLButtonElement;
  debugControlInputs: Record<"alpha" | "beta" | "gamma" | "delta" | "epsilon", HTMLInputElement>;
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
  const keypadWidthInput = doc.querySelector<HTMLInputElement>("[data-debug-keypad-width]");
  const keypadHeightInput = doc.querySelector<HTMLInputElement>("[data-debug-keypad-height]");
  const applyKeypadSizeButton = doc.querySelector<HTMLButtonElement>("[data-debug-apply-keypad-size]");
  const upgradeKeypadRowButton = doc.querySelector<HTMLButtonElement>("[data-debug-upgrade-keypad-row]");
  const upgradeKeypadColumnButton = doc.querySelector<HTMLButtonElement>("[data-debug-upgrade-keypad-column]");
  const alphaInput = doc.querySelector<HTMLInputElement>("[data-debug-control-alpha]");
  const betaInput = doc.querySelector<HTMLInputElement>("[data-debug-control-beta]");
  const gammaInput = doc.querySelector<HTMLInputElement>("[data-debug-control-gamma]");
  const deltaInput = doc.querySelector<HTMLInputElement>("[data-debug-control-delta]");
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
    !keypadWidthInput ||
    !keypadHeightInput ||
    !applyKeypadSizeButton ||
    !upgradeKeypadRowButton ||
    !upgradeKeypadColumnButton ||
    !alphaInput ||
    !betaInput ||
    !gammaInput ||
    !deltaInput ||
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
    keypadWidthInput,
    keypadHeightInput,
    applyKeypadSizeButton,
    upgradeKeypadRowButton,
    upgradeKeypadColumnButton,
    debugControlInputs: {
      alpha: alphaInput,
      beta: betaInput,
      gamma: gammaInput,
      delta: deltaInput,
      epsilon: epsilonInput,
    },
    applyControlFieldsButton,
    copyCalculatorSnapshotButton,
    debugRollStateEl,
    toggleUiShellLink,
    toggleAppModeLink,
  };
};
