import type { GameState } from "../domain/types.js";
import { createCueLifecycleCoordinator } from "./workflows/cueLifecycle.js";
import { awaitMotionSettled } from "../ui/layout/motionLifecycleBridge.js";
import { getContentProvider } from "../contracts/contentRegistry.js";

const ALLOCATOR_CUE_SETTLE_TIMEOUT_MS = 1100;

let allocatorIncreaseByUnlockIdCache: Map<string, number> | null = null;
const getAllocatorIncreaseByUnlockId = (): Map<string, number> => {
  if (allocatorIncreaseByUnlockIdCache) {
    return allocatorIncreaseByUnlockIdCache;
  }
  allocatorIncreaseByUnlockIdCache = new Map(
    getContentProvider().unlockCatalog.flatMap((unlock) => {
      if (unlock.effect.type !== "increase_allocator_max_points") {
        return [];
      }
      return [[unlock.id, unlock.effect.amount] as const];
    }),
  );
  return allocatorIncreaseByUnlockIdCache;
};

export const getAllocatorIncreaseFromUnlocks = (previous: GameState, next: GameState): number => {
  const previousCompleted = new Set(previous.completedUnlockIds);
  const newlyCompletedUnlockIds = next.completedUnlockIds.filter((id) => !previousCompleted.has(id));
  const allocatorIncreaseByUnlockId = getAllocatorIncreaseByUnlockId();
  return newlyCompletedUnlockIds.reduce((sum, unlockId) => {
    return sum + (allocatorIncreaseByUnlockId.get(unlockId) ?? 0);
  }, 0);
};

type CueCoordinator = ReturnType<typeof createCueLifecycleCoordinator>;

type AllocatorCueCoordinatorDeps = {
  cueCoordinator: CueCoordinator;
  playShellCue: (target: "calculator" | "storage") => Promise<void>;
  setInputBlocked: (blocked: boolean) => void;
  redraw: () => void;
  focusStoragePanel: () => void;
};

export const createAllocatorCueCoordinator = ({
  cueCoordinator,
  playShellCue,
  setInputBlocked,
  redraw,
  focusStoragePanel,
}: AllocatorCueCoordinatorDeps) => {
  const runAllocatorIncreaseCue = async (): Promise<void> => {
    await cueCoordinator.run(
      {
        kind: "allocator_increase",
        target: "storage",
      },
      {
        playShellCue,
        awaitMotionSettled,
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
