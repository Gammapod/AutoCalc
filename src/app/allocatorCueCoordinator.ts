import type { GameState } from "../domain/types.js";
import { createCueLifecycleCoordinator } from "./workflows/cueLifecycle.js";
import { getAppServices, type AppServices } from "../contracts/appServices.js";
import type { MotionSettlementService } from "../contracts/motionSettlement.js";

const ALLOCATOR_CUE_SETTLE_TIMEOUT_MS = 1100;

const allocatorIncreaseByUnlockIdCache = new WeakMap<AppServices, Map<string, number>>();
const getAllocatorIncreaseByUnlockId = (services: AppServices): Map<string, number> => {
  const cached = allocatorIncreaseByUnlockIdCache.get(services);
  if (cached) {
    return cached;
  }
  const built = new Map(
    services.contentProvider.unlockCatalog.flatMap((unlock) => {
      if (unlock.effect.type === "increase_allocator_max_points") {
        return [[unlock.id, unlock.effect.amount] as const];
      }
      if (unlock.effect.type === "increase_allocator_max_points_for_calculator") {
        return [[unlock.id, unlock.effect.amount] as const];
      }
      return [];
    }),
  );
  allocatorIncreaseByUnlockIdCache.set(services, built);
  return built;
};

export const getAllocatorIncreaseFromUnlocks = (previous: GameState, next: GameState, services: AppServices): number => {
  const previousCompleted = new Set(previous.completedUnlockIds);
  const newlyCompletedUnlockIds = next.completedUnlockIds.filter((id) => !previousCompleted.has(id));
  const allocatorIncreaseByUnlockId = getAllocatorIncreaseByUnlockId(services);
  return newlyCompletedUnlockIds.reduce((sum, unlockId) => {
    return sum + (allocatorIncreaseByUnlockId.get(unlockId) ?? 0);
  }, 0);
};

type CueCoordinator = ReturnType<typeof createCueLifecycleCoordinator>;

type AllocatorCueCoordinatorDeps = {
  services?: AppServices;
  cueCoordinator: CueCoordinator;
  motionSettlement: MotionSettlementService;
  playShellCue: (target: "calculator" | "storage") => Promise<void>;
  setInputBlocked: (blocked: boolean) => void;
  redraw: () => void;
  focusStoragePanel: () => void;
};

export const createAllocatorCueCoordinator = ({
  services = getAppServices(),
  cueCoordinator,
  motionSettlement,
  playShellCue,
  setInputBlocked,
  redraw,
  focusStoragePanel,
}: AllocatorCueCoordinatorDeps) => {
  getAllocatorIncreaseByUnlockId(services);
  const runAllocatorIncreaseCue = async (): Promise<void> => {
    await cueCoordinator.run(
      {
        kind: "allocator_increase",
        target: "storage",
      },
      {
        playShellCue,
        awaitMotionSettled: motionSettlement.awaitMotionSettled,
        setInputBlocked,
        redraw,
        setShellFocusView: () => {
          focusStoragePanel();
        },
        phaseTimeoutMs: {
          settle: ALLOCATOR_CUE_SETTLE_TIMEOUT_MS,
        },
      },
    );
  };

  return {
    runAllocatorIncreaseCue,
  };
};
