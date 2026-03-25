import type { AppShellTarget } from "./appShellTarget.js";

export const signalQuitApplication = (target: AppShellTarget, host: Window = window): void => {
  if (target !== "mobile_web_itch") {
    return;
  }
  try {
    host.parent?.postMessage?.({ type: "autocalc.quit_game" }, "*");
  } catch {
    // best-effort signal for embedded hosts
  }
  try {
    host.close();
  } catch {
    // browser may block close() for non-script-opened contexts
  }
};

