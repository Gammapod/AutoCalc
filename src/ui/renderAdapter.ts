export { buildReadModel } from "../domain/projections.js";
export {
  renderWithShell,
  createShellRenderer as createMobileShellRenderer,
  disposeShellRenderer,
  resetShellRuntimeForTests,
  canStartTouchRearrange,
  getMenuA11yState,
  shouldCloseMenuFromSwipe,
} from "./shellRender.js";
import { createShellRenderer as createMobileShellRenderer } from "./shellRender.js";
import { createDesktopShellRenderer } from "./shells/desktopShellRenderer.js";
import type { AppServices } from "../contracts/appServices.js";
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
export { renderGrapherV2Module } from "./modules/grapherRenderer.js";
export { renderCalculatorStorageV2Module } from "./modules/calculatorStorageRenderer.js";
export { renderCalculatorV2Module } from "./modules/calculator/render.js";
export { renderStorageV2Module } from "./modules/storage/render.js";
export { renderInputV2Module } from "./modules/input/render.js";
export { buildKeyButtonAction, buildLayoutDropDispatchAction, resolveCalculatorKeysLocked } from "./modules/calculatorStorageCore.js";
export { playProgrammaticKeyPressFeedback } from "./modules/input/pressFeedback.js";
export { clearVisualizerHost, resolveActiveVisualizerPanel, renderVisualizerHost } from "./modules/visualizerHost.js";
export { getOrCreateRuntime, disposeRuntime, resetAllUiRuntimeForTests } from "./runtime/registry.js";

export type ShellRendererVariant = "mobile" | "desktop";

export const createShellRenderer = (
  root: Element,
  options: { mode: ShellRendererVariant; services?: AppServices } = { mode: "mobile" },
): ReturnType<typeof createMobileShellRenderer> => {
  if (options.mode === "desktop") {
    return createDesktopShellRenderer(root, { services: options.services });
  }
  return createMobileShellRenderer(root, { services: options.services });
};
