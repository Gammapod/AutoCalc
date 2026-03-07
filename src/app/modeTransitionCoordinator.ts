import { createCueLifecycleCoordinator } from "../ui/layout/cueLifecycle.js";
import { awaitMotionSettled } from "../ui/layout/motionLifecycleBridge.js";

const MODE_TRANSITION_SETTLE_TIMEOUT_MS = 1000;

type CueCoordinator = ReturnType<typeof createCueLifecycleCoordinator>;

type ModeTransitionCoordinatorDeps = {
  cueCoordinator: CueCoordinator;
  playShellCue: (target: "calculator" | "storage") => Promise<void>;
  setInputBlocked: (blocked: boolean) => void;
  redraw: () => void;
  setMode: (mode: "calculator" | "modify") => void;
  resetForModifyMode: () => void;
  focusModifyMode: () => void;
  focusCalculatorMode: () => void;
};

export const createModeTransitionCoordinator = ({
  cueCoordinator,
  playShellCue,
  setInputBlocked,
  redraw,
  setMode,
  resetForModifyMode,
  focusModifyMode,
  focusCalculatorMode,
}: ModeTransitionCoordinatorDeps) => {
  const isModeTransitionInFlight = (): boolean => cueCoordinator.getState().inFlightCueKind === "mode_transition";

  const runModeTransition = async (targetMode: "calculator" | "modify"): Promise<void> => {
    await cueCoordinator.run(
      {
        kind: "mode_transition",
        target: targetMode === "modify" ? undefined : "calculator",
        nextMode: targetMode,
      },
      {
        playShellCue,
        awaitMotionSettled,
        setInputBlocked,
        redraw,
        applyStateMutation: () => {
          if (targetMode === "modify") {
            resetForModifyMode();
          }
          setMode(targetMode);
        },
        setShellFocusView: () => {
          if (targetMode === "modify") {
            focusModifyMode();
            return;
          }
          focusCalculatorMode();
        },
        phaseTimeoutMs: {
          settle: MODE_TRANSITION_SETTLE_TIMEOUT_MS,
        },
      },
    );
  };

  return {
    isModeTransitionInFlight,
    runModeTransition,
  };
};
