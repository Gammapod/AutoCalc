import { getOrCreateRuntime } from "../../runtime/registry.js";
import type { Action, GameState, Key, LayoutSurface } from "../../../domain/types.js";
import type { InputRuntime } from "../../runtime/types.js";

export type DragTarget = {
  surface: LayoutSurface;
  index: number;
};

export type DropAction = "move" | "swap";

export type DragSession = {
  state: GameState;
  dispatch: (action: Action) => unknown;
  source: DragTarget;
  key: Key;
  originElement: HTMLElement;
  originX: number;
  originY: number;
  ghost: HTMLElement | null;
  active: boolean;
  target: DragTarget | null;
  targetAction: DropAction | null;
  targetElement: HTMLElement | null;
};

export type InputModuleState = {
  dragSession: DragSession | null;
  suppressClicksUntil: number;
  inputAnimationLockCount: number;
  boundDraggableElements: WeakSet<HTMLElement>;
  boundQuickTapButtons: WeakSet<HTMLButtonElement>;
};

const createInputModuleState = (): InputModuleState => ({
  dragSession: null,
  suppressClicksUntil: 0,
  inputAnimationLockCount: 0,
  boundDraggableElements: new WeakSet<HTMLElement>(),
  boundQuickTapButtons: new WeakSet<HTMLButtonElement>(),
});

const FALLBACK_TEST_STATE: InputModuleState = createInputModuleState();

export const getInputModuleRuntime = (root: Element): InputRuntime =>
  getOrCreateRuntime(root).input;

export const getInputModuleState = (root: Element): InputModuleState => {
  const runtime = getInputModuleRuntime(root);
  if (runtime.moduleState) {
    return runtime.moduleState;
  }
  const created = createInputModuleState();
  runtime.moduleState = created;
  runtime.dispose = () => {
    created.dragSession?.ghost?.remove();
    created.dragSession = null;
    created.suppressClicksUntil = 0;
    created.inputAnimationLockCount = 0;
    created.boundDraggableElements = new WeakSet<HTMLElement>();
    created.boundQuickTapButtons = new WeakSet<HTMLButtonElement>();
    runtime.moduleState = createInputModuleState();
  };
  runtime.resetForTests = () => {
    created.dragSession?.ghost?.remove();
    created.dragSession = null;
    created.suppressClicksUntil = 0;
    created.inputAnimationLockCount = 0;
  };
  return created;
};

export const getFallbackInputTestState = (): InputModuleState => FALLBACK_TEST_STATE;

