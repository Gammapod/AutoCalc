import { getOrCreateRuntime } from "../../runtime/registry.js";
import type { UiModuleRuntime } from "../../runtime/types.js";

export type StorageModuleState = {
  storageGridResizeObserver: ResizeObserver | null;
  observedStorageGrid: HTMLElement | null;
  previousUnlockSnapshot: Record<string, boolean> | null;
};

const createStorageModuleState = (): StorageModuleState => ({
  storageGridResizeObserver: null,
  observedStorageGrid: null,
  previousUnlockSnapshot: null,
});

export const getStorageModuleRuntime = (root: Element): UiModuleRuntime =>
  getOrCreateRuntime(root).storage;

export const getStorageModuleState = (root: Element): StorageModuleState => {
  const runtime = getStorageModuleRuntime(root);
  const existing = runtime.state.storageModuleState as StorageModuleState | undefined;
  if (existing) {
    return existing;
  }
  const created = createStorageModuleState();
  runtime.state.storageModuleState = created;
  runtime.dispose = () => {
    if (created.storageGridResizeObserver && created.observedStorageGrid) {
      created.storageGridResizeObserver.unobserve(created.observedStorageGrid);
    }
    created.storageGridResizeObserver = null;
    created.observedStorageGrid = null;
    created.previousUnlockSnapshot = null;
    runtime.state.storageModuleState = createStorageModuleState();
  };
  runtime.resetForTests = () => {
    if (created.storageGridResizeObserver && created.observedStorageGrid) {
      created.storageGridResizeObserver.unobserve(created.observedStorageGrid);
    }
    created.storageGridResizeObserver = null;
    created.observedStorageGrid = null;
    created.previousUnlockSnapshot = null;
  };
  return created;
};
