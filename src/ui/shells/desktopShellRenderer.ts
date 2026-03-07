import type { Action, GameState } from "../../domain/types.js";
import { clearVisualizerHost, renderVisualizerHost } from "../modules/visualizerHost.js";
import { renderChecklistV2Module } from "../modules/checklistRenderer.js";
import { renderCalculatorStorageV2Module } from "../modules/calculatorStorageRenderer.js";
import type { ShellRenderer, ShellRenderOptions } from "../shellRender.js";
import { awaitMotionSettled, beginMotionCycle, completeMotionCycle } from "../layout/motionLifecycleBridge.js";

const CUE_DURATION_MS = 520;

const findCueTarget = (root: Element, target: "calculator" | "storage"): HTMLElement | null => {
  if (target === "calculator") {
    return root.querySelector<HTMLElement>("[data-calc-device]");
  }
  return root.querySelector<HTMLElement>(".storage");
};

const applyDesktopA11yMarkers = (root: Element, interactionMode: ShellRenderOptions["interactionMode"]): void => {
  const playArea = root.querySelector<HTMLElement>(".play-area");
  const checklist = root.querySelector<HTMLElement>(".checklist-shell");
  const storage = root.querySelector<HTMLElement>(".storage");
  const calc = root.querySelector<HTMLElement>("[data-calc-device]");
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
};

const playElementCueAnimation = async (
  element: HTMLElement | null,
  channel: string,
  fallbackMs: number,
): Promise<void> => {
  const token = beginMotionCycle(channel, fallbackMs);
  if (!element) {
    await awaitMotionSettled(token);
    return;
  }

  let completed = false;
  const complete = (): void => {
    if (completed) {
      return;
    }
    completed = true;
    completeMotionCycle(token);
  };
  const controller = new AbortController();

  const finish = (): void => {
    controller.abort();
    complete();
  };

  element.classList.remove("v2-transition-cue");
  void element.offsetWidth;
  element.classList.add("v2-transition-cue");
  element.addEventListener("animationend", finish, { signal: controller.signal });
  element.addEventListener("animationcancel", finish, { signal: controller.signal });

  await awaitMotionSettled(token);
  controller.abort();
  element.classList.remove("v2-transition-cue");
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
  };

  const forceActiveView: ShellRenderer["forceActiveView"] = () => {
    if (!latestState || !latestDispatch) {
      return;
    }
    render(latestState, latestDispatch, latestOptions);
  };

  const playTransitionCue: ShellRenderer["playTransitionCue"] = async (target) => {
    await playElementCueAnimation(findCueTarget(root, target), `shell-cue:${target}`, CUE_DURATION_MS + 60);
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
