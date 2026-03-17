import type { CalculatorLayoutRuntimeState, CalculatorModuleState } from "../modules/calculator/runtime.js";
import type { InputModuleState } from "../modules/input/runtime.js";
import type { StorageModuleState } from "../modules/storage/runtime.js";
import type { GrapherModuleState } from "../modules/grapherRenderer.js";
import type { VisualizerHostModuleState } from "../modules/visualizerHost.js";
import type { ShellRenderer } from "../shellRender.js";

type UiModuleLifecycle = {
  dispose: () => void;
  resetForTests?: () => void;
};

export type UiModuleContext = {
  root: Element;
  dispatch: (action: import("../../domain/types.js").Action) => unknown;
  getState: () => import("../../domain/types.js").GameState;
  options: {
    inputBlocked: boolean;
  };
};

export type CalculatorRuntime = UiModuleLifecycle & {
  moduleState: CalculatorModuleState | null;
  layoutState: CalculatorLayoutRuntimeState | null;
};

export type StorageRuntime = UiModuleLifecycle & {
  moduleState: StorageModuleState | null;
};

export type InputRuntime = UiModuleLifecycle & {
  moduleState: InputModuleState | null;
};

export type VisualizerHostRuntime = UiModuleLifecycle & {
  moduleState: VisualizerHostModuleState | null;
};

export type GrapherRuntime = UiModuleLifecycle & {
  moduleState: GrapherModuleState | null;
};

export type ShellRuntime = UiModuleLifecycle & {
  renderer: ShellRenderer | null;
};

export type UiRootRuntime = {
  calculator: CalculatorRuntime;
  storage: StorageRuntime;
  input: InputRuntime;
  visualizerHost: VisualizerHostRuntime;
  grapher: GrapherRuntime;
  shell: ShellRuntime;
};
