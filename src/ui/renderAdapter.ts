export { buildReadModel } from "../domain/projections.js";
export {
  renderWithShell,
  createMobileShellRenderer,
  disposeShellRenderer,
  resetShellRuntimeForTests,
  canStartTouchRearrange,
  getMenuA11yState,
  shouldCloseMenuFromSwipe,
} from "./shells/mobileShellRenderer.js";
import { createMobileShellRenderer } from "./shells/mobileShellRenderer.js";
import { createDesktopShellRenderer } from "./shells/desktopShellRenderer.js";
export { buildShellViewModel } from "./shellModel.js";
export {
  createShellController,
  resolveSnapFromDrag,
  resolveBottomPanelFromDrag,
  resolveMiddlePanelFromDrag,
  clampSnapToAvailable,
  getAdjacentSnap,
} from "./shellController.js";
export { createTouchRearrangeController } from "./touchRearrangeController.js";
export { renderChecklistV2Module } from "./modules/checklistRenderer.js";
export { renderGrapherV2Module } from "./modules/grapherRenderer.js";
export { renderCalculatorStorageV2Module } from "./modules/calculatorStorageRenderer.js";
export { renderCalculatorV2Module } from "./modules/calculatorRenderer.js";
export { renderStorageV2Module } from "./modules/storageRenderer.js";
export { buildKeyButtonAction, buildLayoutDropDispatchAction, resolveCalculatorKeysLocked } from "./modules/calculatorStorageCore.js";
export { playProgrammaticKeyPressFeedback } from "./modules/programmaticKeyFeedback.js";
export { clearVisualizerHost, resolveActiveVisualizerPanel, renderVisualizerHost } from "./modules/visualizerHost.js";

export type ShellRendererVariant = "mobile" | "desktop";

export const createShellRenderer = (
  root: Element,
  options: { mode: ShellRendererVariant } = { mode: "mobile" },
): ReturnType<typeof createMobileShellRenderer> => {
  if (options.mode === "desktop") {
    return createDesktopShellRenderer(root);
  }
  return createMobileShellRenderer(root);
};
