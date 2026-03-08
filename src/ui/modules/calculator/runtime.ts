import { getOrCreateRuntime } from "../../runtime/registry.js";
import type { UiModuleRuntime } from "../../runtime/types.js";

export type CalculatorModuleState = {
  pendingToggleAnimationByFlag: Record<string, "on" | "off">;
  previousUnlockSnapshot: Record<string, boolean> | null;
  keyLabelResizeBound: boolean;
};

const createCalculatorModuleState = (): CalculatorModuleState => ({
  pendingToggleAnimationByFlag: {},
  previousUnlockSnapshot: null,
  keyLabelResizeBound: false,
});

export const getCalculatorModuleRuntime = (root: Element): UiModuleRuntime =>
  getOrCreateRuntime(root).calculator;

export const getCalculatorModuleState = (root: Element): CalculatorModuleState => {
  const runtime = getCalculatorModuleRuntime(root);
  const existing = runtime.state.calculatorModuleState as CalculatorModuleState | undefined;
  if (existing) {
    return existing;
  }
  const created = createCalculatorModuleState();
  runtime.state.calculatorModuleState = created;
  runtime.resetForTests = () => {
    created.pendingToggleAnimationByFlag = {};
    created.previousUnlockSnapshot = null;
    created.keyLabelResizeBound = false;
  };
  return created;
};

export const readToggleAnimation = (root: Element, id: string): "on" | "off" | null =>
  getCalculatorModuleState(root).pendingToggleAnimationByFlag[id] ?? null;

export const queueToggleAnimation = (root: Element, id: string, value: "on" | "off"): void => {
  getCalculatorModuleState(root).pendingToggleAnimationByFlag[id] = value;
};

export const clearToggleAnimations = (root: Element): void => {
  getCalculatorModuleState(root).pendingToggleAnimationByFlag = {};
};

export const disposeCalculatorV2Module = (root: Element): void => {
  const runtime = getCalculatorModuleRuntime(root);
  runtime.dispose();
  runtime.state = {};
};
