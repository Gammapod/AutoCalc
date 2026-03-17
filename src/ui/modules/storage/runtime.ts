import { getOrCreateRuntime } from "../../runtime/registry.js";
import type { StorageRuntime } from "../../runtime/types.js";

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

export const getStorageModuleRuntime = (root: Element): StorageRuntime =>
  getOrCreateRuntime(root).storage;

export const getStorageModuleState = (root: Element): StorageModuleState => {
  const runtime = getStorageModuleRuntime(root);
  if (runtime.moduleState) {
    return runtime.moduleState;
  }
  const created = createStorageModuleState();
  runtime.moduleState = created;
  runtime.dispose = () => {
    if (created.storageGridResizeObserver && created.observedStorageGrid) {
      created.storageGridResizeObserver.unobserve(created.observedStorageGrid);
    }
    created.storageGridResizeObserver = null;
    created.observedStorageGrid = null;
    created.previousUnlockSnapshot = null;
    runtime.moduleState = createStorageModuleState();
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
