import type { GameState } from "../../../domain/types.js";
import { resolveAppVersionFromDocument } from "../../shared/appVersion.js";

export const clearTitleVisualizerPanel = (root: Element): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-title-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "true");
};

export const renderTitleVisualizerPanel = (root: Element, _state: GameState): void => {
  const panel = root.querySelector<HTMLElement>("[data-v2-title-panel]");
  if (!panel) {
    return;
  }
  panel.innerHTML = "";
  panel.setAttribute("aria-hidden", "false");

  if (typeof document === "undefined") {
    panel.textContent = `${resolveAppVersionFromDocument()} AutoCalc`;
    return;
  }

  const version = document.createElement("div");
  version.className = "v2-title-version";
  version.textContent = resolveAppVersionFromDocument();

  const title = document.createElement("div");
  title.className = "v2-title-brand";
  title.textContent = "AutoCalc";

  panel.append(version, title);
};
