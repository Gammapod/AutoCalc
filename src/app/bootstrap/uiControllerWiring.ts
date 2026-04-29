import { createBootstrapUiController } from "../../ui/bootstrap/bootstrapUiController.js";
import { createResetRunHandler } from "./subscriptionCoordinator.js";
import { createSandboxState } from "../../domain/sandboxPreset.js";
import type { AppMode } from "../../contracts/appMode.js";
import type { AppServices } from "../../contracts/appServices.js";
import type { BootstrapUiRefs } from "../../ui/bootstrap/bootstrapUiRefs.js";
import type { Store } from "../../domain/types.js";

type StorageRepo = {
  clear: () => void;
};

type CreateModeUiControllerOptions = {
  services: AppServices;
  refs: BootstrapUiRefs;
  uiShellMode: "mobile" | "desktop";
  appMode: AppMode;
  location: Location;
  document: Document;
  store: Store;
  storageRepo: StorageRepo;
};

export const createModeUiController = ({
  services,
  refs,
  uiShellMode,
  appMode,
  location,
  document,
  store,
  storageRepo,
}: CreateModeUiControllerOptions): ReturnType<typeof createBootstrapUiController> =>
  createBootstrapUiController({
    services,
    refs,
    uiShellMode,
    appMode,
    location,
    document,
    getState: () => store.getState(),
    onResetRun: appMode === "sandbox"
      ? () => {
        store.dispatch({ type: "HYDRATE_SAVE", state: createSandboxState() });
      }
      : createResetRunHandler(store, storageRepo),
    onUnlockAll: () => {
      store.dispatch({ type: "UNLOCK_ALL" });
    },
    onToggleFlag: (flag) => {
      store.dispatch({ type: "TOGGLE_FLAG", flag });
    },
    onSetControlField: (calculatorId, field, value) => {
      store.dispatch({ type: "SET_CONTROL_FIELD", calculatorId, field, value });
    },
    onSetActiveCalculator: (calculatorId) => {
      store.dispatch({ type: "SET_ACTIVE_CALCULATOR", calculatorId });
    },
    onNavigateToUiShell: (url) => {
      location.assign(url);
    },
    onNavigateToAppMode: (url) => {
      location.assign(url);
    },
  });
