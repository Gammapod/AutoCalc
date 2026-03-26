import type { GameState } from "../../../domain/types.js";
import { APP_VERSION } from "../../../generated/appVersion.js";

const resolveAppVersion = (): string => {
  if (typeof document === "undefined") {
    return `v${APP_VERSION}`;
  }
  const versionToken = document.body.dataset.appVersion?.trim();
  if (!versionToken) {
    return `v${APP_VERSION}`;
  }
  return versionToken.startsWith("v") ? versionToken : `v${versionToken}`;
};

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
    panel.textContent = `${resolveAppVersion()} AutoCalc`;
    return;
  }

  const version = document.createElement("div");
  version.className = "v2-title-version";
  version.textContent = resolveAppVersion();

  const title = document.createElement("div");
  title.className = "v2-title-brand";
  title.textContent = "AutoCalc";

  panel.append(version, title);
};
