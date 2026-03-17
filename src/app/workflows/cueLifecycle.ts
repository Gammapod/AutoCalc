import { emitCueTelemetry } from "./cueTelemetry.js";

export type CueKind = "unlock_reveal" | "allocator_increase";

export type CuePhase = "start" | "cue_visible" | "state_apply" | "settle" | "done" | "cancelled";

export type CueLifecycleRequest = {
  kind: CueKind;
  target?: "calculator" | "storage";
};

export type CueLifecycleHooks = {
  onPhase?: (phase: CuePhase) => void;
};

export type CueLifecycleDeps = {
  playShellCue: (target: "calculator" | "storage") => Promise<void>;
  awaitMotionSettled: (tokenOrChannel?: string) => Promise<void>;
  setInputBlocked: (blocked: boolean) => void;
  redraw: () => void;
  applyStateMutation?: () => void;
  setShellFocusView?: () => void;
  phaseTimeoutMs?: Partial<Record<Exclude<CuePhase, "done" | "cancelled">, number>>;
};

const DEFAULT_PHASE_TIMEOUT_MS: Record<Exclude<CuePhase, "done" | "cancelled">, number> = {
  start: 300,
  cue_visible: 900,
  state_apply: 700,
  settle: 1400,
};

const withTimeout = async (promise: Promise<void>, timeoutMs: number): Promise<void> => {
  if (timeoutMs <= 0) {
    await promise;
    return;
  }
  await Promise.race([
    promise,
    new Promise<void>((resolve) => {
      globalThis.setTimeout(resolve, timeoutMs);
    }),
  ]);
};

export const runCueLifecycle = async (
  request: CueLifecycleRequest,
  deps: CueLifecycleDeps,
  hooks: CueLifecycleHooks = {},
): Promise<void> => {
  const phaseTimeoutMs = {
    ...DEFAULT_PHASE_TIMEOUT_MS,
    ...(deps.phaseTimeoutMs ?? {}),
  };
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  const emit = (phase: CuePhase): void => {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const durationMs = phase === "done" || phase === "cancelled" ? Math.max(0, now - startedAt) : undefined;
    emitCueTelemetry({
      cueKind: request.kind,
      phase,
      atMs: now,
      ...(durationMs !== undefined ? { durationMs } : {}),
      metadata: {
        ...(request.target ? { target: request.target } : {}),
      },
    });
    hooks.onPhase?.(phase);
  };

  emit("start");
  deps.setInputBlocked(true);
  deps.redraw();

  try {
    if (request.target) {
      await withTimeout(deps.playShellCue(request.target), phaseTimeoutMs.start);
    }

    emit("cue_visible");

    emit("state_apply");
    deps.applyStateMutation?.();
    deps.redraw();

    emit("settle");
    deps.setShellFocusView?.();
    deps.redraw();
    await withTimeout(deps.awaitMotionSettled("layout"), phaseTimeoutMs.settle);
  } finally {
    deps.setInputBlocked(false);
    deps.redraw();
  }

  emit("done");
};

export type CueLifecycleCoordinator = {
  run: (request: CueLifecycleRequest, deps: CueLifecycleDeps, hooks?: CueLifecycleHooks) => Promise<boolean>;
  getState: () => { inFlightCueKind: CueKind | null };
};

export const createCueLifecycleCoordinator = (): CueLifecycleCoordinator => {
  let inFlightCueKind: CueKind | null = null;
  let queue: Promise<boolean> = Promise.resolve(true);

  const run: CueLifecycleCoordinator["run"] = async (request, deps, hooks = {}) => {
    queue = queue.then(async () => {
      inFlightCueKind = request.kind;
      try {
        await runCueLifecycle(request, deps, hooks);
        return true;
      } finally {
        inFlightCueKind = null;
      }
    }).catch((error) => {
      console.error("Cue lifecycle failed", error);
      inFlightCueKind = null;
      return false;
    });

    return queue;
  };

  return {
    run,
    getState: () => ({
      inFlightCueKind,
    }),
  };
};
