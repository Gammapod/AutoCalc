import type { GameState, UiEffect } from "../domain/types.js";
import { createCueLifecycleCoordinator } from "./workflows/cueLifecycle.js";
import type { MotionSettlementService } from "../contracts/motionSettlement.js";

const UNLOCK_REVEAL_SETTLE_TIMEOUT_MS = 1300;

type CueCoordinator = ReturnType<typeof createCueLifecycleCoordinator>;

type UnlockRevealCoordinatorDeps = {
  cueCoordinator: CueCoordinator;
  motionSettlement: MotionSettlementService;
  playShellCue: (target: "calculator" | "storage") => Promise<void>;
  setInputBlocked: (blocked: boolean) => void;
  redraw: () => void;
  renderAndPersistState: (state: GameState, uiEffects?: UiEffect[]) => void;
  focusStoragePanel: () => void;
};

export const createUnlockRevealCoordinator = ({
  cueCoordinator,
  motionSettlement,
  playShellCue,
  setInputBlocked,
  redraw,
  renderAndPersistState,
  focusStoragePanel,
}: UnlockRevealCoordinatorDeps) => {
  const runUnlockRevealCue = async (stateAtUnlock: GameState, uiEffects: UiEffect[] = []): Promise<void> => {
    await cueCoordinator.run(
      {
        kind: "unlock_reveal",
        target: "storage",
      },
      {
        playShellCue,
        awaitMotionSettled: motionSettlement.awaitMotionSettled,
        setInputBlocked,
        redraw,
        applyStateMutation: () => {
          renderAndPersistState(stateAtUnlock, uiEffects);
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
