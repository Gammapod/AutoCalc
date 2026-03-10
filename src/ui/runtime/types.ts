import type { Action, GameState } from "../../domain/types.js";

export type UiModuleContext = {
  root: Element;
  dispatch: (action: Action) => unknown;
  getState: () => GameState;
  options: {
    inputBlocked: boolean;
  };
};

export type UiModuleRuntime = {
  state: Record<string, unknown>;
  dispose: () => void;
  resetForTests?: () => void;
};

export type CalculatorRuntime = UiModuleRuntime;
export type StorageRuntime = UiModuleRuntime;
export type InputRuntime = UiModuleRuntime;
export type VisualizerHostRuntime = UiModuleRuntime;
export type GrapherRuntime = UiModuleRuntime;
export type ShellRuntime = UiModuleRuntime;

export type UiRootRuntime = {
  calculator: CalculatorRuntime;
  storage: StorageRuntime;
  input: InputRuntime;
  visualizerHost: VisualizerHostRuntime;
  grapher: GrapherRuntime;
  shell: ShellRuntime;
};
