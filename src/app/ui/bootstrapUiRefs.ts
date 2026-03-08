export type BootstrapUiRefs = {
  debugToggle: HTMLInputElement;
  debugMenu: HTMLElement;
  clearSaveButton: HTMLButtonElement;
  unlockAllButton: HTMLButtonElement;
  keypadWidthInput: HTMLInputElement;
  keypadHeightInput: HTMLInputElement;
  applyKeypadSizeButton: HTMLButtonElement;
  upgradeKeypadRowButton: HTMLButtonElement;
  upgradeKeypadColumnButton: HTMLButtonElement;
  debugMaxPointsInput: HTMLInputElement;
  applyMaxPointsButton: HTMLButtonElement;
  debugRollStateEl: HTMLElement;
  toggleUiShellLink: HTMLAnchorElement;
  allocatorResetButton: HTMLButtonElement;
};

export const resolveBootstrapUiRefs = (doc: Document): BootstrapUiRefs => {
  const debugToggle = doc.querySelector<HTMLInputElement>("[data-debug-toggle]");
  const debugMenu = doc.querySelector<HTMLElement>("[data-debug-menu]");
  const clearSaveButton = doc.querySelector<HTMLButtonElement>("[data-debug-clear-save]");
  const unlockAllButton = doc.querySelector<HTMLButtonElement>("[data-debug-unlock-all]");
  const keypadWidthInput = doc.querySelector<HTMLInputElement>("[data-debug-keypad-width]");
  const keypadHeightInput = doc.querySelector<HTMLInputElement>("[data-debug-keypad-height]");
  const applyKeypadSizeButton = doc.querySelector<HTMLButtonElement>("[data-debug-apply-keypad-size]");
  const upgradeKeypadRowButton = doc.querySelector<HTMLButtonElement>("[data-debug-upgrade-keypad-row]");
  const upgradeKeypadColumnButton = doc.querySelector<HTMLButtonElement>("[data-debug-upgrade-keypad-column]");
  const debugMaxPointsInput = doc.querySelector<HTMLInputElement>("[data-debug-max-points]");
  const applyMaxPointsButton = doc.querySelector<HTMLButtonElement>("[data-debug-apply-max-points]");
  const debugRollStateEl = doc.querySelector<HTMLElement>("[data-debug-roll-state]");
  const toggleUiShellLink = doc.querySelector<HTMLAnchorElement>("[data-debug-toggle-ui-shell]");
  const allocatorResetButton = doc.querySelector<HTMLButtonElement>("[data-mode-toggle]");

  if (
    !debugToggle ||
    !debugMenu ||
    !clearSaveButton ||
    !unlockAllButton ||
    !keypadWidthInput ||
    !keypadHeightInput ||
    !applyKeypadSizeButton ||
    !upgradeKeypadRowButton ||
    !upgradeKeypadColumnButton ||
    !debugMaxPointsInput ||
    !applyMaxPointsButton ||
    !debugRollStateEl ||
    !toggleUiShellLink ||
    !allocatorResetButton
  ) {
    throw new Error("Required UI controls are missing.");
  }

  return {
    debugToggle,
    debugMenu,
    clearSaveButton,
    unlockAllButton,
    keypadWidthInput,
    keypadHeightInput,
    applyKeypadSizeButton,
    upgradeKeypadRowButton,
    upgradeKeypadColumnButton,
    debugMaxPointsInput,
    applyMaxPointsButton,
    debugRollStateEl,
    toggleUiShellLink,
    allocatorResetButton,
  };
};
