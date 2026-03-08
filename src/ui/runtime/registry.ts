import type { UiModuleRuntime, UiRootRuntime } from "./types.js";

const runtimeByRoot = new WeakMap<Element, UiRootRuntime>();
const runtimes = new Set<UiRootRuntime>();

const createModuleRuntime = (): UiModuleRuntime => ({
  state: {},
  dispose: () => {},
  resetForTests: () => {},
});

const createRootRuntime = (): UiRootRuntime => ({
  calculator: createModuleRuntime(),
  storage: createModuleRuntime(),
  input: createModuleRuntime(),
  visualizerHost: createModuleRuntime(),
});

export const getOrCreateRuntime = (root: Element): UiRootRuntime => {
  const existing = runtimeByRoot.get(root);
  if (existing) {
    return existing;
  }
  const created = createRootRuntime();
  runtimeByRoot.set(root, created);
  runtimes.add(created);
  return created;
};

export const disposeRuntime = (root: Element): void => {
  const runtime = runtimeByRoot.get(root);
  if (!runtime) {
    return;
  }
  runtime.calculator.dispose();
  runtime.storage.dispose();
  runtime.input.dispose();
  runtime.visualizerHost.dispose();
  runtimeByRoot.delete(root);
  runtimes.delete(runtime);
};

export const resetAllUiRuntimeForTests = (): void => {
  for (const runtime of runtimes) {
    runtime.calculator.state = {};
    runtime.storage.state = {};
    runtime.input.state = {};
    runtime.visualizerHost.state = {};
    runtime.calculator.resetForTests?.();
    runtime.storage.resetForTests?.();
    runtime.input.resetForTests?.();
    runtime.visualizerHost.resetForTests?.();
  }
};
