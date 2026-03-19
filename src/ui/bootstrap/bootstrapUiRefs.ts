export type BootstrapUiRefs = {
  debugToggle: HTMLInputElement;
  debugMenu: HTMLElement;
  debugMatrixToggle: HTMLInputElement;
  debugMatrixWindow: HTMLElement;
  debugCalculatorSelect: HTMLSelectElement;
  clearSaveButton: HTMLButtonElement;
  unlockAllButton: HTMLButtonElement;
  keypadWidthInput: HTMLInputElement;
  keypadHeightInput: HTMLInputElement;
  applyKeypadSizeButton: HTMLButtonElement;
  upgradeKeypadRowButton: HTMLButtonElement;
  upgradeKeypadColumnButton: HTMLButtonElement;
  debugMaxPointsInput: HTMLInputElement;
  applyMaxPointsButton: HTMLButtonElement;
  addMaxPointsButton: HTMLButtonElement;
  debugMatrixEditor: HTMLElement;
  applyControlMatrixButton: HTMLButtonElement;
  debugRollStateEl: HTMLElement;
  toggleUiShellLink: HTMLAnchorElement;
  toggleAppModeLink: HTMLAnchorElement;
};

export const resolveBootstrapUiRefs = (doc: Document): BootstrapUiRefs => {
  const debugToggle = doc.querySelector<HTMLInputElement>("[data-debug-toggle]");
  const debugMenu = doc.querySelector<HTMLElement>("[data-debug-menu]");
  const debugMatrixToggle = doc.querySelector<HTMLInputElement>("[data-debug-matrix-toggle]");
  const debugMatrixWindow = doc.querySelector<HTMLElement>("[data-debug-matrix-window]");
  const debugCalculatorSelect = doc.querySelector<HTMLSelectElement>("[data-debug-calculator-select]");
  const clearSaveButton = doc.querySelector<HTMLButtonElement>("[data-debug-clear-save]");
  const unlockAllButton = doc.querySelector<HTMLButtonElement>("[data-debug-unlock-all]");
  const keypadWidthInput = doc.querySelector<HTMLInputElement>("[data-debug-keypad-width]");
  const keypadHeightInput = doc.querySelector<HTMLInputElement>("[data-debug-keypad-height]");
  const applyKeypadSizeButton = doc.querySelector<HTMLButtonElement>("[data-debug-apply-keypad-size]");
  const upgradeKeypadRowButton = doc.querySelector<HTMLButtonElement>("[data-debug-upgrade-keypad-row]");
  const upgradeKeypadColumnButton = doc.querySelector<HTMLButtonElement>("[data-debug-upgrade-keypad-column]");
  const debugMaxPointsInput = doc.querySelector<HTMLInputElement>("[data-debug-max-points]");
  const applyMaxPointsButton = doc.querySelector<HTMLButtonElement>("[data-debug-apply-max-points]");
  const addMaxPointsButton = doc.querySelector<HTMLButtonElement>("[data-debug-add-max-points]");
  const debugMatrixEditor = doc.querySelector<HTMLElement>("[data-debug-control-matrix]");
  const applyControlMatrixButton = doc.querySelector<HTMLButtonElement>("[data-debug-apply-control-matrix]");
  const debugRollStateEl = doc.querySelector<HTMLElement>("[data-debug-roll-state]");
  const toggleUiShellLink = doc.querySelector<HTMLAnchorElement>("[data-debug-toggle-ui-shell]");
  const toggleAppModeLink = doc.querySelector<HTMLAnchorElement>("[data-debug-toggle-app-mode]");

  if (
    !debugToggle ||
    !debugMenu ||
    !debugMatrixToggle ||
    !debugMatrixWindow ||
    !debugCalculatorSelect ||
    !clearSaveButton ||
    !unlockAllButton ||
    !keypadWidthInput ||
    !keypadHeightInput ||
    !applyKeypadSizeButton ||
    !upgradeKeypadRowButton ||
    !upgradeKeypadColumnButton ||
    !debugMaxPointsInput ||
    !applyMaxPointsButton ||
    !addMaxPointsButton ||
    !debugMatrixEditor ||
    !applyControlMatrixButton ||
    !debugRollStateEl ||
    !toggleUiShellLink ||
    !toggleAppModeLink
  ) {
    throw new Error("Required UI controls are missing.");
  }

  return {
    debugToggle,
    debugMenu,
    debugMatrixToggle,
    debugMatrixWindow,
    debugCalculatorSelect,
    clearSaveButton,
    unlockAllButton,
    keypadWidthInput,
    keypadHeightInput,
    applyKeypadSizeButton,
    upgradeKeypadRowButton,
    upgradeKeypadColumnButton,
    debugMaxPointsInput,
    applyMaxPointsButton,
    addMaxPointsButton,
    debugMatrixEditor,
    applyControlMatrixButton,
    debugRollStateEl,
    toggleUiShellLink,
    toggleAppModeLink,
  };
};
