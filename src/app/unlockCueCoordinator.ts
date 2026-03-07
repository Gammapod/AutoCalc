import type { GameState, Key } from "../domain/types.js";
import { createCueLifecycleCoordinator } from "../ui/layout/cueLifecycle.js";
import { awaitMotionSettled } from "../ui/layout/motionLifecycleBridge.js";

const UNLOCK_REVEAL_SETTLE_TIMEOUT_MS = 1300;

const collectUnlockedKeys = (state: GameState): Set<Key> => {
  const unlocked = new Set<Key>();
  for (const [key, isUnlocked] of Object.entries(state.unlocks.valueAtoms)) {
    if (isUnlocked) {
      unlocked.add(key as Key);
    }
  }
  for (const [key, isUnlocked] of Object.entries(state.unlocks.valueCompose)) {
    if (isUnlocked) {
      unlocked.add(key as Key);
    }
  }
  for (const [key, isUnlocked] of Object.entries(state.unlocks.valueExpression)) {
    if (isUnlocked) {
      unlocked.add(key as Key);
    }
  }
  for (const [key, isUnlocked] of Object.entries(state.unlocks.slotOperators)) {
    if (isUnlocked) {
      unlocked.add(key as Key);
    }
  }
  for (const [key, isUnlocked] of Object.entries(state.unlocks.utilities)) {
    if (isUnlocked) {
      unlocked.add(key as Key);
    }
  }
  for (const [key, isUnlocked] of Object.entries(state.unlocks.memory)) {
    if (isUnlocked) {
      unlocked.add(key as Key);
    }
  }
  for (const [key, isUnlocked] of Object.entries(state.unlocks.steps)) {
    if (isUnlocked) {
      unlocked.add(key as Key);
    }
  }
  for (const [key, isUnlocked] of Object.entries(state.unlocks.visualizers)) {
    if (isUnlocked) {
      unlocked.add(key as Key);
    }
  }
  for (const [key, isUnlocked] of Object.entries(state.unlocks.execution)) {
    if (isUnlocked) {
      unlocked.add(key as Key);
    }
  }
  return unlocked;
};

export const createUnlockTracker = (state: GameState) => {
  let knownUnlockedKeys = collectUnlockedKeys(state);

  return {
    hasNewUnlock: (nextState: GameState): boolean => {
      const currentUnlockedKeys = collectUnlockedKeys(nextState);
      const hasNewUnlock = [...currentUnlockedKeys].some((key) => !knownUnlockedKeys.has(key));
      knownUnlockedKeys = currentUnlockedKeys;
      return hasNewUnlock;
    },
  };
};

type CueCoordinator = ReturnType<typeof createCueLifecycleCoordinator>;

type UnlockRevealCoordinatorDeps = {
  cueCoordinator: CueCoordinator;
  playShellCue: (target: "calculator" | "storage") => Promise<void>;
  setInputBlocked: (blocked: boolean) => void;
  redraw: () => void;
  renderAndPersistState: (state: GameState) => void;
  focusStoragePanel: () => void;
};

export const createUnlockRevealCoordinator = ({
  cueCoordinator,
  playShellCue,
  setInputBlocked,
  redraw,
  renderAndPersistState,
  focusStoragePanel,
}: UnlockRevealCoordinatorDeps) => {
  const runUnlockRevealCue = async (stateAtUnlock: GameState): Promise<void> => {
    await cueCoordinator.run(
      {
        kind: "unlock_reveal",
        target: "storage",
      },
      {
        playShellCue,
        awaitMotionSettled,
        setInputBlocked,
        redraw,
        applyStateMutation: () => {
          renderAndPersistState(stateAtUnlock);
        },
        setShellFocusView: () => {
          focusStoragePanel();
        },
        phaseTimeoutMs: {
          settle: UNLOCK_REVEAL_SETTLE_TIMEOUT_MS,
        },
      },
    );
  };

  return {
    runUnlockRevealCue,
  };
};
