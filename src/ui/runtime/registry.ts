import type { UiRootRuntime } from "./types.js";

const runtimeByRoot = new WeakMap<Element, UiRootRuntime>();
const runtimes = new Set<UiRootRuntime>();

const createRootRuntime = (): UiRootRuntime => ({
  calculator: {
    moduleState: null,
    layoutState: null,
    dispose: () => {},
    resetForTests: () => {},
  },
  storage: {
    moduleState: null,
    dispose: () => {},
    resetForTests: () => {},
  },
  input: {
    moduleState: null,
    dispose: () => {},
    resetForTests: () => {},
  },
  visualizerHost: {
    moduleState: null,
    dispose: () => {},
    resetForTests: () => {},
  },
  grapher: {
    moduleState: null,
    dispose: () => {},
    resetForTests: () => {},
  },
  shell: {
    renderer: null,
    dispose: () => {},
    resetForTests: () => {},
  },
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

export const getRuntimeIfExists = (root: Element): UiRootRuntime | undefined =>
  runtimeByRoot.get(root);

export const disposeRuntime = (root: Element): void => {
  const runtime = runtimeByRoot.get(root);
  if (!runtime) {
    return;
  }
  runtime.calculator.dispose();
  runtime.storage.dispose();
  runtime.input.dispose();
  runtime.visualizerHost.dispose();
  runtime.grapher.dispose();
  runtime.shell.dispose();
  runtimeByRoot.delete(root);
  runtimes.delete(runtime);
};

export const resetAllUiRuntimeForTests = (): void => {
  for (const runtime of runtimes) {
    runtime.calculator.moduleState = null;
    runtime.calculator.layoutState = null;
    runtime.storage.moduleState = null;
    runtime.input.moduleState = null;
    runtime.visualizerHost.moduleState = null;
    runtime.grapher.moduleState = null;
    runtime.shell.renderer = null;
    runtime.calculator.resetForTests?.();
    runtime.storage.resetForTests?.();
    runtime.input.resetForTests?.();
    runtime.visualizerHost.resetForTests?.();
    runtime.grapher.resetForTests?.();
    runtime.shell.resetForTests?.();
  }
};

export const forEachUiRootRuntime = (visitor: (runtime: UiRootRuntime) => void): void => {
  for (const runtime of runtimes) {
    visitor(runtime);
  }
};
