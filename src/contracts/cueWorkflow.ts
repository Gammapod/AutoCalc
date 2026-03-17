export type CueKind = "allocator_increase" | "unlock_reveal";
export type CueTarget = "storage" | "calculator";
export type CuePhase = "start" | "cue_visible" | "state_apply" | "settle" | "done";

export type CueLifecycleRequest = {
  kind: CueKind;
  target: CueTarget;
};

export type CueLifecycleDeps = {
  playShellCue: (target: CueTarget) => Promise<void>;
  awaitMotionSettled: (tokenOrChannel?: string) => Promise<void>;
  setInputBlocked: (blocked: boolean) => void;
  redraw: () => void;
  applyStateMutation: () => void;
  setShellFocusView?: (target: CueTarget) => void;
  phaseTimeoutMs?: Partial<Record<Exclude<CuePhase, "done">, number>>;
};

export type CueLifecycleHooks = {
  onPhase?: (phase: CuePhase) => void;
};

export type CueWorkflow = {
  run: (request: CueLifecycleRequest, deps: CueLifecycleDeps, hooks?: CueLifecycleHooks) => Promise<boolean>;
  getState: () => { inFlightCueKind: CueKind | null };
};
