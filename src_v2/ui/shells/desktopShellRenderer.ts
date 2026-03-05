import type { Action, GameState } from "../../../src/domain/types.js";
import { clearVisualizerHost, renderVisualizerHost } from "../modules/visualizerHost.js";
import { renderChecklistV2Module } from "../modules/checklistRenderer.js";
import { renderAllocatorV2Module } from "../modules/allocatorRenderer.js";
import { renderCalculatorStorageV2Module } from "../modules/calculatorStorageRenderer.js";
import type { ShellRenderer, ShellRenderOptions } from "../shellRender.js";

const CUE_DURATION_MS = 520;

const findCueTarget = (root: Element, target: "calculator" | "allocator" | "storage"): HTMLElement | null => {
  if (target === "calculator") {
    return root.querySelector<HTMLElement>("[data-calc-device]");
  }
  if (target === "allocator") {
    return root.querySelector<HTMLElement>("[data-allocator-device]");
  }
  return root.querySelector<HTMLElement>(".storage");
};

const applyDesktopA11yMarkers = (root: Element, interactionMode: ShellRenderOptions["interactionMode"]): void => {
  const playArea = root.querySelector<HTMLElement>(".play-area");
  const checklist = root.querySelector<HTMLElement>(".checklist-shell");
  const storage = root.querySelector<HTMLElement>(".storage");
  const calc = root.querySelector<HTMLElement>("[data-calc-device]");
  const allocator = root.querySelector<HTMLElement>("[data-allocator-device]");
  const mode = interactionMode ?? "calculator";

  if (playArea) {
    playArea.setAttribute("data-desktop-shell", "true");
    playArea.setAttribute("data-desktop-mode", mode);
  }
  if (checklist) {
    checklist.setAttribute("aria-label", "Unlock checklist panel");
    checklist.setAttribute("data-desktop-panel", "checklist");
  }
  if (storage) {
    storage.setAttribute("data-desktop-panel", "storage");
  }
  if (calc) {
    calc.setAttribute("data-desktop-panel", "calculator");
  }
  if (allocator) {
    allocator.setAttribute("data-desktop-panel", "allocator");
  }
};

export const createDesktopShellRenderer = (root: Element): ShellRenderer => {
  let latestState: GameState | null = null;
  let latestDispatch: ((action: Action) => unknown) | null = null;
  let latestOptions: ShellRenderOptions = {};

  const render = (
    state: GameState,
    dispatch: (action: Action) => unknown,
    options: ShellRenderOptions = {},
  ): void => {
    latestState = state;
    latestDispatch = dispatch;
    latestOptions = options;
    const interactionMode = options.interactionMode ?? "calculator";
    applyDesktopA11yMarkers(root, interactionMode);
    renderCalculatorStorageV2Module(root, state, dispatch, {
      interactionMode,
      inputBlocked: options.inputBlocked ?? false,
    });
    renderVisualizerHost(root, state);
    renderChecklistV2Module(root, state);
    renderAllocatorV2Module(root, state, dispatch);
  };

  const forceActiveView: ShellRenderer["forceActiveView"] = () => {
    if (!latestState || !latestDispatch) {
      return;
    }
    render(latestState, latestDispatch, latestOptions);
  };

  const playTransitionCue: ShellRenderer["playTransitionCue"] = async (target) => {
    const element = findCueTarget(root, target);
    if (!element) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, CUE_DURATION_MS);
      });
      return;
    }
    element.classList.remove("v2-transition-cue");
    void element.offsetWidth;
    element.classList.add("v2-transition-cue");
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, CUE_DURATION_MS);
    });
    element.classList.remove("v2-transition-cue");
  };

  const dispose = (): void => {
    clearVisualizerHost(root);
    latestState = null;
    latestDispatch = null;
    latestOptions = {};
  };

  const resetForTests = (): void => {
    clearVisualizerHost(root);
  };

  return {
    render,
    forceActiveView,
    playTransitionCue,
    dispose,
    resetForTests,
  };
};
