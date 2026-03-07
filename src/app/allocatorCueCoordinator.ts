import { unlockCatalog } from "../content/unlocks.catalog.js";
import type { GameState } from "../domain/types.js";
import { createCueLifecycleCoordinator } from "../ui/layout/cueLifecycle.js";
import { awaitMotionSettled } from "../ui/layout/motionLifecycleBridge.js";

const ALLOCATOR_CUE_SETTLE_TIMEOUT_MS = 1100;

const allocatorIncreaseByUnlockId = new Map(
  unlockCatalog.flatMap((unlock) => {
    if (unlock.effect.type !== "increase_allocator_max_points") {
      return [];
    }
    return [[unlock.id, unlock.effect.amount] as const];
  }),
);

export const getAllocatorIncreaseFromUnlocks = (previous: GameState, next: GameState): number => {
  const previousCompleted = new Set(previous.completedUnlockIds);
  const newlyCompletedUnlockIds = next.completedUnlockIds.filter((id) => !previousCompleted.has(id));
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
